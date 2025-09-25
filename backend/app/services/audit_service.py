from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog, AuditAction
from typing import Optional

def log_audit_action(
    db: Session,
    action: AuditAction,
    entity_type: str,
    entity_id: Optional[int] = None,
    description: str = "",
    user_id: Optional[int] = None,
    target_user_id: Optional[int] = None,
    appointment_id: Optional[int] = None,
    service_center_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    additional_data: Optional[str] = None
):
    """Log an audit action to the database"""
    audit_log = AuditLog(
        user_id=user_id,
        target_user_id=target_user_id,
        appointment_id=appointment_id,
        service_center_id=service_center_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        additional_data=additional_data
    )
    
    db.add(audit_log)
    db.commit()
    
    return audit_log