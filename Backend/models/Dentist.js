import mongoose from "mongoose"

const credentialSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["degree", "certification", "license"],
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expirationDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
)

const availabilitySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // 0 = Sunday, 6 = Saturday
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format"],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
)

const timeOffSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      enum: ["vacation", "sick-leave", "conference", "personal", "other"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true },
)

const dentistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dentistId: {
      type: String,
      unique: true,
      // Remove required: true since we generate it in pre-save
      default: () => `DEN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
    },
    title: {
      type: String,
      enum: ["Dr.", "DDS", "DMD", "MS", "PhD"],
      default: "Dr.",
    },
    specializations: [
      {
        type: String,
        enum: [
          "general-dentistry",
          "orthodontics",
          "periodontics",
          "endodontics",
          "oral-surgery",
          "prosthodontics",
          "pediatric-dentistry",
          "cosmetic-dentistry",
          "oral-pathology",
          "dental-implants",
        ],
      },
    ],
    credentials: [credentialSchema],
    experience: {
      yearsOfPractice: {
        type: Number,
        min: 0,
        default: 0,
      },
      previousWorkplaces: [
        {
          name: {
            type: String,
            trim: true,
          },
          position: {
            type: String,
            trim: true,
          },
          startDate: {
            type: Date,
          },
          endDate: {
            type: Date,
          },
          description: {
            type: String,
            trim: true,
          },
        },
      ],
    },
    schedule: {
      regularHours: [availabilitySlotSchema],
      timeOff: [timeOffSchema],
      consultationDuration: {
        type: Number,
        default: 30, // minutes
        min: 15,
        max: 120,
      },
      bufferTime: {
        type: Number,
        default: 15, // minutes between appointments
        min: 0,
        max: 60,
      },
    },
    contactInfo: {
      officePhone: {
        type: String,
        match: [/^\+?[\d\s\-$$$$]+$/, "Please enter a valid phone number"],
      },
      emergencyPhone: {
        type: String,
        match: [/^\+?[\d\s\-$$$$]+$/, "Please enter a valid phone number"],
      },
      officeAddress: {
        street: {
          type: String,
          trim: true,
        },
        city: {
          type: String,
          trim: true,
        },
        state: {
          type: String,
          trim: true,
        },
        zipCode: {
          type: String,
          trim: true,
        },
      },
    },
    professionalInfo: {
      bio: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      languages: [
        {
          type: String,
          trim: true,
        },
      ],
      awards: [
        {
          name: {
            type: String,
            trim: true,
          },
          year: {
            type: Number,
          },
          description: {
            type: String,
            trim: true,
          },
        },
      ],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on-leave", "suspended"],
      default: "active",
    },
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for full name with title
dentistSchema.virtual("fullNameWithTitle").get(function () {
  if (this.userId && this.userId.firstName && this.userId.lastName) {
    return `${this.title} ${this.userId.firstName} ${this.userId.lastName}`
  }
  return this.title
})

// Virtual for active credentials
dentistSchema.virtual("activeCredentials").get(function () {
  return this.credentials.filter((cred) => cred.isActive)
})

// Pre-save middleware to generate dentist ID if not already set
dentistSchema.pre("save", async function (next) {
  if (!this.dentistId || this.dentistId.includes("DEN" + Date.now())) {
    try {
      const count = await mongoose.models.Dentist.countDocuments()
      this.dentistId = `DEN${String(count + 1).padStart(4, "0")}`
    } catch (error) {
      // Fallback to timestamp-based ID if count fails
      this.dentistId = `DEN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
    }
  }
  next()
})

// Method to check if dentist is available at specific time
dentistSchema.methods.isAvailableAt = function (date, startTime, endTime) {
  const dayOfWeek = date.getDay()
  const regularHours = this.schedule.regularHours.find((slot) => slot.dayOfWeek === dayOfWeek && slot.isActive)

  if (!regularHours) return false

  // Check if requested time is within regular hours
  const slotStart = regularHours.startTime
  const slotEnd = regularHours.endTime

  if (startTime < slotStart || endTime > slotEnd) return false

  // Check for time off
  const requestDate = date.toISOString().split("T")[0]
  const hasTimeOff = this.schedule.timeOff.some((timeOff) => {
    const startDate = timeOff.startDate.toISOString().split("T")[0]
    const endDate = timeOff.endDate.toISOString().split("T")[0]
    return requestDate >= startDate && requestDate <= endDate && timeOff.isApproved
  })

  return !hasTimeOff
}

// Method to get available time slots for a specific date
dentistSchema.methods.getAvailableSlots = function (date) {
  const dayOfWeek = date.getDay()
  const regularHours = this.schedule.regularHours.find((slot) => slot.dayOfWeek === dayOfWeek && slot.isActive)

  if (!regularHours) return []

  // Check for time off
  const requestDate = date.toISOString().split("T")[0]
  const hasTimeOff = this.schedule.timeOff.some((timeOff) => {
    const startDate = timeOff.startDate.toISOString().split("T")[0]
    const endDate = timeOff.endDate.toISOString().split("T")[0]
    return requestDate >= startDate && requestDate <= endDate && timeOff.isApproved
  })

  if (hasTimeOff) return []

  // Generate time slots based on consultation duration and buffer time
  const slots = []
  const duration = this.schedule.consultationDuration
  const buffer = this.schedule.bufferTime
  const totalSlotTime = duration + buffer

  const [startHour, startMinute] = regularHours.startTime.split(":").map(Number)
  const [endHour, endMinute] = regularHours.endTime.split(":").map(Number)

  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += totalSlotTime) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    slots.push(timeString)
  }

  return slots
}

// Indexes for performance
dentistSchema.index({ userId: 1 })
dentistSchema.index({ dentistId: 1 })
dentistSchema.index({ specializations: 1 })
dentistSchema.index({ status: 1 })
dentistSchema.index({ "schedule.regularHours.dayOfWeek": 1 })

export default mongoose.model("Dentist", dentistSchema)
