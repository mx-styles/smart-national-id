## 4.1 Introduction
The Smart e-National ID Queue Management platform streamlines the scheduling, enrollment, and issuance workflow for national identification services. Citizens reserve time slots online, administrators manage service centers and staffing, and field officers process queued appointments. The solution replaces walk-in queues with appointment-driven journeys, improving citizen experience, throughput, and operational visibility.

## 4.2 System Design (How will the system work?)
The system splits into a citizen-facing React web application, a FastAPI backend that enforces business rules, and a relational database that persists transactional records. Citizens authenticate, browse available service centers, select slots, and receive notifications. Administrators configure service center capacity, monitor queues, and view audit trails. Background workers send alerts and reconcile queue statistics. All components exchange JSON over HTTPS and rely on JWT-based authentication for state management.

### 4.2.1 Context Diagram and DFD of the proposed System
**External entities**: Citizens, Field Officers, National Identity Authority (NIA) administrators, Third-party notification providers (SMS/Email).

**High-level flows**:
- Citizens submit registration and appointment requests via the web portal.
- The frontend calls the FastAPI endpoints through the API gateway surface.
- The backend validates credentials, checks service center capacity, persists appointments, and pushes notification jobs.
- Administrators manage service centers, monitor queues, and approve exceptional cases.
- Notification services dispatch confirmations and reminders.

```
[Citizen Portal] ---> [FastAPI Application] ---> [Relational Database]
          |                  |                         |
          |                  v                         v
          |            [Notification Service]    [Analytics Dashboards]
          v
   [Admin Portal]
```

**Simplified data-flow narrative**:
1. A citizen submits an appointment request with personal data and preferred slot.
2. The FastAPI layer authenticates, validates slot availability, and stores the appointment.
3. Queue management rules calculate wait positions and update service center metrics.
4. Notification service triggers confirmation messages.
5. Administrators retrieve operational dashboards and can alter service center parameters.

## 4.3 Architectural design
The architecture follows a modular, service-oriented layout:
- **Presentation layer**: React SPA served over HTTPS, using context providers for auth state and reusable layout components.
- **API layer**: FastAPI application with routers (`auth`, `appointments`, `queue`, `admin`, `notifications`) enforcing domain logic and orchestrating workflows.
- **Domain layer**: Pydantic schemas for request/response validation and SQLAlchemy ORM models for persistence abstraction.
- **Services layer**: Dedicated services (e.g., `notification_service`, `audit_service`) encapsulate integrations and reusable business utilities.
- **Data layer**: SQLAlchemy-powered relational database (SQLite by default, extendable to PostgreSQL) with migrations and seed scripts.
- **Infrastructure layer**: Environment configuration, containerization options, and CI/CD pipelines for deployment to cloud infrastructure.

## 4.4 Physical design - How software and hardware interact
The deployment target is a cloud or on-premise data center with the following hardware-software map:
- **Web tier**: CDN or static file host (e.g., Azure Static Web Apps, AWS S3 + CloudFront) distributes the React build to citizen browsers.
- **Application tier**: Containerized FastAPI service hosted on a VM or managed Kubernetes cluster, fronted by an HTTPS load balancer.
- **Database tier**: Managed relational database service (PostgreSQL/Azure SQL) or self-hosted instance with automated backups.
- **Integration tier**: Optional Redis instance for background tasks, message queues, and rate-limiting; SMTP/SMS gateways for outbound notifications.
- **Hardware interactions**: Client devices (desktops, tablets, kiosks) access the SPA; backend servers operate within secured network segments communicating over TLS.

## 4.5 Database design (ER or Tables and EER diagram)
Key entities and relationships:
- `users` (id, fullname, email, password_hash, role, status)
- `service_centers` (id, name, city, address, opening_time, closing_time, daily_capacity, is_active)
- `appointments` (id, user_id, service_center_id, appointment_date, scheduled_time, status, queue_number)
- `notifications` (id, appointment_id, channel, template, status, sent_at)
- `audit_logs` (id, actor_id, action, entity_type, entity_id, metadata, created_at)
- `operating_times` (id, service_center_id, day_of_week, open_time, close_time)

Relationships:
- One `user` can book many `appointments` (1:M).
- Each `appointment` belongs to a `service_center` (M:1).
- `notifications` link to `appointments` (1:1 or 1:M depending on retries).
- `audit_logs` reference actors (users) and impacted entities.

The ER/EER diagram includes a `User` superclass with specialized roles (Citizen, Admin, Officer) and optional extension tables for role-specific data. The design supports future modules (biometric capture, document uploads) via auxiliary tables connected through foreign keys.

## 4.6 Program design (Package and class, collaboration or sequence diagram)
- **Package structure**:
  - `app.core`: configuration, database session management, security helpers.
  - `app.models`: SQLAlchemy ORM classes representing domain entities.
  - `app.schemas`: Pydantic models for API I/O contracts.
  - `app.routers`: FastAPI routers that map HTTP verbs to controller functions.
  - `app.services`: Reusable services (notifications, audit logging) invoked by routers.

- **Sequence overview (Book Appointment)**:
  1. React component calls `POST /appointments` with form payload.
  2. `appointments.router` validates JWT, parses request into Pydantic schema.
  3. Business rules check service center capacity and slot availability.
  4. Appointment persists via ORM; transaction commits.
  5. Notification service enqueues confirmation; HTTP response returns appointment summary.

## 4.7 Interface design
The UI follows a responsive layout with top navigation, sidebar for admins, and role-based views.

### 4.7.1 Menu design
#### 4.7.1.1 Main menu
- Dashboard
- Book Appointment
- My Queue
- Service Centers
- Profile
- Admin Panel (visible to admin/officer roles)

#### 4.7.1.2 Sub-menus
- **Admin Panel**: Queue Monitoring, Appointment Management, User Management, Service Center Settings, Audit Logs.
- **Profile**: Personal Details, Documents, Security Settings.

### 4.7.2 Input design (Include all input forms in the system)
- Citizen registration form (name, email, phone, password, security question).
- Login form (email, password).
- Appointment booking form (service center, date, time slot, service type).
- Queue check-in form (appointment code, verification OTP).
- Service center configuration form (operating hours, capacity, status).
- Notification template form (channel, subject, body, trigger conditions).
- User management form (role assignment, status toggles).

### 4.7.3 Output design (Include all output forms/reports in the system)
- Appointment confirmation and reminder messages (email/SMS).
- Dashboard widgets (daily appointments, queue length, no-show rate).
- Queue ticket printout or digital token.
- Service center performance reports (utilization, load vs capacity).
- Audit trail export (CSV/PDF).
- Notification delivery logs.

## 4.8 Pseudo Code
```
FUNCTION AuthenticateUser(email, password):
    user = repository.find_user_by_email(email)
    IF user IS NULL OR NOT verify_password(password, user.password_hash):
        RAISE AuthenticationError
    token_payload = { "sub": user.id, "role": user.role }
    RETURN issue_jwt(token_payload, expires_in=30 minutes)

FUNCTION BookAppointment(user_id, center_id, date, slot):
    ENSURE user_has_role(user_id, ["citizen", "admin"])
    center = repository.get_center(center_id)
    IF center.is_active IS FALSE:
        RAISE DomainError("Center offline")
    IF slot NOT IN generate_slots(center, date):
        RAISE DomainError("Slot invalid")
    IF repository.slot_is_taken(center_id, date, slot):
        RAISE DomainError("Slot booked")
    appointment = repository.create_appointment(user_id, center_id, date, slot)
    queue_number = queue_service.assign_position(center_id, date)
    notification_service.enqueue_confirmation(appointment.id)
    audit_service.record(user_id, "BOOK_APPOINTMENT", appointment.id)
    RETURN appointment WITH queue_number

FUNCTION UpdateQueueStatus(center_id):
    queue = repository.get_queue(center_id)
    FOR each entry IN queue ORDER BY queue_number:
        IF entry.status == "waiting" AND entry.scheduled_time <= current_time():
            queue_service.mark_active(entry)
        IF entry.status == "active" AND entry.completed:
            queue_service.mark_completed(entry)
    RETURN queue_service.summary(center_id)
```

## 4.9 Security design
Security is layered across physical, network, and operational controls to protect citizen data and ensure service reliability.

### 4.9.1 Physical security
- Host infrastructure in certified data centers with controlled access and surveillance.
- Enforce redundant power, fire suppression, and environmental controls for uptime.
- Restrict on-premise administrative consoles to secure rooms with RFID or biometric access.

### 4.9.2 Network security
- Terminate all traffic through TLS 1.2+ load balancers with Web Application Firewall rules.
- Segment application, database, and management networks; disallow public database exposure.
- Apply rate limiting and bot protection on authentication and appointment endpoints.
- Use VPNs or private links for admin access and third-party integrations.

### 4.9.3 Operational security
- Enforce MFA for administrative users and support role-based access control across modules.
- Rotate JWT secret keys and database credentials using a secrets manager.
- Enable audit logging, anomaly detection, and regular review of privileged actions.
- Schedule backups, vulnerability scans, and dependency patch management.

## 4.10 Conclusion
The Smart e-National ID Queue Management solution integrates a scalable web frontend, resilient API layer, and auditable data backbone to modernize national ID service delivery. The proposed architecture, data model, and security posture support phased rollout, future biometric integrations, and compliance with government digital service standards while delivering a consistent citizen experience.