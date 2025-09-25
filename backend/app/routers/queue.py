from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List
from datetime import datetime, date

from app.core import get_db, get_current_active_user
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service_center import ServiceCenter
from app.schemas.appointment import QueueStatusResponse, MyQueueResponse

router = APIRouter()

@router.get("/status/{service_center_id}", response_model=QueueStatusResponse)
async def get_queue_status(
    service_center_id: int,
    db: Session = Depends(get_db)
):
    """Get current queue status for a service center"""
    
    # Verify service center exists
    service_center = db.query(ServiceCenter).filter(
        ServiceCenter.id == service_center_id
    ).first()
    
    if not service_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service center not found"
        )
    
    # Get current queue count
    total_in_queue = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            func.date(Appointment.appointment_date) == date.today(),
            Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress])
        )
    ).scalar()
    
    # Get currently serving appointment
    current_serving = db.query(Appointment).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            func.date(Appointment.appointment_date) == date.today(),
            Appointment.status == AppointmentStatus.in_progress
        )
    ).first()
    
    # Calculate estimated wait time
    average_service_time = service_center.average_service_time
    estimated_wait_time = total_in_queue * average_service_time
    
    return QueueStatusResponse(
        service_center_id=service_center_id,
        service_center_name=service_center.name,
        total_in_queue=total_in_queue,
        current_serving=current_serving.ticket_number if current_serving else None,
        average_wait_time=average_service_time,
        estimated_wait_time=estimated_wait_time,
        last_updated=datetime.utcnow()
    )

@router.get("/my-queue", response_model=List[MyQueueResponse])
async def get_my_queue_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's queue status for active appointments"""
    
    # Get user's active appointments for today
    active_appointments = db.query(Appointment).filter(
        and_(
            Appointment.user_id == current_user.id,
            func.date(Appointment.appointment_date) == date.today(),
            Appointment.status.in_([
                AppointmentStatus.scheduled,
                AppointmentStatus.confirmed,
                AppointmentStatus.in_progress
            ])
        )
    ).all()
    
    queue_responses = []
    
    for appointment in active_appointments:
        # Calculate people ahead in queue
        people_ahead = 0
        if appointment.status == AppointmentStatus.confirmed:
            people_ahead = db.query(func.count(Appointment.id)).filter(
                and_(
                    Appointment.service_center_id == appointment.service_center_id,
                    func.date(Appointment.appointment_date) == date.today(),
                    Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress]),
                    Appointment.queue_position < appointment.queue_position
                )
            ).scalar()
        
        # Get currently serving
        current_serving = db.query(Appointment).filter(
            and_(
                Appointment.service_center_id == appointment.service_center_id,
                func.date(Appointment.appointment_date) == date.today(),
                Appointment.status == AppointmentStatus.in_progress
            )
        ).first()
        
        # Calculate estimated wait time
        service_center = appointment.service_center
        estimated_wait_time = people_ahead * service_center.average_service_time
        
        # Determine if can check in
        can_check_in = (
            appointment.status == AppointmentStatus.scheduled and
            (appointment.appointment_date.date() if isinstance(appointment.appointment_date, datetime) else appointment.appointment_date) == date.today()
        )
        
        # Generate status message
        if appointment.status == AppointmentStatus.scheduled:
            status_message = "Ready to check in"
        elif appointment.status == AppointmentStatus.confirmed:
            if people_ahead == 0:
                status_message = "You're next!"
            else:
                status_message = f"{people_ahead} people ahead of you"
        elif appointment.status == AppointmentStatus.in_progress:
            status_message = "Currently being served"
        else:
            status_message = f"Status: {appointment.status.value}"
        
        queue_responses.append(MyQueueResponse(
            appointment=appointment,
            queue_position=appointment.queue_position,
            people_ahead=people_ahead,
            estimated_wait_time=estimated_wait_time,
            current_serving=current_serving.ticket_number if current_serving else None,
            can_check_in=can_check_in,
            status_message=status_message
        ))
    
    return queue_responses

@router.get("/next/{service_center_id}")
async def get_next_in_queue(
    service_center_id: int,
    db: Session = Depends(get_db)
):
    """Get the next appointment in queue for a service center (public endpoint)"""
    
    next_appointment = db.query(Appointment).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            func.date(Appointment.appointment_date) == date.today(),
            Appointment.status == AppointmentStatus.confirmed
        )
    ).order_by(Appointment.queue_position).first()
    
    if not next_appointment:
        return {"message": "No appointments in queue", "ticket_number": None}
    
    return {
        "ticket_number": next_appointment.ticket_number,
        "queue_position": next_appointment.queue_position,
        "appointment_type": next_appointment.appointment_type.value,
        "estimated_service_time": next_appointment.service_center.average_service_time
    }

@router.get("/position/{appointment_id}")
async def get_queue_position(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get queue position info for a specific appointment (current user)."""
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # If not today's appointment, queue position not applicable
    if isinstance(appt.appointment_date, datetime):
        appt_day = appt.appointment_date.date()
    else:
        appt_day = appt.appointment_date
    if appt_day != date.today():
        raise HTTPException(status_code=404, detail="Queue info not available for this date")

    # If currently being served
    if appt.status == AppointmentStatus.in_progress:
        return {"position": 0, "estimated_wait_time": 0, "total_ahead": 0}

    # People ahead
    people_ahead = 0
    if appt.status == AppointmentStatus.confirmed and appt.queue_position is not None:
        people_ahead = db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.service_center_id == appt.service_center_id,
                func.date(Appointment.appointment_date) == date.today(),
                Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress]),
                Appointment.queue_position < appt.queue_position
            )
        ).scalar()
    else:
        # If not checked in yet (scheduled), consider all confirmed/in_progress as ahead
        people_ahead = db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.service_center_id == appt.service_center_id,
                func.date(Appointment.appointment_date) == date.today(),
                Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress])
            )
        ).scalar()

    avg_service = appt.service_center.average_service_time if appt.service_center else 15
    position = (people_ahead + 1) if appt.status != AppointmentStatus.in_progress else 0
    estimated_wait = people_ahead * avg_service

    return {
        "position": position,
        "estimated_wait_time": estimated_wait,
        "total_ahead": people_ahead,
    }

@router.post("/checkin/{appointment_id}")
async def check_in(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Alias for check-in under /queue to match frontend. Marks appointment as confirmed and assigns queue position."""
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Must be for today and in scheduled status
    if appt.status != AppointmentStatus.scheduled:
        raise HTTPException(status_code=400, detail="Appointment is not available for check-in")
    if isinstance(appt.appointment_date, datetime):
        appt_day = appt.appointment_date.date()
    else:
        appt_day = appt.appointment_date
    if appt_day != date.today():
        raise HTTPException(status_code=400, detail="Can only check in on appointment date")

    # Update status and check-in time
    appt.status = AppointmentStatus.confirmed
    appt.checked_in_at = datetime.utcnow()

    # Assign queue position
    queue_position = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == appt.service_center_id,
            func.date(Appointment.appointment_date) == date.today(),
            Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress]),
            Appointment.checked_in_at < appt.checked_in_at
        )
    ).scalar() + 1
    appt.queue_position = queue_position
    db.commit()

    return {"message": "Successfully checked in", "queue_position": queue_position}