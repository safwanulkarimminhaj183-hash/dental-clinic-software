import mongoose from 'mongoose';
import PatientRecord from '../models/PatientRecord.js';

// ============================================================================
// FEATURE 1: TOOTH LIFECYCLE TRACKING
// ============================================================================

/**
 * @desc    Get tooth history for a specific tooth
 * @route   GET /api/v1/patient-records/:id/tooth/:toothNumber
 * @access  Public / Staff
 */
export const getToothHistory = async (req, res) => {
  try {
    const { id, toothNumber } = req.params;

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const toothData = record.toothHistory?.find(th => th.toothNumber === toothNumber);

    if (!toothData) {
      return res.status(200).json({
        success: true,
        message: `No history found for tooth ${toothNumber}`,
        data: {
          toothNumber,
          timeline: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: toothData,
    });
  } catch (error) {
    console.error('Error fetching tooth history:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add procedure to tooth timeline
 * @route   POST /api/v1/patient-records/:id/tooth/:toothNumber/timeline
 * @access  Public / Staff
 */
export const addToothTimeline = async (req, res) => {
  try {
    const { id, toothNumber } = req.params;
    const { procedure, doctor, status, notes, cost, date } = req.body;

    if (!procedure || !procedure.trim()) {
      return res.status(400).json({ success: false, message: 'Procedure name is required' });
    }

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Find or create tooth history entry
    let toothEntry = record.toothHistory?.find(th => th.toothNumber === toothNumber);

    const newTimelineEntry = {
      date: date ? new Date(date) : new Date(),
      procedure: procedure.trim(),
      doctor: doctor || 'Dr. Sarah Johnson',
      status: status || 'Completed',
      notes: notes || '',
      cost: cost || 0,
    };

    if (toothEntry) {
      toothEntry.timeline.push(newTimelineEntry);
    } else {
      record.toothHistory.push({
        toothNumber,
        timeline: [newTimelineEntry],
      });
    }

    await record.save();

    return res.status(201).json({
      success: true,
      message: 'Tooth timeline updated successfully',
      data: record.toothHistory.find(th => th.toothNumber === toothNumber),
    });
  } catch (error) {
    console.error('Error adding to tooth timeline:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// FEATURE 2: LAB WORK ORDER TRACKING
// ============================================================================

/**
 * @desc    Create new lab order
 * @route   POST /api/v1/patient-records/:id/lab-orders
 * @access  Public / Staff
 */
export const createLabOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { toothNumber, labType, material, expectedDeliveryDate, notes } = req.body;

    if (!toothNumber || !labType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tooth number and lab type are required' 
      });
    }

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const orderId = `LAB-${Date.now().toString().slice(-6)}`;

    const newLabOrder = {
      orderId,
      toothNumber,
      labType,
      material: material || 'Porcelain',
      status: 'Pending',
      sentDate: new Date(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes: notes || '',
    };

    record.labOrders.push(newLabOrder);
    await record.save();

    return res.status(201).json({
      success: true,
      message: 'Lab order created successfully',
      data: newLabOrder,
    });
  } catch (error) {
    console.error('Error creating lab order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update lab order status
 * @route   PUT /api/v1/patient-records/:id/lab-orders/:orderId
 * @access  Public / Staff
 */
export const updateLabOrderStatus = async (req, res) => {
  try {
    const { id, orderId } = req.params;
    const { status, cabinetLocation, receivedDate, fittedDate } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const labOrder = record.labOrders.find(lo => lo.orderId === orderId);
    if (!labOrder) {
      return res.status(404).json({ success: false, message: 'Lab order not found' });
    }

    labOrder.status = status;

    if (status === 'Sent to Lab' && !labOrder.sentDate) {
      labOrder.sentDate = new Date();
    }
    if (status === 'Received' || receivedDate) {
      labOrder.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    }
    if (status === 'Fitted' || fittedDate) {
      labOrder.fittedDate = fittedDate ? new Date(fittedDate) : new Date();
    }
    if (cabinetLocation) {
      labOrder.cabinetLocation = cabinetLocation;
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Lab order status updated successfully',
      data: labOrder,
    });
  } catch (error) {
    console.error('Error updating lab order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Edit full lab order details (Edit Order form)
 * @route   PATCH /api/v1/patient-records/:id/lab-orders/:orderId
 * @access  Public / Staff
 */
export const updateLabOrderDetails = async (req, res) => {
  try {
    const { id, orderId } = req.params;
    const {
      toothNumber,
      labType,
      material,
      status,
      expectedDeliveryDate,
      cabinetLocation,
      notes,
    } = req.body;

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };

    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const labOrder = record.labOrders.find((lo) => lo.orderId === orderId);
    if (!labOrder) {
      return res.status(404).json({ success: false, message: 'Lab order not found' });
    }

    if (toothNumber !== undefined && String(toothNumber).trim()) labOrder.toothNumber = String(toothNumber).trim();
    if (labType) labOrder.labType = labType;
    if (material !== undefined) labOrder.material = material || 'Porcelain';
    if (cabinetLocation !== undefined) labOrder.cabinetLocation = cabinetLocation;
    if (notes !== undefined) labOrder.notes = notes;
    if (expectedDeliveryDate !== undefined) {
      labOrder.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    }

    if (status) {
      labOrder.status = status;
      if (status === 'Sent to Lab' && !labOrder.sentDate) labOrder.sentDate = new Date();
      if (status === 'Received' && !labOrder.receivedDate) labOrder.receivedDate = new Date();
      if (status === 'Fitted' && !labOrder.fittedDate) labOrder.fittedDate = new Date();
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Lab order updated successfully',
      data: labOrder,
    });
  } catch (error) {
    console.error('Error updating lab order details:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a lab order
 * @route   DELETE /api/v1/patient-records/:id/lab-orders/:orderId
 * @access  Public / Staff
 */
export const deleteLabOrder = async (req, res) => {
  try {
    const { id, orderId } = req.params;

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };

    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const index = record.labOrders.findIndex((lo) => lo.orderId === orderId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Lab order not found' });
    }

    record.labOrders.splice(index, 1);
    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Lab order deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lab order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all lab orders for a patient
 * @route   GET /api/v1/patient-records/:id/lab-orders
 * @access  Public / Staff
 */
export const getLabOrders = async (req, res) => {
  try {
    const { id } = req.params;

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    return res.status(200).json({
      success: true,
      data: record.labOrders || [],
    });
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// FEATURE 3: POST-OP RECOVERY TRACKING
// ============================================================================

/**
 * @desc    Create post-op recovery record
 * @route   POST /api/v1/patient-records/:id/post-op-recovery
 * @access  Public / Staff
 */
export const createPostOpRecovery = async (req, res) => {
  try {
    const { id } = req.params;
    const { treatmentId, procedure, treatmentDate, notes } = req.body;

    if (!procedure || !treatmentDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Procedure and treatment date are required' 
      });
    }

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const newRecoveryRecord = {
      treatmentId: treatmentId || new mongoose.Types.ObjectId(),
      procedure: procedure.trim(),
      treatmentDate: new Date(treatmentDate),
      followUpStatus: 'Pending',
      painLevel: null,
      feedbackDate: null,
      infectionRisk: 'Low',
      notes: notes || '',
      urgentFlag: false,
    };

    record.postOpRecovery.push(newRecoveryRecord);
    await record.save();

    return res.status(201).json({
      success: true,
      message: 'Post-op recovery record created successfully',
      data: newRecoveryRecord,
    });
  } catch (error) {
    console.error('Error creating post-op recovery record:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update post-op recovery with patient feedback
 * @route   PUT /api/v1/patient-records/:id/post-op-recovery/:recoveryId
 * @access  Public / Staff
 */
export const updatePostOpRecovery = async (req, res) => {
  try {
    const { id, recoveryId } = req.params;
    const { painLevel, notes, infectionRisk } = req.body;

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const recoveryRecord = record.postOpRecovery.id(recoveryId);
    if (!recoveryRecord) {
      return res.status(404).json({ success: false, message: 'Recovery record not found' });
    }

    recoveryRecord.painLevel = painLevel;
    recoveryRecord.feedbackDate = new Date();
    recoveryRecord.notes = notes || recoveryRecord.notes;
    recoveryRecord.infectionRisk = infectionRisk || 'Low';

    // Auto-flag urgent if pain level is 7 or higher
    if (painLevel >= 7) {
      recoveryRecord.urgentFlag = true;
      recoveryRecord.followUpStatus = 'Urgent Follow-up Required';
    } else {
      recoveryRecord.followUpStatus = 'Completed';
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Post-op recovery updated successfully',
      data: recoveryRecord,
    });
  } catch (error) {
    console.error('Error updating post-op recovery:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get patients with urgent follow-up flags
 * @route   GET /api/v1/patient-records/urgent-follow-ups
 * @access  Public / Staff
 */
export const getUrgentFollowUps = async (req, res) => {
  try {
    const records = await PatientRecord.find({
      'postOpRecovery.urgentFlag': true,
    });

    const urgentPatients = records.map(record => {
      const urgentRecoveries = record.postOpRecovery.filter(r => r.urgentFlag);
      return {
        patientId: record.patientId,
        patientName: record.patientName,
        patientPhone: record.patientPhone,
        urgentRecoveries,
      };
    });

    return res.status(200).json({
      success: true,
      count: urgentPatients.length,
      data: urgentPatients,
    });
  } catch (error) {
    console.error('Error fetching urgent follow-ups:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// FEATURE 4: PATIENT COMPLIANCE PREDICTION ANALYTICS
// ============================================================================

/**
 * @desc    Calculate patient compliance status based on appointment history
 * @route   GET /api/v1/patient-records/:id/compliance-status
 * @access  Public / Staff
 */
export const getComplianceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { patientId: id.toUpperCase() };
    
    const record = await PatientRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const appointments = record.appointments || [];
    
    if (appointments.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          complianceStatus: 'Good',
          totalAppointments: 0,
          missedAppointments: 0,
          cancelledAppointments: 0,
          completionRate: 100,
          recommendation: 'No appointment history available',
        },
      });
    }

    const totalAppointments = appointments.length;
    const missedAppointments = appointments.filter(apt => 
      apt.status === 'Cancelled' || apt.status === 'cancelled'
    ).length;
    const completedAppointments = appointments.filter(apt => 
      apt.status === 'Completed' || apt.status === 'completed'
    ).length;

    const completionRate = totalAppointments > 0 
      ? Math.round((completedAppointments / totalAppointments) * 100) 
      : 100;

    const cancellationRate = totalAppointments > 0 
      ? Math.round((missedAppointments / totalAppointments) * 100) 
      : 0;

    let complianceStatus = 'Excellent';
    let recommendation = 'Patient shows excellent attendance. Continue standard appointment scheduling.';

    if (cancellationRate >= 50) {
      complianceStatus = 'High Dropout Risk';
      recommendation = '⚠️ HIGH RISK: Patient has cancelled 50%+ of appointments. Recommend calling to confirm 24-48 hours before next appointment.';
    } else if (cancellationRate >= 30) {
      complianceStatus = 'Low Attendance Risk';
      recommendation = '⚠️ MODERATE RISK: Patient has cancelled 30%+ of appointments. Recommend confirmation calls before appointments.';
    } else if (cancellationRate >= 15) {
      complianceStatus = 'Moderate';
      recommendation = 'Patient occasionally misses appointments. Consider reminder calls for important procedures.';
    } else if (completionRate >= 90) {
      complianceStatus = 'Excellent';
      recommendation = 'Patient shows excellent attendance. Continue standard appointment scheduling.';
    } else {
      complianceStatus = 'Good';
      recommendation = 'Patient has good attendance. Standard scheduling is appropriate.';
    }

    // Update patient record with calculated compliance status
    record.complianceStatus = complianceStatus;
    await record.save();

    return res.status(200).json({
      success: true,
      data: {
        complianceStatus,
        totalAppointments,
        missedAppointments,
        cancelledAppointments: missedAppointments,
        completedAppointments,
        completionRate,
        cancellationRate,
        recommendation,
      },
    });
  } catch (error) {
    console.error('Error calculating compliance status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all patients with high dropout risk
 * @route   GET /api/v1/patient-records/high-risk-patients
 * @access  Public / Staff
 */
export const getHighRiskPatients = async (req, res) => {
  try {
    const records = await PatientRecord.find({
      $or: [
        { complianceStatus: 'High Dropout Risk' },
        { complianceStatus: 'Low Attendance Risk' },
        { 'postOpRecovery.urgentFlag': true },
        { 'medicalRiskFlags.anesthesiaContraindication': true },
      ],
    });

    const riskPatients = records.map(record => ({
      patientId: record.patientId,
      patientName: record.patientName,
      patientPhone: record.patientPhone,
      complianceStatus: record.complianceStatus,
      medicalRiskFlags: record.medicalRiskFlags,
      hasUrgentFollowUp: record.postOpRecovery?.some(r => r.urgentFlag) || false,
    }));

    return res.status(200).json({
      success: true,
      count: riskPatients.length,
      data: riskPatients,
    });
  } catch (error) {
    console.error('Error fetching high-risk patients:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};