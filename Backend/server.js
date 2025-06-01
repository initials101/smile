import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"

// Import configurations
import connectDB from "./config/database.js"

// Import middleware
import { errorHandler, notFound } from "./middleware/errorHandler.js"
import { requestLogger } from "./middleware/debugMiddleware.js"

// Import routes
import authRoutes from "./routes/auth.js"
import patientRoutes from "./routes/patients.js"
import dentistRoutes from "./routes/dentists.js"
import appointmentRoutes from "./routes/appointments.js"

// Load environment variables
dotenv.config()

// Connect to database
connectDB()

// Create Express app
const app = express()

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1)

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// Body parser middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Add debug middleware in development
if (process.env.NODE_ENV === "development") {
  app.use(requestLogger)
} else {
  // Simple request logging middleware for production
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
    next()
  })
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SmileCare API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/patients", patientRoutes)
app.use("/api/dentists", dentistRoutes)
app.use("/api/appointments", appointmentRoutes)

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to SmileCare Dental Clinic Management API",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      patients: "/api/patients",
      dentists: "/api/dentists",
      appointments: "/api/appointments",
    },
    timestamp: new Date().toISOString(),
  })
})

// Handle undefined routes
app.use(notFound)

// Global error handler
app.use(errorHandler)

// Start server
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
🦷 SmileCare API Server is running!
📍 Server: http://localhost:${PORT}
🔧 Environment: ${process.env.NODE_ENV}
📊 Database: ${process.env.MONGODB_URI ? "Connected" : "Not configured"}
🕐 Started at: ${new Date().toISOString()}
  `)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log("Unhandled Rejection at:", promise, "reason:", err)
  // Close server & exit process
  server.close(() => {
    process.exit(1)
  })
})

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err)
  process.exit(1)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...")
  server.close(() => {
    console.log("Process terminated")
  })
})

export default app
