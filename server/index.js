import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

import authRoutes from './routes/authRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import patientRecordRoutes from './routes/patientRecordRoutes.js';
import specialistRoutes from './routes/specialistRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import telemedicineRoutes from './routes/telemedicineRoutes.js';
import dentalBlogRoutes from './routes/dentalBlogRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import smileGalleryRoutes from './routes/gallery/smileGalleryRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import clinicRoutes from './routes/clinicRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aboutRoutes from './routes/aboutRoutes.js';
import treatmentPlanRoutes from './routes/treatmentPlanRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import serviceFocusRoutes from './routes/serviceFocusRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import urgentAppointmentRoutes from './routes/urgentAppointmentRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import postOpRecoveryRoutes from './routes/postOpRecoveryRoutes.js';

import { securityHeaders, sanitizeData } from './middleware/security.js';
import { seedTreatmentPlans } from './seedTreatmentPlans.js';
import { initRedis } from './utils/cache.js';
import logger from './utils/logger.js';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      process.env.CLIENT_URL,
      'https://dental-software-three.vercel.app',
      'https://dental-software-cepkp0pgd-minhajdev.vercel.app',
      /\.vercel\.app$/
    ];

    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return origin === allowed;
    });

    if (isAllowed) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
};

// Security headers and NoSQL Data Sanitization middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(sanitizeData);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/appointment', appointmentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/v1/appointment', appointmentRoutes);
app.use('/api/v1/appointments', appointmentRoutes);

app.use('/api/availability', availabilityRoutes);
app.use('/api/v1/availability', availabilityRoutes);

app.use('/api/patient-records', patientRecordRoutes);
app.use('/api/v1/patient-records', patientRecordRoutes);

app.use('/api/specialists', specialistRoutes);
app.use('/api/v1/specialists', specialistRoutes);
app.use('/api/dentists', specialistRoutes);

app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use('/api/billing', billingRoutes);
app.use('/api/v1/billing', billingRoutes);

app.use('/api/telemedicine', telemedicineRoutes);
app.use('/api/v1/telemedicine', telemedicineRoutes);

app.use('/api/dental-blogs', dentalBlogRoutes);
app.use('/api/v1/dental-blogs', dentalBlogRoutes);
app.use('/api/blogs', dentalBlogRoutes);
app.use('/api/v1/blogs', dentalBlogRoutes);
app.use('/api/articles', dentalBlogRoutes);
app.use('/api/v1/articles', dentalBlogRoutes);

// Serve processed gallery images and patient uploads as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/gallery/processed',   express.static(path.join(__dirname, 'uploads', 'gallery', 'processed')));
app.use('/uploads/gallery/thumbnails',  express.static(path.join(__dirname, 'uploads', 'gallery', 'thumbnails')));

// Patient Help & Support
app.use('/api/support', supportRoutes);
app.use('/api/v1/support', supportRoutes);

// Smile Gallery & Case Management
app.use('/api/gallery', smileGalleryRoutes);
app.use('/api/v1/gallery', smileGalleryRoutes);

// Services & Service Details Flow
app.use('/api/services', serviceRoutes);
app.use('/api/v1/services', serviceRoutes);

// About Us → Our Clinic
app.use('/api/about', aboutRoutes);
app.use('/api/v1/about', aboutRoutes);
app.use('/api/clinic-info', clinicRoutes);
app.use('/api/v1/clinic-info', clinicRoutes);

// Contact Form Routes
app.use('/api/contact', contactRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/contacts', contactRoutes);

// Admin Analytics Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Advanced Treatment Plans Routes
app.use('/api/treatment-plans', treatmentPlanRoutes);
app.use('/api/v1/treatment-plans', treatmentPlanRoutes);

// Treatment Plan Enquiries Routes
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/v1/enquiries', enquiryRoutes);

// Booking and Payments Module Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/v1/bookings', bookingRoutes);

// Admin Dashboard Hub Routes (RBAC, MongoDB Aggregations, Schedule, Prescriptions, Financials, Socket.io)
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/v1/admin', adminDashboardRoutes);

// Dynamic Home Layout Routes
import homeRoutes from './routes/homeRoutes.js';
app.use('/api', homeRoutes);
app.use('/api/v1', homeRoutes);

// Audience-Based Patient Routes
app.use('/api/patients', patientRoutes);
app.use('/api/v1/patients', patientRoutes);

// Service Focus Routes
app.use('/api/service-focus', serviceFocusRoutes);
app.use('/api/v1/service-focus', serviceFocusRoutes);

// Multi-Location Branch & Doctor Routes
app.use('/api/branches', branchRoutes);
app.use('/api/v1/branches', branchRoutes);

// Urgency-Based Appointment Routes
app.use('/api/urgent-appointments', urgentAppointmentRoutes);
app.use('/api/v1/urgent-appointments', urgentAppointmentRoutes);

// Reports & Analytics Routes
import reportRoutes from './routes/reportsRoutes.js';
app.use('/api/reports', reportRoutes);
app.use('/api/v1/reports', reportRoutes);

// Post-Op Recovery (About Us → Patient Records → Post-Op Recovery)
app.use('/api/post-op-recovery', postOpRecoveryRoutes);
app.use('/api/v1/post-op-recovery', postOpRecoveryRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'DentoCare API running', status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  if (res.headersSent) return next(err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// ─── Start (Local Development Only) ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  logger.info('Starting DentoCare Server...');

  await connectDB();                          // wait for DB first
  await seedTreatmentPlans();                  // seed treatment plans if empty

  // Initialize Redis for caching
  initRedis();                                // init Redis (will log success/failure)

  // Only start server if not in Vercel serverless environment
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    logger.info('Running in serverless mode - export app instead of listening');
    return;
  }

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
};

// Start server for local development, but allow export for Vercel
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  start();
}

// Export for Vercel serverless
export default app;