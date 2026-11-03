import express from 'express';
import {
  // Tooth Lifecycle Tracking
  getToothHistory,
  addToothTimeline,
  // Lab Work Order Tracking
  createLabOrder,
  updateLabOrderStatus,
  updateLabOrderDetails,
    deleteLabOrder,
  getLabOrders,
  // Post-Op Recovery Tracking
  createPostOpRecovery,
  updatePostOpRecovery,
  getUrgentFollowUps,
  // Patient Compliance Analytics
  getComplianceStatus,
  getHighRiskPatients,
} from '../controllers/advancedDentalFeaturesController.js';

const router = express.Router();

// ============================================================================
// TOOTH LIFECYCLE TRACKING ROUTES
// ============================================================================

// Get history for a specific tooth
router.get('/:id/tooth/:toothNumber', getToothHistory);

// Add procedure to tooth timeline
router.post('/:id/tooth/:toothNumber/timeline', addToothTimeline);

// ============================================================================
// LAB WORK ORDER TRACKING ROUTES
// ============================================================================

// Create new lab order
router.post('/:id/lab-orders', createLabOrder);

// Get all lab orders for a patient
router.get('/:id/lab-orders', getLabOrders);

// Update lab order status (status / cabinet location only)
router.put('/:id/lab-orders/:orderId', updateLabOrderStatus);

// Edit full lab order details (Edit Order form)
router.patch('/:id/lab-orders/:orderId', updateLabOrderDetails);

// Delete a lab order
router.delete('/:id/lab-orders/:orderId', deleteLabOrder);



// ============================================================================
// POST-OP RECOVERY TRACKING ROUTES
// ============================================================================

// Create post-op recovery record
router.post('/:id/post-op-recovery', createPostOpRecovery);

// Update post-op recovery with patient feedback
router.put('/:id/post-op-recovery/:recoveryId', updatePostOpRecovery);

// Get all patients with urgent follow-up flags
router.get('/urgent-follow-ups', getUrgentFollowUps);

// ============================================================================
// PATIENT COMPLIANCE ANALYTICS ROUTES
// ============================================================================

// Get patient compliance status
router.get('/:id/compliance-status', getComplianceStatus);

// Get all high-risk patients
router.get('/high-risk-patients', getHighRiskPatients);

export default router;