import express from 'express';
import {
  // 1. Analytics (MongoDB Aggregation + Redis Cache)
  getAdminAnalytics,

  // 2. Dynamic Schedule & Slot Management
  getClinicSchedule,
  updateClinicSchedule,
  blockTimeSlot,
  unblockTimeSlot,
  getAvailableSlots,

  // 3. Prescription Generation (PDFKit + Nodemailer)
  createAndSendPrescription,
  getAllPrescriptions,
  downloadPrescriptionPDF,  resendPrescription,

  // 4. Financial Management & Payment Webhooks
  getFinancialSummary,
  handlePaymentWebhook,

  // 5. Appointment Management (Admin)
  getAllAppointmentsAdmin,
  updateAppointmentStatus,
  deleteAppointment,
} from '../controllers/adminDashboardController.js';

import { verifyToken, protect, isAdmin, isDoctor, isSuperAdmin } from '../middlewares/authMiddleware.js';
import { apiLimiter, bookingLimiter } from '../middleware/security.js';
import express_raw from 'express';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1 — RBAC + MongoDB Aggregation Analytics Hub
// @route  GET  /api/admin/dashboard/analytics
// @access Admin | Doctor | Receptionist | Super Admin
// @desc   Parallel $facet aggregation: revenue, appointments, patient growth,
//         popular treatments, monthly trends — cached in Redis (5-min TTL)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/dashboard/analytics',
  protect,         // verifyToken: validates JWT, attaches req.user
  isAdmin,         // RBAC: blocks 'patient' role from admin hub
  apiLimiter,      // Rate limiter: 100 req/15 min per IP
  getAdminAnalytics
);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — Dynamic Slot & Schedule Management
// @desc   Configure working hours, off-days, break times, dynamic booking slots
// ─────────────────────────────────────────────────────────────────────────────

// Public: Patient-facing slot availability check
router.get('/schedule/available-slots', getAvailableSlots);

// Protected: Admin-only schedule configuration
router.get(   '/schedule',              protect, isAdmin, getClinicSchedule);
router.post(  '/schedule',              protect, isAdmin, updateClinicSchedule);
router.post(  '/schedule/block-slot',   protect, isAdmin, blockTimeSlot);
router.delete('/schedule/unblock-slot', protect, isAdmin, unblockTimeSlot);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3 — Automated Digital Prescription (PDFKit + Nodemailer)
// @desc   Doctors write prescriptions → PDF generated → emailed to patient
// ─────────────────────────────────────────────────────────────────────────────
router.get( '/prescriptions',          protect, isAdmin,  getAllPrescriptions);
router.post('/prescriptions',          protect, isDoctor, createAndSendPrescription); // Doctor+ only
router.get( '/prescriptions/:id/pdf',  downloadPrescriptionPDF); 
router.post('/prescriptions/:id/resend', protect, isAdmin, resendPrescription);
router.post('/prescriptions/:id/resend', protect, isDoctor, resendPrescription); 
router.post('/prescriptions/:id/resend', protect, isDoctor, resendPrescription);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4 — Financial Management & Payment Webhooks
// @desc   Daily/monthly earnings, invoice tracking, Stripe/SSLCommerz webhooks
// ─────────────────────────────────────────────────────────────────────────────
router.get('/financials/summary', protect, isAdmin, getFinancialSummary);

// Webhook endpoint — NO auth middleware (webhook signatures provide security)
// In production, apply express.raw() middleware at the route level for Stripe
router.post('/financials/webhook', handlePaymentWebhook);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5 — Appointment Management (Admin CRUD)
// @desc   View all appointments, update status, cancel/delete
// ─────────────────────────────────────────────────────────────────────────────
router.get(   '/appointments',              protect, isAdmin,  getAllAppointmentsAdmin);
router.patch( '/appointments/:id/status',   protect, isAdmin,  updateAppointmentStatus);
router.delete('/appointments/:id',          protect, isSuperAdmin, deleteAppointment);

export default router;
