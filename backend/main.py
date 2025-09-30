from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.config import settings
from app.core.database import create_tables
from app.core import get_db
from app.models.service_center import ServiceCenter
from app.models.appointment import Appointment
from app.schemas.appointment import ServiceCenterResponse
from app.routers import auth, appointments, queue, admin, notifications

# Create database tables
create_tables()

app = FastAPI(
    title=settings.app_name,
    description="Smart e-National ID Queue Management System API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
cors_origins = settings.cors_origins
cors_kwargs = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
    "expose_headers": ["*"],
}

if "*" in cors_origins:
    # When credentials are allowed, browsers expect a specific origin value.
    cors_kwargs.update({
        "allow_origins": cors_origins,
        "allow_credentials": False,
    })
else:
    cors_kwargs["allow_origins"] = cors_origins
    if settings.allowed_origin_regex:
        cors_kwargs["allow_origin_regex"] = settings.allowed_origin_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
app.include_router(queue.router, prefix="/queue", tags=["Queue Management"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to Smart e-National ID Queue Management System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/service-centers", response_model=List[ServiceCenterResponse])
async def get_service_centers(
    city: Optional[str] = Query(None),
    is_operational: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get list of available service centers"""
    query = db.query(ServiceCenter).filter(ServiceCenter.is_active == True)
    
    if city:
        query = query.filter(ServiceCenter.city.ilike(f"%{city}%"))
    
    return query.all()

@app.get("/service-centers/{center_id}/slots")
async def get_available_slots(
    center_id: int,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Get available time slots for a service center on a specific date"""
    
    # Get service center to check operating hours
    service_center = db.query(ServiceCenter).filter(ServiceCenter.id == center_id).first()
    if not service_center:
        raise HTTPException(status_code=404, detail="Service center not found")
    
    # Generate time slots based on operating hours
    from datetime import datetime, timedelta
    opening_time = service_center.opening_time
    closing_time = service_center.closing_time
    
    all_slots = []
    current_time = datetime.combine(datetime.today(), opening_time)
    end_time = datetime.combine(datetime.today(), closing_time)
    
    # Generate 30-minute slots within operating hours
    while current_time <= end_time:
        all_slots.append(current_time.strftime("%H:%M"))
        current_time += timedelta(minutes=30)
    
    # Get existing appointments for this date and center
    from datetime import datetime
    try:
        appointment_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    from sqlalchemy import func
    existing_appointments = db.query(Appointment).filter(
        Appointment.service_center_id == center_id,
        func.date(Appointment.appointment_date) == appointment_date
    ).all()
    
    # Remove booked slots
    def _fmt_time(dt):
        try:
            return dt.strftime("%H:%M") if dt else None
        except Exception:
            return None
    booked_times = [
        _fmt_time(getattr(apt, "scheduled_time", None))
        for apt in existing_appointments
    ]
    booked_times = [t for t in booked_times if t]
    available_slots = [slot for slot in all_slots if slot not in booked_times]
    
    # Filter out past time slots if the date is today
    from datetime import datetime
    current_datetime = datetime.now()
    if appointment_date == current_datetime.date():
        current_time_str = current_datetime.strftime("%H:%M")
        available_slots = [slot for slot in available_slots if slot > current_time_str]
    
    return {"available_slots": available_slots, "date": date, "service_center_id": center_id}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2025-09-20T00:00:00Z"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.debug)