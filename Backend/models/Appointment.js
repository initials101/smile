import mongoose from 'mongoose';

const treatmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15
  },
  cost: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['cash', 'credit-card', 'debit-card', 'insurance', 'check', 'bank-transfer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    trim: true
  },
  insuranceClaim: {
    claimNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['submitted', 'approved', 'denied', 'pending'],
      default: 'pending'
    },
    approvedAmount: {
      type: Number,
      min: 0
    }
  },
  paidAt: {
    type: Date
  }
}, { _id: true, timestamps: true });

const reminderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'sms', 'phone'],
    required: true
  },
  sentAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  }
}, { _id: true });

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  dentist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dentist',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format']
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15
  },
  type: {
    type: String,
    enum: [
      'consultation',
      'cleaning',
      'checkup',
      'filling',
      'extraction',
      'root-canal',
      'crown',
      'bridge',
      'implant',
      'orthodontic',
      'cosmetic',
      'emergency',
      'follow-up',
      'other'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    trim: true
  },
  symptoms: [{
    type: String,
    trim: true
  }],
  treatments: [treatmentSchema],
  notes: {
    beforeAppointment: {
      type: String,
      trim: true
    },
    duringAppointment: {
      type: String,
      trim: true
    },
    afterAppointment: {
      type: String,
      trim: true
    },
    dentistNotes: {
      type: String,
      trim: true
    }
  },
  cost: {
    estimated: {
      type: Number,
      min: 0
    },
    actual: {
      type: Number,
      min: 0
    },
    insuranceCovered: {
      type: Number,
      min: 0,
      default: 0
    },
    patientPayment: {
      type: Number,
      min: 0
    }
  },
  payment: paymentSchema,
  reminders: [reminderSchema],
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    suggestedDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  },
  cancellation: {
    reason: {
      type: String,
      trim: true
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'dentist', 'staff', 'system'],
    },
    cancelledAt: {
      type: Date
    },
    refundAmount: {
      type: Number,
      min: 0
    }
  },
  rescheduling: {
    originalDate: {
      type: Date
    },
    originalTime: {
      type: String
    },
    reason: {
      type: String,
      trim: true
    },
    rescheduledBy: {
      type: String,
      enum: ['patient', 'dentist', 'staff', 'system']
    },
    rescheduledAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full appointment datetime
appointmentSchema.virtual('appointmentDateTime').get(function() {
  if (!this.appointmentDate || !this.startTime) return null;

  const date = new Date(this.appointmentDate);
  const [hours, minutes] = this.startTime.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);

  return date;
});

// Virtual for appointment end datetime
appointmentSchema.virtual('appointmentEndDateTime').get(function() {
  if (!this.appointmentDate || !this.endTime) return null;

  const date = new Date(this.appointmentDate);
  const [hours, minutes] = this.endTime.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);

  return date;
});

// Virtual for status badge color
appointmentSchema.virtual('statusColor').get(function() {
  const colors = {
    'scheduled': 'blue',
    'confirmed': 'green',
    'in-progress': 'yellow',
    'completed': 'green',
    'cancelled': 'red',
    'no-show': 'red',
    'rescheduled': 'orange'
  };
  return colors[this.status] || 'gray';
});

// Virtual for total cost
appointmentSchema.virtual('totalCost').get(function() {
  return this.treatments.reduce((total, treatment) => total + (treatment.cost || 0), 0);
});

// Pre-save middleware to generate appointment ID
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.models.Appointment.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    this.appointmentId = `APT${today}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Pre-save middleware to calculate duration
appointmentSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    this.duration = endTotalMinutes - startTotalMinutes;
  }
  next();
});

// Static method to check for conflicts
appointmentSchema.statics.checkConflict = async function(dentistId, appointmentDate, startTime, endTime, excludeId = null) {
  const query = {
    dentist: dentistId,
    appointmentDate,
    status: { $nin: ['cancelled', 'no-show'] },
    $or: [
      {
        $and: [
          { startTime: { $lt: endTime } },
          { endTime: { $gt: startTime } }
        ]
      }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflictingAppointment = await this.findOne(query);
  return conflictingAppointment;
};

// Method to send reminder
appointmentSchema.methods.sendReminder = async function(type) {
  const reminder = {
    type,
    sentAt: new Date(),
    status: 'sent'
  };

  this.reminders.push(reminder);
  await this.save();

  // Here you would integrate with email/SMS service
  console.log(`${type} reminder sent for appointment ${this.appointmentId}`);

  return reminder;
};

// Method to cancel appointment
appointmentSchema.methods.cancel = async function(reason, cancelledBy, refundAmount = 0) {
  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date(),
    refundAmount
  };

  await this.save();
};

// Method to reschedule appointment
appointmentSchema.methods.reschedule = async function(newDate, newStartTime, newEndTime, reason, rescheduledBy) {
  this.rescheduling = {
    originalDate: this.appointmentDate,
    originalTime: this.startTime,
    reason,
    rescheduledBy,
    rescheduledAt: new Date()
  };

  this.appointmentDate = newDate;
  this.startTime = newStartTime;
  this.endTime = newEndTime;
  this.status = 'rescheduled';

  await this.save();
};

// Indexes for performance
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ dentist: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentId: 1 });
appointmentSchema.index({ dentist: 1, appointmentDate: 1, startTime: 1 });

export default mongoose.model('Appointment', appointmentSchema);
