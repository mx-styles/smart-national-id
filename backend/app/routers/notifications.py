from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core import get_db, get_current_active_user, get_admin_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse,
    SendNotificationRequest
)
from app.services.notification_service import NotificationService

router = APIRouter()

@router.post("/send", status_code=status.HTTP_202_ACCEPTED)
async def send_notification(
    notification_request: SendNotificationRequest,
    background_tasks: BackgroundTasks,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Send a notification (admin only)"""
    
    notification_service = NotificationService(db)
    
    # Create notification
    notification = notification_service.create_notification(
        user_id=notification_request.user_id,
        notification_type=notification_request.type,
        message=notification_request.message,
        subject=notification_request.subject,
        appointment_id=notification_request.appointment_id
    )
    
    # Send notification in background
    background_tasks.add_task(
        notification_service.send_notification,
        notification.id
    )
    
    return {
        "message": "Notification queued for sending",
        "notification_id": notification.id
    }

@router.post("/appointment-confirmation/{appointment_id}")
async def send_appointment_confirmation(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send appointment confirmation (triggered automatically or manually)"""
    
    notification_service = NotificationService(db)
    
    # Send confirmation in background
    background_tasks.add_task(
        notification_service.send_appointment_confirmation,
        appointment_id
    )
    
    return {"message": "Appointment confirmation sent"}

@router.post("/queue-update/{appointment_id}")
async def send_queue_update(
    appointment_id: int,
    queue_position: int,
    estimated_wait: int,
    background_tasks: BackgroundTasks,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Send queue position update"""
    
    notification_service = NotificationService(db)
    
    background_tasks.add_task(
        notification_service.send_queue_update,
        appointment_id,
        queue_position,
        estimated_wait
    )
    
    return {"message": "Queue update sent"}

@router.post("/call-customer/{appointment_id}")
async def notify_customer_called(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Notify customer they're being called"""
    
    notification_service = NotificationService(db)
    
    background_tasks.add_task(
        notification_service.send_call_notification,
        appointment_id
    )
    
    return {"message": "Customer notification sent"}

@router.get("/my", response_model=List[NotificationResponse])
async def get_my_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's notifications"""
    
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(limit).all()
    
    return notifications

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific notification"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return notification

@router.get("/admin/all", response_model=List[NotificationResponse])
async def get_all_notifications(
    limit: int = 100,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all notifications (admin only)"""
    
    notifications = db.query(Notification).order_by(
        Notification.created_at.desc()
    ).limit(limit).all()
    
    return notifications

@router.post("/test-sms")
async def test_sms_service(
    phone: str,
    message: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Test SMS service (admin only)"""
    
    notification_service = NotificationService(db)
    success = notification_service.send_sms(phone, message)
    
    return {
        "success": success,
        "message": "SMS test completed",
        "note": "This is a stubbed service. Check console for output."
    }

@router.post("/test-email")
async def test_email_service(
    email: str,
    subject: str,
    message: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Test email service (admin only)"""
    
    notification_service = NotificationService(db)
    success = notification_service.send_email(email, subject, message)
    
    return {
        "success": success,
        "message": "Email test completed",
        "note": "This is a stubbed service. Check console for output."
    }