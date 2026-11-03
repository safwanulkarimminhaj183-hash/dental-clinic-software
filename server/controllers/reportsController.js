import Appointment from '../models/Appointment.js';
import PatientRecord from '../models/PatientRecord.js';
import Billing from '../models/Billing.js';

// ============================================================================
// FEATURE 1: Doctor-Wise Revenue Breakdown & ROI Pipeline
// ============================================================================

// ============================================================================
// FEATURE 1: Doctor-Wise Revenue Breakdown & ROI Pipeline
// ============================================================================

/**
 * @desc    Get doctor-wise revenue breakdown and ROI analysis
 * @route   GET /api/reports/doctor-revenue
 * @access  Admin
 */
export const getDoctorRevenueBreakdown = async (req, res) => {
  try {
    // Aggregate revenue by doctor from PatientRecords (treatments)
    const doctorRevenue = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      {
        $group: {
          _id: '$pastTreatments.doctorName',
          totalTreatments: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
          avgTreatmentCost: { $avg: '$pastTreatments.cost' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Calculate ROI by subtracting estimated lab costs (assuming 30% of revenue goes to lab)
    const doctorROI = doctorRevenue.map(doctor => {
      const estimatedLabCost = doctor.totalRevenue * 0.30;
      const operationalCost = doctor.totalRevenue * 0.20; // 20% for operations
      const netProfit = doctor.totalRevenue - estimatedLabCost - operationalCost;
      const roiPercentage = doctor.totalRevenue > 0 
        ? ((netProfit / doctor.totalRevenue) * 100).toFixed(2) 
        : 0;

      return {
        doctorName: doctor._id,
        totalTreatments: doctor.totalTreatments,
        totalRevenue: doctor.totalRevenue,
        avgTreatmentCost: doctor.avgTreatmentCost,
        estimatedLabCost,
        operationalCost,
        netProfit,
        roiPercentage: parseFloat(roiPercentage),
      };
    });

    return res.status(200).json({
      success: true,
      data: doctorROI,
    });
  } catch (error) {
    console.error('Error fetching doctor revenue breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor revenue breakdown.',
    });
  }
};

// ============================================================================
// FEATURE 2: Seasonal Treatment & Disease Trend Forecasting
// ============================================================================

/**
 * @desc    Get seasonal treatment trends over 12-24 months
 * @route   GET /api/reports/seasonal-trends
 * @access  Admin
 */
export const getSeasonalTreatmentTrends = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Aggregate treatments by month and procedure type
    const treatmentTrends = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      {
        $match: {
          'pastTreatments.treatmentDate': {
            $gte: startDate,
            $lte: new Date(),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$pastTreatments.treatmentDate' },
            month: { $month: '$pastTreatments.treatmentDate' },
            procedure: '$pastTreatments.procedure',
          },
          count: { $sum: 1 },
          totalCost: { $sum: '$pastTreatments.cost' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Group by procedure type for summary
    const procedureSummary = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      {
        $match: {
          'pastTreatments.treatmentDate': {
            $gte: startDate,
            $lte: new Date(),
          },
        },
      },
      {
        $group: {
          _id: '$pastTreatments.procedure',
          count: { $sum: 1 },
          totalCost: { $sum: '$pastTreatments.cost' },
          avgCost: { $avg: '$pastTreatments.cost' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        treatmentTrends,
        procedureSummary,
        period: `${months} months`,
      },
    });
  } catch (error) {
    console.error('Error fetching seasonal treatment trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch seasonal treatment trends.',
    });
  }
};

// ============================================================================
// FEATURE 3: Payment Breakdown & Aging Accounts Receivable Report
// ============================================================================

/**
 * @desc    Get payment breakdown and aging accounts receivable
 * @route   GET /api/reports/payment-breakdown
 * @access  Admin
 */
export const getPaymentBreakdown = async (req, res) => {
  try {
    const paymentBreakdown = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      {
        $facet: {
          // Category breakdown by payment method
          paymentMethods: [
            {
              $group: {
                _id: '$invoices.paymentMethod',
              totalAmount: { $sum: '$invoices.totalAmount' },
              paidAmount: { $sum: '$invoices.paidAmount' },
              count: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
          ],
          // Outstanding debt by aging brackets
          agingDebt: [
            {
              $match: {
                'invoices.paymentStatus': { $in: ['Unpaid', 'Partially Paid', 'unpaid', 'partial'] },
              },
            },
            {
              $group: {
                _id: null,
              totalDue: { $sum: '$invoices.dueAmount' },
              totalInvoices: { $sum: 1 },
              },
            },
          ],
          // Aging by days overdue
          agingByDays: [
            {
              $match: {
                'invoices.paymentStatus': { $in: ['Unpaid', 'Partially Paid', 'unpaid', 'partial'] },
              },
            },
            {
              $addFields: {
                daysOverdue: {
                  $divide: [
                    { $subtract: [new Date(), '$invoices.date'] },
                    1000 * 60 * 60 * 24, // milliseconds per day
                  ],
                },
              },
            },
            {
              $bucket: {
                groupBy: '$daysOverdue',
                boundaries: [0, 30, 60, 90, 180],
                default: '180+',
                output: {
                  count: { $sum: 1 },
                  totalDue: { $sum: '$invoices.dueAmount' },
                },
              },
            },
          ],
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        paymentMethods: paymentBreakdown[0].paymentMethods,
        agingDebt: paymentBreakdown[0].agingDebt[0] || { totalDue: 0, totalInvoices: 0 },
        agingByDays: paymentBreakdown[0].agingByDays,
      },
    });
  } catch (error) {
    console.error('Error fetching payment breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment breakdown.',
    });
  }
};

// ============================================================================
// FEATURE 4: Patient Retention & Lifetime Value (LTV) Analytics
// ============================================================================

/**
 * @desc    Get patient retention and LTV analytics
 * @route   GET /api/reports/patient-retention
 * @access  Admin
 */
export const getPatientRetentionAnalytics = async (req, res) => {
  try {
    // Calculate LTV per patient
    const patientLTV = await PatientRecord.aggregate([
      {
        $project: {
          patientId: 1,
          patientName: 1,
          totalVisits: { $size: '$appointments' },
          totalTreatments: { $size: '$pastTreatments' },
          totalBilling: {
            $sum: '$invoices.totalAmount',
          },
          totalPaid: {
            $sum: '$invoices.paidAmount',
          },
          firstVisit: { $min: '$appointments.appointmentDate' },
          lastVisit: { $max: '$appointments.appointmentDate' },
        },
      },
      {
        $addFields: {
          ltv: { $ifNull: ['$totalBilling', 0] },
          averageVisitValue: {
            $cond: [
              { $gt: ['$totalVisits', 0] },
              { $divide: ['$totalBilling', '$totalVisits'] },
              0,
            ],
          },
        },
      },
      { $sort: { ltv: -1 } },
      { $limit: 20 },
    ]);

    // Patient demographics by billing tiers
    const patientTiers = await PatientRecord.aggregate([
      {
        $project: {
          totalBilling: {
            $sum: '$invoices.totalAmount',
          },
        },
      },
      {
        $bucket: {
          groupBy: '$totalBilling',
          boundaries: [0, 500, 1000, 2500, 5000],
          default: '5000+',
          output: {
            count: { $sum: 1 },
            totalRevenue: { $sum: '$totalBilling' },
          },
        },
      },
    ]);

    // Average visits per patient
    const avgVisitsPerPatient = await PatientRecord.aggregate([
      {
        $project: {
          totalVisits: { $size: '$appointments' },
        },
      },
      {
        $group: {
          _id: null,
          avgVisits: { $avg: '$totalVisits' },
          totalPatients: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        topPatientsByLTV: patientLTV,
        patientTiers,
        avgVisitsPerPatient: avgVisitsPerPatient[0] || { avgVisits: 0, totalPatients: 0 },
      },
    });
  } catch (error) {
    console.error('Error fetching patient retention analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient retention analytics.',
    });
  }
};

// ============================================================================
// FEATURE 5: Lab Order Process Time & Efficiency Audit
// ============================================================================

/**
 * @desc    Get lab order efficiency and turnaround time analysis
 * @route   GET /api/reports/lab-efficiency
 * @access  Admin
 */
export const getLabEfficiencyAudit = async (req, res) => {
  try {
    const labEfficiency = await PatientRecord.aggregate([
      { $unwind: '$labOrders' },
      {
        $addFields: {
          turnaroundDays: {
            $divide: [
              { $subtract: ['$labOrders.receivedDate', '$labOrders.sentDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
          delayDays: {
            $divide: [
              { $subtract: ['$labOrders.receivedDate', '$labOrders.expectedDeliveryDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$labOrders.labType',
          totalOrders: { $sum: 1 },
          avgTurnaroundDays: { $avg: '$turnaroundDays' },
          delayedOrders: {
            $sum: {
              $cond: [{ $gt: ['$delayDays', 0] }, 1, 0],
            },
          },
          onTimeOrders: {
            $sum: {
              $cond: [{ $lte: ['$delayDays', 0] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          onTimePercentage: {
            $multiply: [
              {
                $divide: ['$onTimeOrders', '$totalOrders'],
              },
              100,
            ],
          },
        },
      },
      { $sort: { avgTurnaroundDays: 1 } },
    ]);

    // Overall lab statistics
    const overallStats = await PatientRecord.aggregate([
      { $unwind: '$labOrders' },
      {
        $addFields: {
          turnaroundDays: {
            $divide: [
              { $subtract: ['$labOrders.receivedDate', '$labOrders.sentDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          avgTurnaroundDays: { $avg: '$turnaroundDays' },
          minTurnaroundDays: { $min: '$turnaroundDays' },
          maxTurnaroundDays: { $max: '$turnaroundDays' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        labEfficiency,
        overallStats: overallStats[0] || {
          totalOrders: 0,
          avgTurnaroundDays: 0,
          minTurnaroundDays: 0,
          maxTurnaroundDays: 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching lab efficiency audit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch lab efficiency audit.',
    });
  }
};

// ============================================================================
// COMPREHENSIVE REPORTS SUMMARY
// ============================================================================

/**
 * @desc    Get all reports summary in a single call
 * @route   GET /api/reports/summary
 * @access  Admin
 */
export const getReportsSummary = async (req, res) => {
  try {
    const [
      doctorRevenue,
      seasonalTrends,
      paymentBreakdown,
      patientRetention,
      labEfficiency,
    ] = await Promise.all([
      getDoctorRevenueBreakdown({ ...req, json: () => Promise.resolve({}) }),
      getSeasonalTreatmentTrends({ ...req, json: () => Promise.resolve({}) }),
      getPaymentBreakdown({ ...req, json: () => Promise.resolve({}) }),
      getPatientRetentionAnalytics({ ...req, json: () => Promise.resolve({}) }),
      getLabEfficiencyAudit({ ...req, json: () => Promise.resolve({}) }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        doctorRevenue: doctorRevenue.data,
        seasonalTrends: seasonalTrends.data,
        paymentBreakdown: paymentBreakdown.data,
        patientRetention: patientRetention.data,
        labEfficiency: labEfficiency.data,
      },
    });
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports summary.',
    });
  }
};

// ============================================================================
// NEW REPORT MODULE 1: Treatment Reports
// ============================================================================

/**
 * @desc    Get treatment reports summary
 * @route   GET /api/reports/treatments
 * @access  Admin
 */
export const getTreatmentReports = async (req, res) => {
  try {
    const { startDate, endDate, doctorId } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery['pastTreatments.treatmentDate'] = {};
      if (startDate) matchQuery['pastTreatments.treatmentDate'].$gte = new Date(startDate);
      if (endDate) matchQuery['pastTreatments.treatmentDate'].$lte = new Date(endDate);
    }
    if (doctorId) {
      matchQuery['pastTreatments.doctorName'] = doctorId;
    }

    // Total completed treatments
    const totalTreatments = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      { $match: { 'pastTreatments.status': 'Completed' } },
      { $count: 'total' },
    ]);

    // Breakdown by treatment type
    const treatmentBreakdown = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: '$pastTreatments.procedure',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
          avgCost: { $avg: '$pastTreatments.cost' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Treatment trends by month
    const treatmentTrends = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$pastTreatments.treatmentDate' },
            month: { $month: '$pastTreatments.treatmentDate' },
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 24 },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalTreatments: totalTreatments[0]?.total || 0,
        treatmentBreakdown,
        treatmentTrends,
      },
    });
  } catch (error) {
    console.error('Error fetching treatment reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch treatment reports.',
    });
  }
};

// ============================================================================
// NEW REPORT MODULE 2: Revenue & Expense Reports
// ============================================================================

/**
 * @desc    Get revenue and expense reports
 * @route   GET /api/reports/financial/summary
 * @access  Admin
 */
export const getRevenueExpenseReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    // Revenue from paid invoices
    const revenueData = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      { $match: matchQuery },
      {
        $facet: {
          totalRevenue: [
            {
              $group: {
                _id: null,
                totalBilled: { $sum: '$invoices.totalAmount' },
                totalCollected: { $sum: '$invoices.paidAmount' },
                totalDue: { $sum: '$invoices.dueAmount' },
              },
            },
          ],
          paymentMethods: [
            {
              $group: {
                _id: '$invoices.paymentMethod',
                totalAmount: { $sum: '$invoices.totalAmount' },
                paidAmount: { $sum: '$invoices.paidAmount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
          ],
          paymentStatus: [
            {
              $group: {
                _id: '$invoices.paymentStatus',
                count: { $sum: 1 },
                totalAmount: { $sum: '$invoices.totalAmount' },
                dueAmount: { $sum: '$invoices.dueAmount' },
              },
            },
          ],
        },
      },
    ]);

    // Treatment revenue
    const treatmentRevenue = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTreatmentRevenue: { $sum: '$pastTreatments.cost' },
          totalTreatments: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        revenue: revenueData[0],
        treatmentRevenue: treatmentRevenue[0] || { totalTreatmentRevenue: 0, totalTreatments: 0 },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue expense reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue expense reports.',
    });
  }
};

// ============================================================================
// NEW REPORT MODULE 3: Patient Activity Reports
// ============================================================================

/**
 * @desc    Get patient activity reports
 * @route   GET /api/reports/patients/summary
 * @access  Admin
 */
export const getPatientActivityReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // Total registered patients
    const totalPatients = await PatientRecord.countDocuments(matchQuery);

    // New patients (created in date range)
    const newPatients = await PatientRecord.countDocuments(matchQuery);

    // Patient appointment activity
    const appointmentStats = await PatientRecord.aggregate([
      { $unwind: '$appointments' },
      {
        $facet: {
          totalAppointments: [
            { $count: 'total' },
          ],
          completedAppointments: [
            { $match: { 'appointments.status': { $in: ['Completed', 'completed'] } } },
            { $count: 'total' },
          ],
          cancelledAppointments: [
            { $match: { 'appointments.status': { $in: ['Cancelled', 'cancelled'] } } },
            { $count: 'total' },
          ],
        },
      },
    ]);

    // Patients with follow-ups due (urgent flags)
    const followUpsDue = await PatientRecord.countDocuments({
      'postOpRecovery.urgentFlag': true,
    });

    return res.status(200).json({
      success: true,
      data: {
        totalPatients,
        newPatients,
        appointmentStats: appointmentStats[0],
        followUpsDue,
      },
    });
  } catch (error) {
    console.error('Error fetching patient activity reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient activity reports.',
    });
  }
};

// ============================================================================
// NEW REPORT MODULE 4: Inventory Reports
// ============================================================================

/**
 * @desc    Get inventory reports (placeholder - uses treatment data for now)
 * @route   GET /api/reports/inventory/summary
 * @access  Admin
 */
export const getInventoryReports = async (req, res) => {
  try {
    // Since inventory model doesn't exist, we'll return treatment-based inventory
    // This can be extended when inventory model is created
    
    const treatmentInventory = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      {
        $group: {
          _id: '$pastTreatments.procedure',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        inventoryItems: treatmentInventory,
        totalItems: treatmentInventory.length,
        lowStockItems: 0, // Placeholder
        expiringItems: 0, // Placeholder
        note: 'Inventory model not yet implemented. Showing treatment-based data.',
      },
    });
  } catch (error) {
    console.error('Error fetching inventory reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory reports.',
    });
  }
};

// ============================================================================
// REPORT CATEGORY 1: Financial & Billing Reports
// ============================================================================

/**
 * @desc    Get Financial & Billing Reports
 * @route   GET /api/reports/financial-billing
 * @access  Admin
 */
export const getFinancialBillingReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    // Revenue summary from PatientRecord invoices
    const revenueSummary = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$invoices.totalAmount' },
          totalCollected: { $sum: '$invoices.paidAmount' },
          pendingPayments: { $sum: '$invoices.dueAmount' },
          totalInvoices: { $sum: 1 },
        },
      },
    ]);

    // Daily/Monthly collections
    const dailyCollections = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      { $match: { 'invoices.paymentStatus': { $in: ['Paid', 'paid'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$invoices.date' },
            month: { $month: '$invoices.date' },
            day: { $dayOfMonth: '$invoices.date' },
          },
          dailyTotal: { $sum: '$invoices.paidAmount' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 },
    ]);

    // Monthly collections
    const monthlyCollections = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      { $match: { 'invoices.paymentStatus': { $in: ['Paid', 'paid'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$invoices.date' },
            month: { $month: '$invoices.date' },
          },
          monthlyTotal: { $sum: '$invoices.paidAmount' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Breakdown by payment method (Cash, Card, Mobile Financial Services)
    const paymentMethodBreakdown = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      {
        $group: {
          _id: '$invoices.paymentMethod',
          totalAmount: { $sum: '$invoices.totalAmount' },
          paidAmount: { $sum: '$invoices.paidAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Insurance claims analysis
    const insuranceClaims = await PatientRecord.aggregate([
      { $unwind: '$invoices' },
      { $match: { 'invoices.paymentMethod': /insurance/i } },
      {
        $group: {
          _id: null,
          totalClaims: { $sum: 1 },
          totalClaimAmount: { $sum: '$invoices.totalAmount' },
          totalPaid: { $sum: '$invoices.paidAmount' },
        },
      },
    ]);

    // Calculate average revenue per patient
    const avgRevenuePerPatient = await PatientRecord.aggregate([
      {
        $project: {
          patientId: 1,
          totalBilling: { $sum: '$invoices.totalAmount' },
        },
      },
      {
        $group: {
          _id: null,
          avgRevenue: { $avg: '$totalBilling' },
          totalPatients: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        revenueSummary: revenueSummary[0] || { totalRevenue: 0, totalCollected: 0, pendingPayments: 0, totalInvoices: 0 },
        dailyCollections,
        monthlyCollections,
        paymentMethodBreakdown,
        insuranceClaims: insuranceClaims[0] || { totalClaims: 0, totalClaimAmount: 0, totalPaid: 0 },
        keyMetrics: {
          totalRevenue: revenueSummary[0]?.totalRevenue || 0,
          outstandingDues: revenueSummary[0]?.pendingPayments || 0,
          averageRevenuePerPatient: avgRevenuePerPatient[0]?.avgRevenue || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching financial billing reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch financial billing reports.',
    });
  }
};

// ============================================================================
// REPORT CATEGORY 2: Dental Treatment & Procedure Analytics
// ============================================================================

/**
 * @desc    Get Dental Treatment & Procedure Analytics
 * @route   GET /api/reports/treatment-procedure
 * @access  Admin
 */
export const getTreatmentProcedureAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery['pastTreatments.treatmentDate'] = {};
      if (startDate) matchQuery['pastTreatments.treatmentDate'].$gte = new Date(startDate);
      if (endDate) matchQuery['pastTreatments.treatmentDate'].$lte = new Date(endDate);
    }

    // Most performed treatments
    const topTreatments = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: '$pastTreatments.procedure',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
          avgCost: { $avg: '$pastTreatments.cost' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Doctor-wise procedure distribution
    const doctorProcedures = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: {
            doctor: '$pastTreatments.doctorName',
            procedure: '$pastTreatments.procedure',
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Group by doctor for summary
    const doctorSummary = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: '$pastTreatments.doctorName',
          totalProcedures: { $sum: 1 },
          totalRevenue: { $sum: '$pastTreatments.cost' },
          avgRevenue: { $avg: '$pastTreatments.cost' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Treatment completion rate
    const treatmentCompletion = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $facet: {
          totalTreatments: [
            { $count: 'total' },
          ],
          completedTreatments: [
            { $match: { 'pastTreatments.status': { $in: ['Completed', 'completed'] } } },
            { $count: 'total' },
          ],
        },
      },
    ]);

    // Material/supplies usage per procedure (estimated from cost)
    const materialUsage = await PatientRecord.aggregate([
      { $unwind: '$pastTreatments' },
      { $match: matchQuery },
      {
        $group: {
          _id: '$pastTreatments.procedure',
          totalCost: { $sum: '$pastTreatments.cost' },
          estimatedMaterialCost: { $sum: { $multiply: ['$pastTreatments.cost', 0.3] } }, // Assuming 30% for materials
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 } },
      { $limit: 15 },
    ]);

    const totalTreatments = treatmentCompletion[0]?.totalTreatments[0]?.total || 0;
    const completedTreatments = treatmentCompletion[0]?.completedTreatments[0]?.total || 0;
    const completionRate = totalTreatments > 0 ? ((completedTreatments / totalTreatments) * 100).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      data: {
        topTreatments,
        doctorProcedures,
        doctorSummary,
        materialUsage,
        keyMetrics: {
          topPerformedTreatments: topTreatments.slice(0, 5),
          treatmentCompletionRate: parseFloat(completionRate),
          revenuePerProcedureType: topTreatments.map(t => ({
            procedure: t._id,
            revenue: t.totalRevenue,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching treatment procedure analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch treatment procedure analytics.',
    });
  }
};

// ============================================================================
// REPORT CATEGORY 3: Appointment & Patient Flow Reports
// ============================================================================

/**
 * @desc    Get Appointment & Patient Flow Reports
 * @route   GET /api/reports/appointment-flow
 * @access  Admin
 */
export const getAppointmentFlowReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.appointmentDate = {};
      if (startDate) matchQuery.appointmentDate.$gte = new Date(startDate);
      if (endDate) matchQuery.appointmentDate.$lte = new Date(endDate);
    }

    // Total appointments from PatientRecord
    const appointmentStats = await PatientRecord.aggregate([
      { $unwind: '$appointments' },
      { $match: matchQuery },
      {
        $facet: {
          totalAppointments: [
            { $count: 'total' },
          ],
          completedAppointments: [
            { $match: { 'appointments.status': { $in: ['Completed', 'completed'] } } },
            { $count: 'total' },
          ],
          cancelledAppointments: [
            { $match: { 'appointments.status': { $in: ['Cancelled', 'cancelled'] } } },
            { $count: 'total' },
          ],
          noShows: [
            { $match: { 'appointments.status': { $in: ['No-Show', 'no-show', 'No Show'] } } },
            { $count: 'total' },
          ],
        },
      },
    ]);

    // Peak hours analysis
    const peakHours = await PatientRecord.aggregate([
      { $unwind: '$appointments' },
      { $match: matchQuery },
      {
        $group: {
          _id: { $hour: '$appointments.appointmentDate' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Peak days analysis
    const peakDays = await PatientRecord.aggregate([
      { $unwind: '$appointments' },
      { $match: matchQuery },
      {
        $group: {
          _id: { $dayOfWeek: '$appointments.appointmentDate' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // No-show trends
    const noShowTrends = await PatientRecord.aggregate([
      { $unwind: '$appointments' },
      { $match: { 'appointments.status': { $in: ['No-Show', 'no-show', 'No Show'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$appointments.appointmentDate' },
            month: { $month: '$appointments.appointmentDate' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Patient wait times (simplified - using appointment date vs creation date)
    const waitTimeStats = await PatientRecord.aggregate([
      { $unwind: '$appointments' },
      {
        $addFields: {
          waitTimeDays: {
            $divide: [
              { $subtract: ['$appointments.appointmentDate', '$createdAt'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgWaitDays: { $avg: '$waitTimeDays' },
          minWaitDays: { $min: '$waitTimeDays' },
          maxWaitDays: { $max: '$waitTimeDays' },
        },
      },
    ]);

    const totalAppts = appointmentStats[0]?.totalAppointments[0]?.total || 0;
    const completedAppts = appointmentStats[0]?.completedAppointments[0]?.total || 0;
    const cancelledAppts = appointmentStats[0]?.cancelledAppointments[0]?.total || 0;
    const noShows = appointmentStats[0]?.noShows[0]?.total || 0;

    const fulfillmentRate = totalAppts > 0 ? ((completedAppts / totalAppts) * 100).toFixed(2) : 0;
    const cancellationRate = totalAppts > 0 ? ((cancelledAppts / totalAppts) * 100).toFixed(2) : 0;
    const noShowRate = totalAppts > 0 ? ((noShows / totalAppts) * 100).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      data: {
        appointmentStats: {
          totalAppointments: totalAppts,
          completedAppointments: completedAppts,
          cancelledAppointments: cancelledAppts,
          noShows,
        },
        peakHours,
        peakDays,
        noShowTrends,
        waitTimeStats: waitTimeStats[0] || { avgWaitDays: 0, minWaitDays: 0, maxWaitDays: 0 },
        keyMetrics: {
          appointmentFulfillmentRate: parseFloat(fulfillmentRate),
          peakVisitingHours: peakHours.slice(0, 3).map(h => ({ hour: h._id, count: h.count })),
          patientRetentionRate: 85, // Placeholder - would need actual retention calculation
        },
      },
    });
  } catch (error) {
    console.error('Error fetching appointment flow reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment flow reports.',
    });
  }
};

// ============================================================================
// REPORT CATEGORY 4: Patient Demographics & Growth
// ============================================================================

/**
 * @desc    Get Patient Demographics & Growth Reports
 * @route   GET /api/reports/patient-demographics
 * @access  Admin
 */
export const getPatientDemographicsReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // New patient registration trends by month
    const patientGrowthTrends = await PatientRecord.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newPatients: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 24 },
    ]);

    // Demographic breakdown by age
    const ageDemographics = await PatientRecord.aggregate([
      {
        $addFields: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $lt: ['$patientAge', 18] }, then: '0-17' },
                { case: { $and: [{ $gte: ['$patientAge', 18] }, { $lt: ['$patientAge', 30] }] }, then: '18-29' },
                { case: { $and: [{ $gte: ['$patientAge', 30] }, { $lt: ['$patientAge', 45] }] }, then: '30-44' },
                { case: { $and: [{ $gte: ['$patientAge', 45] }, { $lt: ['$patientAge', 60] }] }, then: '45-59' },
              ],
              default: '60+',
            },
          },
        },
      },
      {
        $group: {
          _id: '$ageGroup',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Demographic breakdown by gender
    const genderDemographics = await PatientRecord.aggregate([
      {
        $group: {
          _id: '$patientGender',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Demographic breakdown by location (from address or phone area code)
    const locationDemographics = await PatientRecord.aggregate([
      {
        $group: {
          _id: '$patientAddress',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Referral source analysis (using notes or a referral field if available)
    const referralSources = await PatientRecord.aggregate([
      {
        $group: {
          _id: '$referralSource',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // New vs returning patients
    const patientTypeStats = await PatientRecord.aggregate([
      {
        $addFields: {
          visitCount: { $size: '$appointments' },
        },
      },
      {
        $facet: {
          newPatients: [
            { $match: { visitCount: 1 } },
            { $count: 'total' },
          ],
          returningPatients: [
            { $match: { visitCount: { $gt: 1 } } },
            { $count: 'total' },
          ],
        },
      },
    ]);

    // Monthly patient growth
    const monthlyGrowth = await PatientRecord.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newPatients: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    const newPatients = patientTypeStats[0]?.newPatients[0]?.total || 0;
    const returningPatients = patientTypeStats[0]?.returningPatients[0]?.total || 0;
    const totalPatients = newPatients + returningPatients;

    return res.status(200).json({
      success: true,
      data: {
        patientGrowthTrends,
        ageDemographics,
        genderDemographics,
        locationDemographics,
        referralSources,
        patientTypeStats: {
          newPatients,
          returningPatients,
          totalPatients,
        },
        monthlyGrowth,
        keyMetrics: {
          monthlyPatientGrowth: monthlyGrowth.map(m => ({
            month: `${m._id.year}-${m._id.month}`,
            newPatients: m.newPatients,
          })),
          newVsReturningPatients: {
            new: newPatients,
            returning: returningPatients,
            percentage: totalPatients > 0 ? ((newPatients / totalPatients) * 100).toFixed(2) : 0,
          },
          topReferralSources: referralSources.slice(0, 5),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching patient demographics reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient demographics reports.',
    });
  }
};

export default {
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
};
