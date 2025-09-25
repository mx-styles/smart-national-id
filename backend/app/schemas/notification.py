from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from ..models.notification import NotificationType, NotificationStatus

class NotificationBase(BaseModel):
    type: NotificationType
    subject: Optional[str] = None
    message: str
    recipient: str

class NotificationCreate(NotificationBase):
    user_id: int
    appointment_id: Optional[int] = None

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    appointment_id: Optional[int] = None
    status: NotificationStatus
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class SendNotificationRequest(BaseModel):
    user_id: int
    type: NotificationType
    message: str
    subject: Optional[str] = None
    appointment_id: Optional[int] = None