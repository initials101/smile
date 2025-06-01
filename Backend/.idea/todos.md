# SmileCare Backend Development Todos

## Project Setup
- [x] Initialize package.json with ESModules support
- [x] Install core dependencies (express, mongoose, jsonwebtoken, bcryptjs, dotenv)
- [x] Install dev dependencies (nodemon)
- [x] Create folder structure (models, controllers, routes, middleware, config)
- [x] Set up environment variables template

## Database Models
- [ ] Create User/Auth model
- [ ] Create Patient model
- [ ] Create Dentist model
- [ ] Create Appointment model
- [ ] Add indexes for optimization

## Core Infrastructure
- [ ] Set up Express server (server.js)
- [ ] Configure MongoDB connection
- [ ] Implement JWT auth middleware
- [ ] Add error handling middleware
- [ ] Add logging middleware
- [ ] Add CORS and security middleware

## API Endpoints - Authentication
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] GET /api/auth/profile
- [ ] PUT /api/auth/profile

## API Endpoints - Patients
- [ ] GET /api/patients (with pagination/filtering)
- [ ] GET /api/patients/:id
- [ ] POST /api/patients
- [ ] PUT /api/patients/:id
- [ ] DELETE /api/patients/:id

## API Endpoints - Dentists
- [ ] GET /api/dentists (with pagination/filtering)
- [ ] GET /api/dentists/:id
- [ ] POST /api/dentists
- [ ] PUT /api/dentists/:id
- [ ] DELETE /api/dentists/:id
- [ ] GET /api/dentists/:id/availability
- [ ] PUT /api/dentists/:id/schedule

## API Endpoints - Appointments
- [ ] GET /api/appointments (with pagination/filtering by date/dentist/patient)
- [ ] GET /api/appointments/:id
- [ ] POST /api/appointments
- [ ] PUT /api/appointments/:id
- [ ] DELETE /api/appointments/:id
- [ ] GET /api/appointments/availability

## Advanced Features
- [ ] Input validation and sanitization
- [ ] Rate limiting
- [ ] API documentation setup
- [ ] Database seeding script
- [ ] Comprehensive error messages
- [ ] Appointment conflict prevention

## Testing & Documentation
- [ ] Test all endpoints
- [ ] Create API documentation
- [ ] Add example requests/responses
- [ ] Performance optimization
