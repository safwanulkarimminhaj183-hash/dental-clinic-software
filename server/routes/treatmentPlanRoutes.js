import express from 'express';
import {
  getTreatmentPlans,
  getTreatmentPlanById,
  trackTreatmentPlanClick,
  bookTreatmentPlan,
  enquireTreatmentPlan,
  createPaymentIntent,
  handleStripeWebhook,
  getTreatmentPlanAnalytics,
} from '../controllers/treatmentPlanController.js';
import {
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from '../controllers/enquiryController.js';
import { apiLimiter, bookingLimiter } from '../middleware/security.js';

const router = express.Router();

// General fetch with rate limiting
router.get('/', apiLimiter, getTreatmentPlans);

// Admin Insight Analytics endpoint
router.get('/analytics', getTreatmentPlanAnalytics);

// Treatment Plan Enquiries endpoints (fallback / direct path)
router.get('/enquiries', getEnquiries);
router.patch('/enquiries/:id/status', updateEnquiryStatus);
router.delete('/enquiries/:id', deleteEnquiry);

// Single plan details
router.get('/:id', getTreatmentPlanById);

// Click tracking endpoint (MongoDB $inc)
router.post('/:id/click', trackTreatmentPlanClick);

// Secure Treatment Booking (ACID Transactions & slot check)
router.post('/book', bookingLimiter, bookTreatmentPlan);

// Automated Notification Enquiry endpoint
router.post('/enquire', apiLimiter, enquireTreatmentPlan);

// Payment Gateway integration
router.post('/create-payment-intent', bookingLimiter, createPaymentIntent);

// Secure Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
