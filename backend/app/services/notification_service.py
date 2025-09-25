from sqlalchemy.orm import Session
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.models.appointment import Appointment
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification(
        self,
        user_id: int,
        notification_type: NotificationType,
        message: str,
        subject: Optional[str] = None,
        appointment_id: Optional[int] = None
    ) -> Notification:
        """Create a new notification record"""
        
        # Get user to determine recipient
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Determine recipient based on notification type
        if notification_type == NotificationType.email:
            recipient = user.email
        elif notification_type == NotificationType.sms:
            recipient = user.phone
        else:
            recipient = user.email  # Default to email for push notifications
        
        notification = Notification(
            user_id=user_id,
            appointment_id=appointment_id,
            type=notification_type,
            subject=subject,
            message=message,
            recipient=recipient,
            status=NotificationStatus.pending
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    def send_sms(self, phone: str, message: str) -> bool:
        """Send SMS notification (stubbed for now)"""
        # TODO: Integrate with SMS gateway (Twilio, local providers, etc.)
        logger.info(f"SMS to {phone}: {message}")
        print(f"[SMS STUB] To: {phone}, Message: {message}")
        return True
    
    def send_email(self, email: str, subject: str, message: str) -> bool:
        """Send email notification (stubbed for now)"""
        # TODO: Integrate with email service (SMTP, SendGrid, etc.)
        logger.info(f"Email to {email}: {subject} - {message}")
        print(f"[EMAIL STUB] To: {email}, Subject: {subject}, Message: {message}")
        return True
    
    def send_notification(self, notification_id: int) -> bool:
        """Send a specific notification"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        
        if not notification:
            return False
        
        try:
            success = False
            
            if notification.type == NotificationType.sms:
                success = self.send_sms(notification.recipient, notification.message)
            elif notification.type == NotificationType.email:
                success = self.send_email(
                    notification.recipient, 
                    notification.subject or "Queue Management Notification", 
                    notification.message
                )
            elif notification.type == NotificationType.push:
                # For now, treat push as email
                success = self.send_email(
                    notification.recipient,
                    notification.subject or "Queue Management Update",
                    notification.message
                )
            
            if success:
                notification.status = NotificationStatus.sent
                from datetime import datetime
                notification.sent_at = datetime.utcnow()
            else:
                notification.status = NotificationStatus.failed
                notification.error_message = "Failed to send notification"
                notification.retry_count += 1
            
            self.db.commit()
            return success
            
        except Exception as e:
            logger.error(f"Failed to send notification {notification_id}: {str(e)}")
            notification.status = NotificationStatus.failed
            notification.error_message = str(e)
            notification.retry_count += 1
            self.db.commit()
            return False
    
    def send_appointment_confirmation(self, appointment_id: int) -> bool:
        """Send appointment confirmation notification"""
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            return False
        
        message = f"""
        Dear {appointment.user.first_name},
        
        Your appointment has been confirmed!
        
        Ticket Number: {appointment.ticket_number}
        Date: {appointment.appointment_date.strftime('%B %d, %Y')}
        Time: {appointment.scheduled_time.strftime('%I:%M %p')}
        Service Center: {appointment.service_center.name}
        Type: {appointment.appointment_type.value.replace('_', ' ').title()}
        
        Please arrive 15 minutes early and bring required documents.
        
        Thank you,
        Smart e-National ID Team
        """
        
        # Send both SMS and email
        sms_notification = self.create_notification(
            user_id=appointment.user_id,
            notification_type=NotificationType.sms,
            message=f"Appointment confirmed! Ticket: {appointment.ticket_number}, Date: {appointment.appointment_date.strftime('%m/%d/%Y')}, Time: {appointment.scheduled_time.strftime('%I:%M %p')}",
            appointment_id=appointment_id
        )
        
        email_notification = self.create_notification(
            user_id=appointment.user_id,
            notification_type=NotificationType.email,
            subject="Appointment Confirmation - Smart e-National ID",
            message=message,
            appointment_id=appointment_id
        )
        
        sms_success = self.send_notification(sms_notification.id)
        email_success = self.send_notification(email_notification.id)
        
        return sms_success or email_success
    
    def send_queue_update(self, appointment_id: int, queue_position: int, estimated_wait: int) -> bool:
        """Send queue position update"""
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            return False
        
        message = f"""
        Queue Update for {appointment.user.first_name},
        
        Ticket: {appointment.ticket_number}
        Position in queue: {queue_position}
        Estimated wait time: {estimated_wait} minutes
        
        You will be notified when it's your turn.
        """
        
        notification = self.create_notification(
            user_id=appointment.user_id,
            notification_type=NotificationType.sms,
            message=f"Queue update - Position: {queue_position}, Est. wait: {estimated_wait} min",
            appointment_id=appointment_id
        )
        
        return self.send_notification(notification.id)
    
    def send_call_notification(self, appointment_id: int) -> bool:
        """Send notification when customer is called"""
        appointment = self.db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            return False
        
        message = f"""
        {appointment.user.first_name}, it's your turn!
        
        Ticket: {appointment.ticket_number}
        Please proceed to the service counter at {appointment.service_center.name}
        """
        
        # Send both SMS and push notification
        sms_notification = self.create_notification(
            user_id=appointment.user_id,
            notification_type=NotificationType.sms,
            message=f"It's your turn! Ticket: {appointment.ticket_number}. Please proceed to service counter.",
            appointment_id=appointment_id
        )
        
        push_notification = self.create_notification(
            user_id=appointment.user_id,
            notification_type=NotificationType.push,
            subject="Your Turn!",
            message=message,
            appointment_id=appointment_id
        )
        
        sms_success = self.send_notification(sms_notification.id)
        push_success = self.send_notification(push_notification.id)
        
        return sms_success or push_success