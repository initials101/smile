import mongoose from 'mongoose';

const medicalHistorySchema = new mongoose.Schema({
  condition: {
    type: String,
    required: true,
    trim: true
  },
  diagnosedDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'chronic'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const allergySchema = new mongoose.Schema({
  allergen: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
    required: true
  },
  reaction: {
    type: String,
    trim: true
  }
}, { _id: true });

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    trim: true
  },
  frequency: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  prescribedBy: {
    type: String,
    trim: true
  }
}, { _id: true });

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  relationship: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  }
}, { _id: true });

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    required: true
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'United States',
      trim: true
    }
  },
  insurance: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    },
    subscriberName: {
      type: String,
      trim: true
    },
    expirationDate: {
      type: Date
    }
  },
  medicalHistory: [medicalHistorySchema],
  allergies: [allergySchema],
  currentMedications: [medicationSchema],
  emergencyContact: emergencyContactSchema,
  dentalHistory: {
    lastCleaning: {
      type: Date
    },
    lastXray: {
      type: Date
    },
    orthodonticTreatment: {
      type: Boolean,
      default: false
    },
    gumDisease: {
      type: Boolean,
      default: false
    },
    previousDentist: {
      name: {
        type: String,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      lastVisit: {
        type: Date
      }
    }
  },
  preferences: {
    communicationMethod: {
      type: String,
      enum: ['email', 'phone', 'sms'],
      default: 'email'
    },
    reminderPreference: {
      type: Boolean,
      default: true
    },
    marketingOptIn: {
      type: Boolean,
      default: false
    }
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for age calculation
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for full address
patientSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, zipCode } = this.address;
  return `${street}, ${city}, ${state} ${zipCode}`;
});

// Pre-save middleware to generate patient ID
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    const count = await mongoose.models.Patient.countDocuments();
    this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes for performance
patientSchema.index({ userId: 1 });
patientSchema.index({ patientId: 1 });
patientSchema.index({ 'address.zipCode': 1 });
patientSchema.index({ dateOfBirth: 1 });

export default mongoose.model('Patient', patientSchema);
