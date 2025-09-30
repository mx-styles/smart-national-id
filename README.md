# Smart e-National ID Queue Management System

A comprehensive digital queue management solution for ID registration centers in Zimbabwe, addressing the challenges of long queues by providing online appointment booking, real-time queue status updates, and efficient service delivery management.

## 🌟 Features

### For Citizens
- **User Registration & Authentication** - Secure account creation with JWT-based authentication
- **Online Appointment Booking** - Schedule appointments at preferred service centers
- **Real-time Queue Status** - Live updates on queue position and estimated wait times
- **Digital Ticket System** - QR-coded tickets with appointment details
- **SMS/Email Notifications** - Automated notifications for appointment reminders and updates
- **Multi-service Support** - New applications, renewals, replacements, corrections, and collections

### For Staff/Admin
- **Queue Management Dashboard** - Real-time view of current queue status
- **Appointment Management** - Call next customer, update service status
- **Daily Analytics** - Monitor appointment statistics and service efficiency
- **Service Center Management** - Manage capacity and operating hours
- **Customer Service Tools** - Handle special requirements and priority cases
- **Audit Trail** - Complete logging of all system activities for transparency

### Technical Features
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates** - WebSocket integration for live queue status
- **Role-based Access Control** - Secure separation between citizen and admin functions
- **RESTful API** - Well-documented API for potential third-party integrations
- **Database Migrations** - Easy deployment and database schema management
- **Background Tasks** - Automated notification processing

## 🏗️ Tech Stack

- **Frontend**: React 18 with TypeScript, Material-UI, React Router
- **Backend**: FastAPI with Python 3.8+, SQLAlchemy ORM
- **Database**: SQLite (development), easily upgradeable to PostgreSQL
- **Authentication**: JWT tokens with secure password hashing
- **Real-time Communication**: WebSocket integration
- **Notifications**: SMS/Email integration ready (Twilio, SendGrid compatible)
- **Task Queue**: Celery with Redis for background processing

## 📁 Project Structure

```
Smart_e-National_ID/
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── core/               # Core configuration
│   │   │   ├── config.py       # App settings
│   │   │   ├── database.py     # Database configuration
│   │   │   └── security.py     # Authentication & JWT
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── user.py         # User model
│   │   │   ├── appointment.py  # Appointment model
│   │   │   ├── service_center.py # Service center model
│   │   │   ├── notification.py # Notification model
│   │   │   └── audit_log.py    # Audit logging
│   │   ├── routers/            # API endpoints
│   │   │   ├── auth.py         # Authentication routes
│   │   │   ├── appointments.py # Appointment management
│   │   │   ├── queue.py        # Queue management
│   │   │   ├── admin.py        # Admin functions
│   │   │   └── notifications.py # Notification system
│   │   └── services/           # Business logic
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── seed_data.py           # Database seeding script
│   └── .env.example           # Environment variables template
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── auth/          # Authentication components
│   │   │   └── Layout.tsx     # Main layout component
│   │   ├── pages/             # Main page components
│   │   │   ├── Dashboard.js   # User dashboard
│   │   │   ├── BookAppointment.js # Appointment booking
│   │   │   ├── MyQueue.js     # Queue status page
│   │   │   └── AdminDashboard.tsx # Admin interface
│   │   ├── context/           # React context for state management
│   │   │   └── AuthContext.js # Authentication state
│   │   └── services/          # API integration
│   │       └── api.js         # HTTP client configuration
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Frontend environment variables
├── setup.sh                   # Unix setup script
├── setup.bat                  # Windows setup script
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git** for version control

### Option 1: Automated Setup (Recommended)

**For Windows:**
```cmd
git clone <repository-url>
cd Smart_e-National_ID
setup.bat
```

**For Unix/Linux/Mac:**
```bash
git clone <repository-url>
cd Smart_e-National_ID
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Unix/Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env file with your configuration
#   - Update `ALLOWED_ORIGINS` with the domains that should talk to the API

# Create database and sample data
python seed_data.py

# Start the server
uvicorn main:app --reload
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Interactive API Docs**: http://localhost:8000/redoc

## 👤 Sample Login Credentials

### Admin User
- **Email**: admin@example.com
- **Password**: admin123
- **Access**: Full system administration

### Staff User
- **Email**: staff@example.com
- **Password**: staff123
- **Access**: Queue management and customer service

### Citizen Users
- **Email**: john.doe@example.com
- **Password**: user123

- **Email**: jane.smith@example.com
- **Password**: user123

- **Email**: mike.johnson@example.com
- **Password**: user123

## 📊 Sample Service Centers

The system includes pre-configured service centers:

1. **Harare Central Registry** (HAR001)
   - Location: Corner Fourth Street and Central Avenue, Harare
   - Capacity: 150 appointments/day

2. **Bulawayo Regional Office** (BUL001)
   - Location: Main Street, City Center, Bulawayo
   - Capacity: 100 appointments/day

3. **Mutare Provincial Office** (MUT001)
   - Location: Herbert Chitepo Street, Mutare
   - Capacity: 80 appointments/day

4. **Gweru Service Center** (GWE001)
   - Location: Main Street, Gweru
   - Capacity: 60 appointments/day

## 🔧 Configuration

### Backend Configuration (backend/.env)
```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./queue_management.db
DEBUG=True
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_ORIGINS=["http://localhost:3000"]

# Optional: SMS/Email Integration
SMS_API_KEY=your-twilio-key
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Frontend Configuration (frontend/.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_APP_NAME=Smart e-National ID Queue Management
```

## 📱 API Documentation

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Appointment Endpoints
- `GET /appointments/my` - Get user's appointments
- `POST /appointments/book` - Book new appointment
- `PUT /appointments/{id}/cancel` - Cancel appointment

### Queue Management
- `GET /queue/status/{center_id}` - Get queue status
- `POST /queue/checkin/{appointment_id}` - Check in for appointment
- `GET /queue/position/{appointment_id}` - Get queue position

### Admin Endpoints
- `GET /admin/queue/{center_id}` - Manage queue
- `POST /admin/queue/{center_id}/next` - Call next customer
- `PUT /admin/appointments/{id}/complete` - Complete service

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt encryption for passwords
- **Role-based Access Control** - Separate permissions for citizens, staff, and admin
- **CORS Protection** - Configurable cross-origin request handling
- **Input Validation** - Comprehensive request validation
- **Audit Logging** - Complete activity tracking for transparency

## 🚀 Deployment

### Production Considerations

1. **Database**: Upgrade to PostgreSQL for production
```env
DATABASE_URL=postgresql://user:password@localhost/queue_management
```

2. **Environment Variables**: Update with production values
3. **SSL/HTTPS**: Configure reverse proxy (nginx) with SSL
4. **Background Tasks**: Setup Redis and Celery workers
5. **Monitoring**: Implement logging and monitoring solutions

### Docker Deployment (Future Enhancement)
```dockerfile
# Docker support can be added for containerized deployment
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Future Enhancements

- **Biometric Integration** - Fingerprint authentication
- **SMS Gateway Integration** - Real SMS notifications via local providers
- **Mobile Application** - Native mobile apps for iOS and Android
- **Payment Integration** - Online fee payment system
- **Document Upload** - Digital document submission
- **Multi-language Support** - Shona, Ndebele, and English
- **Analytics Dashboard** - Advanced reporting and analytics
- **API Rate Limiting** - Enhanced security and performance
- **Offline Mode** - PWA capabilities for offline access

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Email: support@example.com
- Documentation: Check the `/docs` endpoint when the API is running

## 🙏 Acknowledgments

- Zimbabwe Registry Office for domain expertise
- FastAPI community for excellent framework
- React and Material-UI teams for frontend tools
- Contributors who helped test and improve the system

---

**Built with ❤️ for the people of Zimbabwe** 🇿🇼