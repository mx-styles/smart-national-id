from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime, date, time, timedelta, timezone
import random
import string

from app.core import get_db, get_current_active_user
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.models.service_center import ServiceCenter
from app.schemas.appointment import (
    AppointmentCreate, 
    AppointmentResponse, 
    AppointmentUpdate,
    ServiceCenterResponse,
    QueueStatusResponse,
    MyQueueResponse
)
from app.services.audit_service import log_audit_action
from app.models.audit_log import AuditAction

router = APIRouter()

def generate_ticket_number(service_center_code: str, appointment_date: date) -> str:
    """Generate a unique ticket number"""
    date_str = appointment_date.strftime("%y%m%d")
    random_suffix = ''.join(random.choices(string.digits, k=3))
    return f"{service_center_code}-{date_str}-{random_suffix}"

@router.get("/service-centers", response_model=List[ServiceCenterResponse])
async def get_service_centers(
    city: Optional[str] = Query(None),
    is_operational: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get list of available service centers"""
    query = db.query(ServiceCenter).filter(ServiceCenter.is_active == True)
    
    if is_operational:
        query = query.filter(ServiceCenter.is_operational == True)
    
    if city:
        query = query.filter(ServiceCenter.city.ilike(f"%{city}%"))
    
    return query.all()

@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Book a new appointment"""
    
    # Verify service center exists and is operational
    service_center = db.query(ServiceCenter).filter(
        ServiceCenter.id == appointment_data.service_center_id,
        ServiceCenter.is_active == True,
        ServiceCenter.is_operational == True
    ).first()
    
    if not service_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service center not found or not operational"
        )
    
    # Check if user already has an active appointment for the same day
    existing_appointment = db.query(Appointment).filter(
        and_(
            Appointment.user_id == current_user.id,
            func.date(Appointment.appointment_date) == appointment_data.appointment_date,
            Appointment.status.in_([AppointmentStatus.scheduled, AppointmentStatus.confirmed])
        )
    ).first()
    
    if existing_appointment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an appointment scheduled for this date"
        )
    
    # Check daily capacity
    daily_appointments = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == appointment_data.service_center_id,
            func.date(Appointment.appointment_date) == appointment_data.appointment_date,
            Appointment.status != AppointmentStatus.cancelled
        )
    ).scalar()
    
    if daily_appointments >= service_center.max_daily_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No more slots available for this date. Please choose another date."
        )
    
    # Validate appointment time is within operating hours
    if (appointment_data.scheduled_time < service_center.opening_time or 
        appointment_data.scheduled_time > service_center.closing_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment time must be between {service_center.opening_time.strftime('%H:%M')} and {service_center.closing_time.strftime('%H:%M')}"
        )
    
    # Validate appointment is not in the past
    appointment_datetime = datetime.combine(appointment_data.appointment_date, appointment_data.scheduled_time)
    current_datetime = datetime.now()
    
    if appointment_datetime <= current_datetime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book appointments in the past"
        )
    
    # Generate ticket number
    ticket_number = generate_ticket_number(service_center.code, appointment_data.appointment_date)
    
    # Ensure unique ticket number
    while db.query(Appointment).filter(Appointment.ticket_number == ticket_number).first():
        ticket_number = generate_ticket_number(service_center.code, appointment_data.appointment_date)
    
    # Create appointment
    # Normalize to timezone-aware datetimes (UTC)
    appt_date_dt = datetime.combine(appointment_data.appointment_date, time(0, 0, 0)).replace(tzinfo=timezone.utc)
    scheduled_dt = datetime.combine(appointment_data.appointment_date, appointment_data.scheduled_time).replace(tzinfo=timezone.utc)

    appointment = Appointment(
        user_id=current_user.id,
        service_center_id=appointment_data.service_center_id,
        appointment_type=appointment_data.appointment_type,
        appointment_date=appt_date_dt,
        scheduled_time=scheduled_dt,
        priority=appointment_data.priority,
        special_requirements=appointment_data.special_requirements,
        ticket_number=ticket_number,
        status=AppointmentStatus.scheduled
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.create,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Appointment booked: {ticket_number}",
        user_id=current_user.id,
        appointment_id=appointment.id,
        service_center_id=appointment_data.service_center_id
    )
    
    return appointment

@router.get("/my", response_model=List[AppointmentResponse])
async def get_my_appointments(
    status_filter: Optional[AppointmentStatus] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's appointments"""
    query = db.query(Appointment).options(
        joinedload(Appointment.user),
        joinedload(Appointment.service_center)
    ).filter(Appointment.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    
    return query.order_by(Appointment.appointment_date.desc()).all()

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific appointment details"""
    appointment = db.query(Appointment).options(
        joinedload(Appointment.user),
        joinedload(Appointment.service_center)
    ).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    return appointment

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update appointment details (limited to future appointments)"""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Only allow updates for scheduled appointments
    if appointment.status not in [AppointmentStatus.scheduled, AppointmentStatus.confirmed]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update appointment in current status"
        )
    
    # Update allowed fields
    update_data = appointment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ['appointment_date', 'scheduled_time'] and value:
            if field == 'scheduled_time':
                value = datetime.combine(appointment.appointment_date, value)
                field = 'scheduled_time'
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.update,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Appointment updated: {appointment.ticket_number}",
        user_id=current_user.id,
        appointment_id=appointment.id
    )
    
    return appointment

@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel an appointment"""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Only allow cancellation for future appointments
    if appointment.status in [AppointmentStatus.completed, AppointmentStatus.cancelled]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel appointment in current status"
        )
    
    appointment.status = AppointmentStatus.cancelled
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.cancel_appointment,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Appointment cancelled: {appointment.ticket_number}",
        user_id=current_user.id,
        appointment_id=appointment.id
    )
    
    return {"message": "Appointment cancelled successfully"}

# Alias to match frontend usage
@router.put("/{appointment_id}/cancel")
async def cancel_appointment_put(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return await cancel_appointment(appointment_id, current_user, db)

@router.post("/{appointment_id}/check-in")
async def check_in_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check in for an appointment"""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Verify appointment is for today and in correct status
    appt_day = appointment.appointment_date.date() if isinstance(appointment.appointment_date, datetime) else appointment.appointment_date
    if appt_day != date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only check in on appointment date"
        )
    
    if appointment.status != AppointmentStatus.scheduled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment is not available for check-in"
        )
    
    # Update appointment status and check-in time
    appointment.status = AppointmentStatus.confirmed
    appointment.checked_in_at = datetime.utcnow()
    
    # Calculate queue position
    queue_position = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == appointment.service_center_id,
            func.date(Appointment.appointment_date) == appt_day,
            Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress]),
            Appointment.checked_in_at < appointment.checked_in_at
        )
    ).scalar() + 1
    
    appointment.queue_position = queue_position
    
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.check_in,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Checked in for appointment: {appointment.ticket_number}",
        user_id=current_user.id,
        appointment_id=appointment.id
    )
    
    return {"message": "Successfully checked in", "queue_position": queue_position}