from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AuditAction(str, enum.Enum):
    create = "create"
    update = "update"
    delete = "delete"
    login = "login"
    logout = "logout"
    check_in = "check_in"
    call_next = "call_next"
    complete_service = "complete_service"
    cancel_appointment = "cancel_appointment"

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who performed the action
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Target of the action
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    service_center_id = Column(Integer, ForeignKey("service_centers.id"), nullable=True)
    
    # Action details
    action = Column(Enum(AuditAction), nullable=False)
    entity_type = Column(String(50), nullable=False)  # e.g., "appointment", "user"
    entity_id = Column(Integer, nullable=True)
    
    # Metadata
    description = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    additional_data = Column(Text, nullable=True)  # JSON string for extra context
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    appointment = relationship("Appointment")
    service_center = relationship("ServiceCenter")
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', entity='{self.entity_type}')>"