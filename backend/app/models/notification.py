from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class NotificationType(str, enum.Enum):
    sms = "sms"
    email = "email"
    push = "push"

class NotificationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    
    # Notification details
    type = Column(Enum(NotificationType), nullable=False)
    subject = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    recipient = Column(String(255), nullable=False)  # email or phone number
    
    # Status tracking
    status = Column(Enum(NotificationStatus), default=NotificationStatus.pending, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Metadata
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    appointment = relationship("Appointment", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(id={self.id}, type='{self.type}', status='{self.status}')>"

# Add back references
from .user import User
from .appointment import Appointment

User.notifications = relationship("Notification", back_populates="user")
Appointment.notifications = relationship("Notification", back_populates="appointment")