from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, date, time
from ..models.appointment import AppointmentStatus, AppointmentType, Priority
from .user import UserResponse

class ServiceCenterBase(BaseModel):
    name: str
    code: str
    address: str
    city: str
    province: str
    phone: Optional[str] = None
    email: Optional[str] = None
    operating_hours: str = "08:00-16:30"  # Keep for backward compatibility
    opening_time: time = time(8, 0)  # 08:00
    closing_time: time = time(16, 30)  # 16:30
    max_daily_capacity: int = 100
    average_service_time: int = 15

class ServiceCenterCreate(ServiceCenterBase):
    pass

class ServiceCenterResponse(ServiceCenterBase):
    id: int
    current_queue_length: int
    is_active: bool
    is_operational: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    service_center_id: int
    appointment_type: AppointmentType
    appointment_date: date
    scheduled_time: time
    priority: Priority = Priority.normal
    special_requirements: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    @validator('appointment_date')
    def validate_appointment_date(cls, v):
        if v < date.today():
            raise ValueError('Appointment date cannot be in the past')
        return v

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    special_requirements: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: int
    ticket_number: str
    user_id: int
    queue_position: Optional[int] = None
    estimated_wait_time: Optional[int] = None
    status: AppointmentStatus
    checked_in_at: Optional[datetime] = None
    service_started_at: Optional[datetime] = None
    service_completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Nested objects
    service_center: ServiceCenterResponse
    user: UserResponse
    
    # Coerce ORM datetimes to expected date/time types in the response
    @validator('scheduled_time', pre=True)
    def _scheduled_time_from_datetime(cls, v):
        if isinstance(v, datetime):
            return v.time()
        return v

    @validator('appointment_date', pre=True)
    def _appointment_date_from_datetime(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v
    
    class Config:
        from_attributes = True

class QueueStatusResponse(BaseModel):
    service_center_id: int
    service_center_name: str
    total_in_queue: int
    current_serving: Optional[str] = None  # ticket number
    average_wait_time: int
    estimated_wait_time: int
    last_updated: datetime

class MyQueueResponse(BaseModel):
    appointment: AppointmentResponse
    queue_position: Optional[int] = None
    people_ahead: int
    estimated_wait_time: int
    current_serving: Optional[str] = None
    can_check_in: bool
    status_message: str