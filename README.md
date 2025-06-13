# 🦷 SmileCare: Dental Clinic Management Backend

A modern, full-featured dental clinic management backend built with Node.js, Express.js, and MongoDB. SmileCare provides comprehensive APIs for managing patients, dentists, appointments, and clinic operations with enterprise-grade security and performance.

## ✨ Features

### 🧑‍⚕️ Patient Management
- Complete patient profiles with medical history
- Insurance information management
- Allergy and medication tracking
- Emergency contact information
- Appointment history and preferences

### 🦷 Dentist Management
- Professional profiles with credentials
- Specialization tracking
- Schedule and availability management
- Time-off requests and approvals
- Experience and rating systems

### 📅 Appointment System
- Intelligent booking with conflict prevention
- Real-time availability checking
- Appointment status tracking
- Rescheduling and cancellation
- Reminder notifications
- Treatment and cost tracking

### 🔐 Security & Authentication
- JWT-based authentication
- Role-based access control (Patient, Dentist, Staff, Admin)
- Password encryption with bcrypt
- Rate limiting and security headers
- Input validation and sanitization

### 📊 Advanced Features
- Comprehensive pagination and filtering
- Real-time statistics and reporting
- RESTful API design
- Error handling and logging
- Database optimization with indexes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5+
- npm or yarn

### Installation

1. **Clone and setup**
```bash
cd Backend
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Make sure MongoDB is running
# Seed the database with sample data
npm run seed
```

4. **Start Development Server**
```bash
npm run dev
# Server runs on http://localhost:5000
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
```
POST   /register         - Register new user
POST   /login           - User login
GET    /profile         - Get current user profile
PUT    /profile         - Update user profile
PUT    /change-password - Change password
PUT    /deactivate      - Deactivate account
GET    /stats           - User statistics (admin)
PUT    /activate/:id    - Activate user (admin)
```

### Patients (`/api/patients`)
```
GET    /                - Get all patients (paginated)
GET    /stats           - Patient statistics
GET    /:id             - Get patient by ID
GET    /patient-id/:id  - Get patient by patient ID
POST   /                - Create patient profile
PUT    /:id             - Update patient
PUT    /:id/medical     - Update medical info
POST   /:id/medical-history - Add medical history
POST   /:id/allergies   - Add allergy
POST   /:id/medications - Add medication
PUT    /:id/preferences - Update preferences
DELETE /:id             - Delete patient (admin)
```

### Dentists (`/api/dentists`)
```
GET    /                - Get all dentists (paginated)
GET    /stats           - Dentist statistics
GET    /:id             - Get dentist by ID
GET    /:id/availability- Get availability for date
POST   /                - Create dentist profile
PUT    /:id             - Update dentist
PUT    /:id/schedule    - Update schedule
POST   /:id/time-off    - Add time off request
PUT    /:id/time-off/:timeOffId - Approve/reject time off
DELETE /:id             - Delete dentist (admin)
```

### Appointments (`/api/appointments`)
```
GET    /                - Get appointments (paginated)
GET    /stats           - Appointment statistics
GET    /date-range      - Get by date range
GET    /:id             - Get appointment by ID
POST   /                - Create appointment
PUT    /:id             - Update appointment
PUT    /:id/cancel      - Cancel appointment
PUT    /:id/reschedule  - Reschedule appointment
PUT    /:id/confirm     - Confirm appointment
PUT    /:id/complete    - Complete appointment
POST   /:id/reminder    - Send reminder
DELETE /:id             - Delete appointment (admin)
```

## 🔑 Authentication & Authorization

### User Roles
- **Patient**: Can manage own profile and appointments
- **Dentist**: Can manage own schedule and assigned appointments
- **Staff**: Can manage patients, appointments, and basic operations
- **Admin**: Full system access

### JWT Token Usage
Include in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 📊 Database Schema

### User Model
```javascript
{
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  phone: String,
  role: Enum ['patient', 'dentist', 'admin', 'staff'],
  isActive: Boolean,
  profileId: ObjectId (references role-specific profile)
}
```

### Patient Model
```javascript
{
  userId: ObjectId (ref: User),
  patientId: String (auto-generated),
  dateOfBirth: Date,
  gender: Enum,
  address: Object,
  insurance: Object,
  medicalHistory: [Object],
  allergies: [Object],
  currentMedications: [Object],
  emergencyContact: Object,
  dentalHistory: Object,
  preferences: Object
}
```

### Dentist Model
```javascript
{
  userId: ObjectId (ref: User),
  dentistId: String (auto-generated),
  title: String,
  specializations: [String],
  credentials: [Object],
  experience: Object,
  schedule: {
    regularHours: [Object],
    timeOff: [Object],
    consultationDuration: Number,
    bufferTime: Number
  },
  contactInfo: Object,
  professionalInfo: Object,
  status: Enum,
  rating: Object
}
```

### Appointment Model
```javascript
{
  appointmentId: String (auto-generated),
  patient: ObjectId (ref: Patient),
  dentist: ObjectId (ref: Dentist),
  appointmentDate: Date,
  startTime: String,
  endTime: String,
  type: Enum,
  status: Enum,
  reason: String,
  symptoms: [String],
  treatments: [Object],
  notes: Object,
  cost: Object,
  payment: Object,
  reminders: [Object],
  followUp: Object
}
```

## 🔍 API Features

### Pagination
All list endpoints support pagination:
```
GET /api/patients?page=1&limit=10
```

### Filtering
Support for various filter types:
```
GET /api/patients?gender=male&age_min=25&age_max=65
GET /api/appointments?status=scheduled,confirmed&appointmentDate_from=2024-01-01
```

### Sorting
```
GET /api/dentists?sort=createdAt,-rating.average
```

### Search
```
GET /api/patients?search=john
```

## 🛡️ Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: express-validator
- **Security Headers**: Helmet.js
- **CORS Protection**: Configurable origins
- **MongoDB Injection Protection**: Mongoose sanitization

## 🧪 Sample Data

The system includes comprehensive seed data:

### Test Accounts
```
Admin:   admin@smilecare.com / admin123
Dentist: dr.smith@smilecare.com / dentist123
Dentist: dr.johnson@smilecare.com / dentist123
Patient: john.doe@email.com / patient123
Patient: jane.smith@email.com / patient123
Patient: mike.wilson@email.com / patient123
```

### Reseed Database
```bash
npm run seed
```

## 📝 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/smilecare
DB_NAME=smilecare

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
FRONTEND_URL=http://localhost:5173
```

## 🔧 Development

### Available Scripts
```bash
npm start        # Production server
npm run dev      # Development with nodemon
npm run seed     # Seed database with sample data
```

### Project Structure
```
Backend/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Mongoose models
├── routes/          # Express routes
├── utils/           # Utility functions
├── server.js        # Main server file
└── .env            # Environment variables
```

## 🚀 Production Deployment

1. **Environment Setup**
   - Set NODE_ENV=production
   - Configure production MongoDB URI
   - Set secure JWT_SECRET

2. **Security Considerations**
   - Use HTTPS in production
   - Configure proper CORS origins
   - Set up proper rate limiting
   - Enable MongoDB authentication

3. **Performance**
   - Database indexes are pre-configured
   - Connection pooling enabled
   - Compression middleware recommended

## 📈 Monitoring & Logs

- Request logging in development mode
- Error logging with stack traces
- Performance monitoring ready
- Health check endpoint at `/health`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/health`

---

**SmileCare** - Making dental clinic management effortless! 🦷✨
