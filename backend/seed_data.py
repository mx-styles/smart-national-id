import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, create_tables
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, ServiceCenter, Appointment, 
    AppointmentStatus, AppointmentType, Priority
)

def create_sample_data():
    """Create sample data for testing the application."""
    
    # Create database tables
    create_tables()
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(User).first():
            print("Sample data already exists. Skipping...")
            return
        
        print("Creating sample data...")
        
        # Create sample users
        users_data = [
            {
                "email": "admin@example.com",
                "phone": "263771234567",
                "password": "admin123",
                "first_name": "System",
                "last_name": "Administrator",
                "role": UserRole.admin,
                "is_verified": True
            },
            {
                "email": "staff@example.com", 
                "phone": "263771234568",
                "password": "staff123",
                "first_name": "Registry",
                "last_name": "Staff",
                "role": UserRole.staff,
                "is_verified": True
            },
            {
                "email": "john.doe@example.com",
                "phone": "263771234569",
                "password": "user123",
                "first_name": "John",
                "last_name": "Doe",
                "role": UserRole.citizen,
                "is_verified": True
            },
            {
                "email": "jane.smith@example.com",
                "phone": "263771234570",
                "password": "user123",
                "first_name": "Jane",
                "last_name": "Smith",
                "role": UserRole.citizen,
                "national_id": "63-123456A47",
                "is_verified": True
            },
            {
                "email": "mike.johnson@example.com",
                "phone": "263771234571",
                "password": "user123",
                "first_name": "Mike",
                "last_name": "Johnson",
                "role": UserRole.citizen,
                "is_verified": True
            }
        ]
        
        users = []
        for user_data in users_data:
            password = user_data.pop("password")
            user = User(**user_data, hashed_password=get_password_hash(password))
            db.add(user)
            users.append(user)
        
        db.flush()  # Get user IDs
        
        # Create sample service centers
        service_centers_data = [
            {
                "name": "Harare Central Registry",
                "code": "HAR001",
                "address": "Corner Fourth Street and Central Avenue",
                "city": "Harare",
                "province": "Harare",
                "phone": "263242123456",
                "email": "harare.central@registry.gov.zw",
                "operating_hours": "08:00-16:30",
                "max_daily_capacity": 150,
                "latitude": -17.8216,
                "longitude": 31.0492
            },
            {
                "name": "Bulawayo Regional Office",
                "code": "BUL001", 
                "address": "Main Street, City Center",
                "city": "Bulawayo",
                "province": "Bulawayo",
                "phone": "263292123456",
                "email": "bulawayo@registry.gov.zw",
                "operating_hours": "08:00-16:30",
                "max_daily_capacity": 100,
                "latitude": -20.1569,
                "longitude": 28.5713
            },
            {
                "name": "Mutare Provincial Office",
                "code": "MUT001",
                "address": "Herbert Chitepo Street",
                "city": "Mutare", 
                "province": "Manicaland",
                "phone": "263202123456",
                "email": "mutare@registry.gov.zw",
                "operating_hours": "08:00-16:30",
                "max_daily_capacity": 80,
                "latitude": -18.9707,
                "longitude": 32.6734
            },
            {
                "name": "Gweru Service Center",
                "code": "GWE001",
                "address": "Main Street",
                "city": "Gweru",
                "province": "Midlands",
                "phone": "263542123456",
                "email": "gweru@registry.gov.zw",
                "operating_hours": "08:00-16:30",
                "max_daily_capacity": 60,
                "latitude": -19.4498,
                "longitude": 29.8175
            }
        ]
        
        service_centers = []
        for center_data in service_centers_data:
            center = ServiceCenter(**center_data)
            db.add(center)
            service_centers.append(center)
        
        db.flush()  # Get service center IDs
        
        # Create sample appointments
        base_date = datetime.now()
        appointments_data = []
        
        # Past appointments (completed)
        for i in range(5):
            appointment_date = base_date - timedelta(days=i+1)
            appointments_data.append({
                "user_id": users[2].id,  # John Doe
                "service_center_id": service_centers[0].id,  # Harare Central
                "appointment_type": AppointmentType.new_application,
                "appointment_date": appointment_date.date(),
                "scheduled_time": appointment_date.replace(hour=9, minute=0),
                "status": AppointmentStatus.completed,
                "ticket_number": f"HAR001-{1000+i}",
                "priority": Priority.normal
            })
        
        # Today's appointments
        today = base_date.replace(hour=8, minute=0, second=0, microsecond=0)
        appointments_data.extend([
            {
                "user_id": users[3].id,  # Jane Smith
                "service_center_id": service_centers[0].id,
                "appointment_type": AppointmentType.renewal,
                "appointment_date": today.date(),
                "scheduled_time": today.replace(hour=9, minute=0),
                "status": AppointmentStatus.confirmed,
                "ticket_number": "HAR001-2001",
                "priority": Priority.normal,
                "queue_position": 1
            },
            {
                "user_id": users[4].id,  # Mike Johnson
                "service_center_id": service_centers[0].id,
                "appointment_type": AppointmentType.replacement,
                "appointment_date": today.date(),
                "scheduled_time": today.replace(hour=10, minute=0),
                "status": AppointmentStatus.confirmed,
                "ticket_number": "HAR001-2002",
                "priority": Priority.normal,
                "queue_position": 2
            },
            {
                "user_id": users[2].id,  # John Doe
                "service_center_id": service_centers[1].id,
                "appointment_type": AppointmentType.collection,
                "appointment_date": today.date(),
                "scheduled_time": today.replace(hour=11, minute=0),
                "status": AppointmentStatus.scheduled,
                "ticket_number": "BUL001-2003",
                "priority": Priority.normal,
                "queue_position": 1
            }
        ])
        
        # Future appointments
        for i in range(3):
            future_date = base_date + timedelta(days=i+1)
            appointments_data.append({
                "user_id": users[2+i%3].id,
                "service_center_id": service_centers[i%4].id,
                "appointment_type": [AppointmentType.new_application, AppointmentType.renewal, AppointmentType.correction][i],
                "appointment_date": future_date.date(),
                "scheduled_time": future_date.replace(hour=9+i, minute=0),
                "status": AppointmentStatus.scheduled,
                "ticket_number": f"{service_centers[i%4].code}-{3001+i}",
                "priority": Priority.normal
            })
        
        for appointment_data in appointments_data:
            appointment = Appointment(**appointment_data)
            db.add(appointment)
        
        db.commit()
        print("Sample data created successfully!")
        
        # Print login credentials
        print("\n" + "="*50)
        print("SAMPLE LOGIN CREDENTIALS")
        print("="*50)
        print("Admin User:")
        print("  Email: admin@example.com")
        print("  Password: admin123")
        print("\nStaff User:")
        print("  Email: staff@example.com")
        print("  Password: staff123")
        print("\nCitizen Users:")
        print("  Email: john.doe@example.com")
        print("  Password: user123")
        print("  Email: jane.smith@example.com")
        print("  Password: user123")
        print("  Email: mike.johnson@example.com")
        print("  Password: user123")
        print("="*50)
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_data()