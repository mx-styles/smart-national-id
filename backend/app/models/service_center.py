from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, Time
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import time

class ServiceCenter(Base):
    __tablename__ = "service_centers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(10), unique=True, index=True, nullable=False)
    
    # Location
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    province = Column(String(100), nullable=False)
    
    # Contact information
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Operating details
    operating_hours = Column(String(100), nullable=False, default="08:00-16:30")  # Keep for backward compatibility
    opening_time = Column(Time, nullable=False, default=time(8, 0))  # 08:00
    closing_time = Column(Time, nullable=False, default=time(16, 30))  # 16:30
    max_daily_capacity = Column(Integer, nullable=False, default=100)
    current_queue_length = Column(Integer, nullable=False, default=0)
    average_service_time = Column(Integer, nullable=False, default=15)  # minutes
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_operational = Column(Boolean, default=True, nullable=False)
    
    # Coordinates for future mapping
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ServiceCenter(id={self.id}, name='{self.name}', code='{self.code}')>"