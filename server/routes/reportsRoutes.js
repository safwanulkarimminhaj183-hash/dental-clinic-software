import express from 'express';
import {
  getDoctorRevenueBreakdown,
  getSeasonalTreatmentTrends,
  getPaymentBreakdown,
  getPatientRetentionAnalytics,
  getLabEfficiencyAudit,
  getReportsSummary,
  // NEW REPORT MODULES
  getTreatmentReports,
  getRevenueExpenseReports,
  getPatientActivityReports,
  getInventoryReports,
  // NEW REPORT CATEGORIES
  getFinancialBillingReports,
  getTreatmentProcedureAnalytics,
  getAppointmentFlowReports,
  getPatientDemographicsReports,
} from '../controllers/reportsController.js';

const router = express.Router();

// ============================================================================
// FEATURE 1: Doctor-Wise Revenue Breakdown & ROI Pipeline
// ============================================================================
router.get('/doctor-revenue', getDoctorRevenueBreakdown);

// ============================================================================
// FEATURE 2: Seasonal Treatment & Disease Trend Forecasting
// ============================================================================
router.get('/seasonal-trends', getSeasonalTreatmentTrends);

// ============================================================================
// FEATURE 3: Payment Breakdown & Aging Accounts Receivable Report
// ============================================================================
router.get('/payment-breakdown', getPaymentBreakdown);

// ============================================================================
// FEATURE 4: Patient Retention & Lifetime Value (LTV) Analytics
// ============================================================================
router.get('/patient-retention', getPatientRetentionAnalytics);

// ============================================================================
// FEATURE 5: Lab Order Process Time & Efficiency Audit
// ============================================================================
router.get('/lab-efficiency', getLabEfficiencyAudit);

// ============================================================================
// COMPREHENSIVE SUMMARY (All Reports in One Call)
// ============================================================================
router.get('/summary', getReportsSummary);

// ============================================================================
// NEW REPORT MODULE 1: Treatment Reports
// ============================================================================
router.get('/treatments', getTreatmentReports);

// ============================================================================
// NEW REPORT MODULE 2: Revenue & Expense Reports
// ============================================================================
router.get('/financial/summary', getRevenueExpenseReports);

// ============================================================================
// NEW REPORT MODULE 3: Patient Activity Reports
// ============================================================================
router.get('/patients/summary', getPatientActivityReports);

// ============================================================================
// NEW REPORT MODULE 4: Inventory Reports
// ============================================================================
router.get('/inventory/summary', getInventoryReports);

// ============================================================================
// NEW REPORT CATEGORY 1: Financial & Billing Reports
// ============================================================================
router.get('/financial-billing', getFinancialBillingReports);

// ============================================================================
// NEW REPORT CATEGORY 2: Dental Treatment & Procedure Analytics
// ============================================================================
router.get('/treatment-procedure', getTreatmentProcedureAnalytics);

// ============================================================================
// NEW REPORT CATEGORY 3: Appointment & Patient Flow Reports
// ============================================================================
router.get('/appointment-flow', getAppointmentFlowReports);

// ============================================================================
// NEW REPORT CATEGORY 4: Patient Demographics & Growth
// ============================================================================
router.get('/patient-demographics', getPatientDemographicsReports);

export default router;
