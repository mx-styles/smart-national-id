from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, desc
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.core import get_db, get_admin_user
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service_center import ServiceCenter
from app.models.audit_log import AuditLog
from app.schemas.appointment import AppointmentResponse, ServiceCenterResponse
from app.services.audit_service import log_audit_action
from app.models.audit_log import AuditAction

router = APIRouter()

@router.get("/queue/{service_center_id}", response_model=List[AppointmentResponse])
async def get_service_center_queue(
    service_center_id: int,
    appointment_date: Optional[date] = Query(default=None),
    status_filter: Optional[AppointmentStatus] = Query(default=None),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get queue for a specific service center (admin only)"""
    
    # Default to today if no date specified
    if appointment_date is None:
        appointment_date = date.today()
    
    query = db.query(Appointment).options(
        joinedload(Appointment.user),
        joinedload(Appointment.service_center)
    ).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            func.date(Appointment.appointment_date) == appointment_date
        )
    )
    
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    
    return query.order_by(Appointment.queue_position, Appointment.created_at).all()

@router.post("/queue/call-next/{service_center_id}")
async def call_next_customer(
    service_center_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Call the next customer in queue"""
    
    # Find next appointment in queue
    next_appointment = db.query(Appointment).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            func.date(Appointment.appointment_date) == date.today(),
            Appointment.status == AppointmentStatus.confirmed
        )
    ).order_by(Appointment.queue_position).first()
    
    if not next_appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No customers in queue"
        )
    
    # Update appointment status
    next_appointment.status = AppointmentStatus.in_progress
    next_appointment.service_started_at = datetime.utcnow()
    next_appointment.served_by_user_id = admin_user.id
    
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.call_next,
        entity_type="appointment",
        entity_id=next_appointment.id,
        description=f"Called next customer: {next_appointment.ticket_number}",
        user_id=admin_user.id,
        target_user_id=next_appointment.user_id,
        appointment_id=next_appointment.id,
        service_center_id=service_center_id
    )
    
    return {
        "message": "Customer called successfully",
        "ticket_number": next_appointment.ticket_number,
        "customer_name": f"{next_appointment.user.first_name} {next_appointment.user.last_name}",
        "appointment_type": next_appointment.appointment_type.value
    }

# Compatibility route for frontend which calls POST /admin/queue/{service_center_id}/next
@router.post("/queue/{service_center_id}/next")
async def call_next_customer_alias(service_center_id: int, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return await call_next_customer(service_center_id, admin_user, db)

@router.post("/queue/complete/{appointment_id}")
async def complete_service(
    appointment_id: int,
    notes: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Mark service as completed"""
    
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.status == AppointmentStatus.in_progress
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active appointment not found"
        )
    
    # Update appointment
    appointment.status = AppointmentStatus.completed
    appointment.service_completed_at = datetime.utcnow()
    if notes:
        appointment.notes = notes
    
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.complete_service,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Service completed: {appointment.ticket_number}",
        user_id=admin_user.id,
        target_user_id=appointment.user_id,
        appointment_id=appointment.id,
        service_center_id=appointment.service_center_id
    )
    
    return {"message": "Service completed successfully"}

# Compatibility route for frontend which calls PUT /admin/appointments/{appointment_id}/complete
@router.put("/appointments/{appointment_id}/complete")
async def complete_service_alias(appointment_id: int, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return await complete_service(appointment_id, None, admin_user, db)

# Implement update status endpoint expected by frontend
from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: AppointmentStatus

@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    payload: StatusUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = payload.status
    db.commit()
    return {"message": "Status updated"}

@router.get("/appointments/today", response_model=List[AppointmentResponse])
async def get_todays_appointments(
    service_center_id: Optional[int] = Query(default=None),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all appointments for today"""
    
    query = db.query(Appointment).options(
        joinedload(Appointment.user),
        joinedload(Appointment.service_center)
    ).filter(
        Appointment.appointment_date == date.today()
    )
    
    if service_center_id:
        query = query.filter(Appointment.service_center_id == service_center_id)
    
    return query.order_by(Appointment.scheduled_time).all()

@router.get("/analytics/daily/{service_center_id}")
async def get_daily_analytics(
    service_center_id: int,
    analytics_date: Optional[date] = Query(default=None),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get daily analytics for a service center"""
    
    if analytics_date is None:
        analytics_date = date.today()
    
    # Total appointments
    total_appointments = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            Appointment.appointment_date == analytics_date
        )
    ).scalar()
    
    # Completed appointments
    completed_appointments = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            Appointment.appointment_date == analytics_date,
            Appointment.status == AppointmentStatus.completed
        )
    ).scalar()
    
    # No-shows
    no_shows = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            Appointment.appointment_date == analytics_date,
            Appointment.status == AppointmentStatus.no_show
        )
    ).scalar()
    
    # Cancelled
    cancelled = db.query(func.count(Appointment.id)).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            Appointment.appointment_date == analytics_date,
            Appointment.status == AppointmentStatus.cancelled
        )
    ).scalar()
    
    # Average service time (for completed appointments)
    completed_with_times = db.query(Appointment).filter(
        and_(
            Appointment.service_center_id == service_center_id,
            Appointment.appointment_date == analytics_date,
            Appointment.status == AppointmentStatus.completed,
            Appointment.service_started_at.isnot(None),
            Appointment.service_completed_at.isnot(None)
        )
    ).all()
    
    if completed_with_times:
        total_service_time = sum([
            (apt.service_completed_at - apt.service_started_at).seconds / 60
            for apt in completed_with_times
        ])
        average_service_time = total_service_time / len(completed_with_times)
    else:
        average_service_time = 0
    
    return {
        "date": analytics_date,
        "service_center_id": service_center_id,
        "total_appointments": total_appointments,
        "completed": completed_appointments,
        "no_shows": no_shows,
        "cancelled": cancelled,
        "completion_rate": completed_appointments / total_appointments * 100 if total_appointments > 0 else 0,
        "average_service_time_minutes": round(average_service_time, 2)
    }

@router.get("/service-centers", response_model=List[ServiceCenterResponse])
async def get_all_service_centers(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all service centers (admin only)"""
    return db.query(ServiceCenter).all()

# Service Center Management Endpoints
class ServiceCenterCreate(BaseModel):
    name: str
    code: str
    address: str
    city: str
    province: str
    phone: Optional[str] = None
    email: Optional[str] = None
    opening_time: str = "08:00"
    closing_time: str = "16:30"
    max_daily_capacity: int = 100
    average_service_time: int = 15
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ServiceCenterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    max_daily_capacity: Optional[int] = None
    average_service_time: Optional[int] = None
    is_active: Optional[bool] = None
    is_operational: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/service-centers", response_model=ServiceCenterResponse)
async def create_service_center(
    service_center_data: ServiceCenterCreate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new service center (admin only)"""
    
    # Check if code already exists
    existing = db.query(ServiceCenter).filter(ServiceCenter.code == service_center_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service center code already exists"
        )
    
    from datetime import time
    
    try:
        # Parse time strings
        opening_time = time(*map(int, service_center_data.opening_time.split(':')))
        closing_time = time(*map(int, service_center_data.closing_time.split(':')))
        
        # Create operating hours string for backward compatibility
        operating_hours = f"{service_center_data.opening_time}-{service_center_data.closing_time}"
        
        service_center = ServiceCenter(
            name=service_center_data.name,
            code=service_center_data.code,
            address=service_center_data.address,
            city=service_center_data.city,
            province=service_center_data.province,
            phone=service_center_data.phone,
            email=service_center_data.email,
            operating_hours=operating_hours,
            opening_time=opening_time,
            closing_time=closing_time,
            max_daily_capacity=service_center_data.max_daily_capacity,
            average_service_time=service_center_data.average_service_time,
            latitude=service_center_data.latitude,
            longitude=service_center_data.longitude
        )
        
        db.add(service_center)
        db.commit()
        db.refresh(service_center)
        
        # Log audit action
        log_audit_action(
            db=db,
            action=AuditAction.create,
            entity_type="service_center",
            entity_id=service_center.id,
            description=f"Service center created: {service_center.name} ({service_center.code})",
            user_id=admin_user.id
        )
        
        return service_center
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time format. Use HH:MM format"
        )

@router.put("/service-centers/{service_center_id}", response_model=ServiceCenterResponse)
async def update_service_center(
    service_center_id: int,
    service_center_data: ServiceCenterUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update a service center (admin only)"""
    
    service_center = db.query(ServiceCenter).filter(ServiceCenter.id == service_center_id).first()
    if not service_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service center not found"
        )
    
    # Check if code already exists (if being updated)
    if service_center_data.code and service_center_data.code != service_center.code:
        existing = db.query(ServiceCenter).filter(ServiceCenter.code == service_center_data.code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service center code already exists"
            )
    
    from datetime import time
    
    try:
        # Update fields
        update_data = service_center_data.dict(exclude_unset=True)
        
        # Handle time parsing if provided
        if service_center_data.opening_time:
            opening_time = time(*map(int, service_center_data.opening_time.split(':')))
            update_data['opening_time'] = opening_time
            
        if service_center_data.closing_time:
            closing_time = time(*map(int, service_center_data.closing_time.split(':')))
            update_data['closing_time'] = closing_time
            
        # Update operating hours string if either time is updated
        if service_center_data.opening_time or service_center_data.closing_time:
            opening_str = service_center_data.opening_time or service_center.opening_time.strftime('%H:%M')
            closing_str = service_center_data.closing_time or service_center.closing_time.strftime('%H:%M')
            update_data['operating_hours'] = f"{opening_str}-{closing_str}"
        
        for key, value in update_data.items():
            setattr(service_center, key, value)
        
        db.commit()
        db.refresh(service_center)
        
        # Log audit action
        log_audit_action(
            db=db,
            action=AuditAction.update,
            entity_type="service_center",
            entity_id=service_center.id,
            description=f"Service center updated: {service_center.name} ({service_center.code})",
            user_id=admin_user.id
        )
        
        return service_center
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time format. Use HH:MM format"
        )

@router.delete("/service-centers/{service_center_id}")
async def delete_service_center(
    service_center_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a service center (admin only)"""
    
    service_center = db.query(ServiceCenter).filter(ServiceCenter.id == service_center_id).first()
    if not service_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service center not found"
        )
    
    # Check if there are any appointments linked to this service center
    appointments_count = db.query(func.count(Appointment.id)).filter(
        Appointment.service_center_id == service_center_id
    ).scalar()
    
    if appointments_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete service center with existing appointments. Deactivate instead."
        )
    
    db.delete(service_center)
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.delete,
        entity_type="service_center",
        entity_id=service_center_id,
        description=f"Service center deleted: {service_center.name} ({service_center.code})",
        user_id=admin_user.id
    )
    
    return {"message": "Service center deleted successfully"}

@router.get("/service-centers/{service_center_id}", response_model=ServiceCenterResponse)
async def get_service_center(
    service_center_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific service center (admin only)"""
    
    service_center = db.query(ServiceCenter).filter(ServiceCenter.id == service_center_id).first()
    if not service_center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service center not found"
        )
    
    return service_center

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, le=100),
    service_center_id: Optional[int] = Query(default=None),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get audit logs"""
    
    query = db.query(AuditLog)
    
    if service_center_id:
        query = query.filter(AuditLog.service_center_id == service_center_id)
    
    logs = query.order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "action": log.action.value,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "user_email": log.user.email if log.user else None,
            "created_at": log.created_at
        }
        for log in logs
    ]

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics (admin only)"""
    
    # Calculate various statistics
    total_appointments = db.query(Appointment).count()
    
    # Appointments today
    today = date.today()
    appointments_today = db.query(Appointment).filter(
        func.date(Appointment.appointment_date) == today
    ).count()
    
    # Current queue length (confirmed appointments for today)
    queue_length = db.query(Appointment).filter(
        and_(
            func.date(Appointment.appointment_date) == today,
            Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.in_progress])
        )
    ).count()
    
    # Average wait time calculation (simplified)
    average_wait_time = 15  # minutes - could be calculated from actual data
    
    # Active service centers
    service_centers_active = db.query(ServiceCenter).filter(
        ServiceCenter.is_active == True
    ).count()
    
    # Total registered users
    users_registered = db.query(User).count()
    
    # Align keys with frontend AdminDashboard expectations
    return {
        "today_appointments": appointments_today,
        "active_queue": queue_length,
        "completed_today": db.query(Appointment).filter(
            and_(func.date(Appointment.appointment_date) == today, Appointment.status == AppointmentStatus.completed)
        ).count(),
        "avg_wait_time": average_wait_time,
        # keep the extra stats for future use as well
        "total_appointments": total_appointments,
        "service_centers_active": service_centers_active,
        "users_registered": users_registered
    }

@router.get("/appointments")
async def get_all_appointments(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    status: Optional[AppointmentStatus] = Query(default=None),
    service_center_id: Optional[int] = Query(default=None),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all appointments with pagination (admin only)"""
    
    query = db.query(Appointment)
    
    if status:
        query = query.filter(Appointment.status == status)
    
    if service_center_id:
        query = query.filter(Appointment.service_center_id == service_center_id)
    
    appointments = query.order_by(desc(Appointment.created_at)).offset(offset).limit(limit).all()
    
    return appointments