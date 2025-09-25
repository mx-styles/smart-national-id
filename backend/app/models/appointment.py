from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"

class AppointmentType(str, enum.Enum):
    new_application = "new_application"
    renewal = "renewal"
    replacement = "replacement"
    correction = "correction"
    collection = "collection"

class Priority(str, enum.Enum):
    normal = "normal"
    elderly = "elderly"
    disabled = "disabled"
    pregnant = "pregnant"
    urgent = "urgent"

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(20), unique=True, index=True, nullable=False)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_center_id = Column(Integer, ForeignKey("service_centers.id"), nullable=False)
    served_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Staff member
    
    # Appointment details
    appointment_type = Column(Enum(AppointmentType), nullable=False)
    appointment_date = Column(DateTime(timezone=True), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    
    # Queue management
    queue_position = Column(Integer, nullable=True)
    priority = Column(Enum(Priority), default=Priority.normal, nullable=False)
    estimated_wait_time = Column(Integer, nullable=True)  # minutes
    
    # Status tracking
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.scheduled, nullable=False)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    service_started_at = Column(DateTime(timezone=True), nullable=True)
    service_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional information
    notes = Column(Text, nullable=True)
    special_requirements = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="appointments")
    service_center = relationship("ServiceCenter", back_populates="appointments")
    served_by = relationship("User", foreign_keys=[served_by_user_id])
    
    def __repr__(self):
        return f"<Appointment(id={self.id}, ticket='{self.ticket_number}', status='{self.status}')>"

# Add back references to User and ServiceCenter models
from .user import User
from .service_center import ServiceCenter

User.appointments = relationship("Appointment", foreign_keys=[Appointment.user_id], back_populates="user")
ServiceCenter.appointments = relationship("Appointment", back_populates="service_center")