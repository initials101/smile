import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Dentist from '../models/Dentist.js';
import Appointment from '../models/Appointment.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Dentist.deleteMany({});
    await Appointment.deleteMany({});

    console.log('📭 Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      email: 'admin@smilecare.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1-555-0001',
      role: 'admin'
    });

    console.log('👤 Created admin user');

    // Create dentist users and profiles
    const dentistUsers = await User.insertMany([
      {
        email: 'dr.smith@smilecare.com',
        password: 'dentist123',
        firstName: 'John',
        lastName: 'Smith',
        phone: '+1-555-0101',
        role: 'dentist'
      },
      {
        email: 'dr.johnson@smilecare.com',
        password: 'dentist123',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+1-555-0102',
        role: 'dentist'
      }
    ]);

    const dentists = await Dentist.insertMany([
      {
        userId: dentistUsers[0]._id,
        title: 'Dr.',
        specializations: ['general-dentistry', 'cosmetic-dentistry'],
        credentials: [
          {
            type: 'degree',
            name: 'Doctor of Dental Surgery',
            issuingAuthority: 'Harvard School of Dental Medicine',
            issueDate: new Date('2015-05-15'),
            isActive: true
          }
        ],
        experience: {
          yearsOfPractice: 8
        },
        schedule: {
          regularHours: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
            { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', isActive: true }
          ],
          consultationDuration: 30,
          bufferTime: 15
        },
        professionalInfo: {
          bio: 'Dr. Smith specializes in general and cosmetic dentistry with over 8 years of experience.',
          languages: ['English', 'Spanish']
        },
        status: 'active'
      },
      {
        userId: dentistUsers[1]._id,
        title: 'Dr.',
        specializations: ['orthodontics', 'pediatric-dentistry'],
        credentials: [
          {
            type: 'degree',
            name: 'Doctor of Dental Medicine',
            issuingAuthority: 'University of California San Francisco',
            issueDate: new Date('2012-06-20'),
            isActive: true
          }
        ],
        experience: {
          yearsOfPractice: 11
        },
        schedule: {
          regularHours: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isActive: true },
            { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', isActive: true },
            { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isActive: true },
            { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', isActive: true },
            { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', isActive: true }
          ],
          consultationDuration: 45,
          bufferTime: 15
        },
        professionalInfo: {
          bio: 'Dr. Johnson is an experienced orthodontist specializing in pediatric care.',
          languages: ['English']
        },
        status: 'active'
      }
    ]);

    // Update dentist users with profile IDs
    await User.findByIdAndUpdate(dentistUsers[0]._id, { profileId: dentists[0]._id });
    await User.findByIdAndUpdate(dentistUsers[1]._id, { profileId: dentists[1]._id });

    console.log('🦷 Created dentist users and profiles');

    // Create patient users and profiles
    const patientUsers = await User.insertMany([
      {
        email: 'john.doe@email.com',
        password: 'patient123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-0201',
        role: 'patient'
      },
      {
        email: 'jane.smith@email.com',
        password: 'patient123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1-555-0202',
        role: 'patient'
      },
      {
        email: 'mike.wilson@email.com',
        password: 'patient123',
        firstName: 'Mike',
        lastName: 'Wilson',
        phone: '+1-555-0203',
        role: 'patient'
      }
    ]);

    const patients = await Patient.insertMany([
      {
        userId: patientUsers[0]._id,
        dateOfBirth: new Date('1985-03-15'),
        gender: 'male',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102'
        },
        insurance: {
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'BC123456789',
          subscriberName: 'John Doe'
        },
        emergencyContact: {
          name: 'Mary Doe',
          relationship: 'spouse',
          phone: '+1-555-0301'
        },
        medicalHistory: [
          {
            condition: 'Hypertension',
            diagnosedDate: new Date('2020-01-15'),
            status: 'active'
          }
        ],
        allergies: [
          {
            allergen: 'Penicillin',
            severity: 'moderate',
            reaction: 'Rash'
          }
        ]
      },
      {
        userId: patientUsers[1]._id,
        dateOfBirth: new Date('1990-07-22'),
        gender: 'female',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210'
        },
        insurance: {
          provider: 'Aetna',
          policyNumber: 'AET987654321',
          subscriberName: 'Jane Smith'
        },
        emergencyContact: {
          name: 'Robert Smith',
          relationship: 'father',
          phone: '+1-555-0302'
        }
      },
      {
        userId: patientUsers[2]._id,
        dateOfBirth: new Date('1978-11-03'),
        gender: 'male',
        address: {
          street: '789 Pine St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101'
        },
        emergencyContact: {
          name: 'Lisa Wilson',
          relationship: 'spouse',
          phone: '+1-555-0303'
        }
      }
    ]);

    // Update patient users with profile IDs
    await User.findByIdAndUpdate(patientUsers[0]._id, { profileId: patients[0]._id });
    await User.findByIdAndUpdate(patientUsers[1]._id, { profileId: patients[1]._id });
    await User.findByIdAndUpdate(patientUsers[2]._id, { profileId: patients[2]._id });

    console.log('👥 Created patient users and profiles');

    // Create sample appointments
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await Appointment.insertMany([
      {
        patient: patients[0]._id,
        dentist: dentists[0]._id,
        appointmentDate: tomorrow,
        startTime: '10:00',
        endTime: '10:30',
        type: 'checkup',
        reason: 'Regular dental checkup',
        status: 'scheduled',
        priority: 'normal'
      },
      {
        patient: patients[1]._id,
        dentist: dentists[1]._id,
        appointmentDate: nextWeek,
        startTime: '14:00',
        endTime: '15:00',
        type: 'consultation',
        reason: 'Orthodontic consultation',
        status: 'confirmed',
        priority: 'normal'
      },
      {
        patient: patients[2]._id,
        dentist: dentists[0]._id,
        appointmentDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        startTime: '11:30',
        endTime: '12:00',
        type: 'cleaning',
        reason: 'Dental cleaning and fluoride treatment',
        status: 'scheduled',
        priority: 'normal'
      }
    ]);

    console.log('📅 Created sample appointments');

    console.log(`
🎉 Database seeding completed successfully!

📋 Summary:
- 1 Admin user
- 2 Dentists with profiles
- 3 Patients with profiles
- 3 Sample appointments

🔑 Login credentials:
Admin: admin@smilecare.com / admin123
Dentist: dr.smith@smilecare.com / dentist123
Dentist: dr.johnson@smilecare.com / dentist123
Patient: john.doe@email.com / patient123
Patient: jane.smith@email.com / patient123
Patient: mike.wilson@email.com / patient123
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData();
}

export default seedData;
