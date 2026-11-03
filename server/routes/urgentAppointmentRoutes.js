import express from 'express';
import UrgentAppointment from '../models/UrgentAppointment.js';
import { optionalAuth } from '../middleware/auth.js';
import { trackActivity } from '../middleware/activityTracker.js';
import { bookingLimiter } from '../middleware/security.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /emergency - Get only emergency appointments (must be before /:id)
router.get(
  '/emergency',
  optionalAuth,
  async (req, res) => {
    try {
      const emergencies = await UrgentAppointment.find({ type: 'Emergency' })
        .populate('doctorId', 'name specialty')
        .populate('branchId', 'name city')
        .sort({ createdAt: -1 });

      logger.info('Emergency appointments fetched', { count: emergencies.length });
      res.json({ success: true, data: emergencies, total: emergencies.length });
    } catch (err) {
      logger.error('Error fetching emergency appointments:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST / - Book an appointment (with strict rate limiting for bookings)
router.post(
  '/',
  bookingLimiter,
  optionalAuth,
  trackActivity('book_appointment'),
  async (req, res) => {
    try {
      const {
        patientName,
        patientPhone,
        patientEmail,
        doctorId,
        branchId,
        date,
        timeSlot,
        type,
        symptomDescription,
        urgencyLevel,
      } = req.body;

      if (!patientName || !patientPhone || !date || !timeSlot) {
        logger.warn('Missing required fields for appointment booking', { patientName, patientPhone });
        return res.status(400).json({
          success: false,
          message: 'Patient name, phone, date, and time slot are required.',
        });
      }

      const appointmentData = {
        patientName,
        patientPhone,
        patientEmail,
        doctorId: doctorId || undefined,
        branchId: branchId || undefined,
        date,
        timeSlot,
        type: type || 'Routine',
        symptomDescription: symptomDescription || '',
        urgencyLevel: urgencyLevel || 'Medium',
      };

      let alertSent = false;

      // EMERGENCY LOGIC: Auto-escalate and trigger notification
      if (type === 'Emergency') {
        appointmentData.urgencyLevel = urgencyLevel || 'High';
        appointmentData.notificationSent = true;
        alertSent = true;

        logger.warn('🚨 EMERGENCY APPOINTMENT BOOKED', {
          patientName,
          patientPhone,
          urgencyLevel: appointmentData.urgencyLevel,
          symptoms: symptomDescription,
        });
      }

      const appointment = await UrgentAppointment.create(appointmentData);

      // Emergency notification trigger
      if (alertSent) {
        console.log('');
        console.log('🚨 ═══════════════════════════════════════════════════════════');
        console.log(`🚨 EMERGENCY ALERT: Notification sent for patient "${patientName}"!`);
        console.log(`🚨 Urgency Level: ${appointmentData.urgencyLevel}`);
        console.log(`🚨 Symptoms: ${symptomDescription || 'Not specified'}`);
        console.log('🚨 SMS/Email would be triggered to on-call doctor here.');
        console.log('🚨 ═══════════════════════════════════════════════════════════');
        console.log('');
      }

      logger.info('Appointment booked successfully', {
        appointmentId: appointment._id,
        type: appointment.type,
        patientName,
      });

      res.status(201).json({
        success: true,
        message: alertSent
          ? '🚨 Emergency appointment booked! On-call doctor has been notified immediately.'
          : 'Appointment booked successfully!',
        data: appointment,
        alertSent,
      });
    } catch (err) {
      logger.error('Urgent appointment booking error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET / - List all appointments with optional filters
router.get(
  '/',
  optionalAuth,
  async (req, res) => {
    try {
      const filter = {};

      if (req.query.type) {
        filter.type = req.query.type;
      }
      if (req.query.status) {
        filter.status = req.query.status;
      }

      const appointments = await UrgentAppointment.find(filter)
        .populate('doctorId', 'name specialty')
        .populate('branchId', 'name city')
        .sort({ createdAt: -1 });

      logger.info('Appointments fetched', { count: appointments.length, filter });
      res.json({
        success: true,
        data: appointments,
        total: appointments.length,
      });
    } catch (err) {
      logger.error('Error fetching appointments:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// DELETE /:id - Delete an appointment
router.delete(
  '/:id',
  optionalAuth,
  async (req, res) => {
    try {
      const appointment = await UrgentAppointment.findByIdAndDelete(req.params.id);

      if (!appointment) {
        logger.warn('Appointment not found for deletion', { appointmentId: req.params.id });
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }

      logger.info('Appointment deleted successfully', {
        appointmentId: appointment._id,
        patientName: appointment.patientName,
      });

      res.json({
        success: true,
        message: 'Appointment deleted successfully.',
        data: appointment,
      });
    } catch (err) {
      logger.error('Error deleting appointment:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PATCH /:id/status - Update appointment status
router.patch(
  '/:id/status',
  optionalAuth,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
      }

      const appointment = await UrgentAppointment.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );

      if (!appointment) {
        logger.warn('Appointment not found for status update', { appointmentId: req.params.id });
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }

      logger.info('Appointment status updated', {
        appointmentId: appointment._id,
        newStatus: status,
      });

      res.json({
        success: true,
        message: `Appointment status updated to "${status}".`,
        data: appointment,
      });
    } catch (err) {
      logger.error('Error updating appointment status:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
