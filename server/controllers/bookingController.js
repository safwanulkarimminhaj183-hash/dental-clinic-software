import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Appointment from '../models/Appointment.js';
import TreatmentPlan from '../models/TreatmentPlan.js';
import logger from '../utils/logger.js';

/**
 * Normalizes payment statuses for consistent frontend presentation
 */
const normalizePaymentStatus = (status, total, paid) => {
  if (paid >= total && total > 0) return 'Paid';
  if (paid > 0 && paid < total) return 'Partially Paid';
  if (status === 'Refunded') return 'Refunded';
  return 'Unpaid';
};

/**
 * GET /api/bookings
 * Retrieve all bookings with comprehensive search, filters, pagination and summary statistics
 */
export const getBookings = async (req, res) => {
  try {
    const {
      search,
      bookingStatus,
      paymentStatus,
      treatmentPlan,
      specialist,
      appointmentDate,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Search filter
    if (search && search.trim()) {
      const q = search.trim();
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { bookingReference: searchRegex },
        { patientName: searchRegex },
        { patientPhone: searchRegex },
        { patientEmail: searchRegex },
        { treatmentPlanTitle: searchRegex },
        { doctorName: searchRegex },
      ];
    }

    // Booking Status filter
    if (bookingStatus && bookingStatus !== 'All') {
      filter.bookingStatus = bookingStatus;
    }

    // Payment Status filter
    if (paymentStatus && paymentStatus !== 'All') {
      if (paymentStatus === 'Partially Paid') {
        filter.paymentStatus = { $in: ['Partially Paid', 'Partial'] };
      } else if (paymentStatus === 'Unpaid') {
        filter.paymentStatus = { $in: ['Unpaid', 'Pending', 'Failed'] };
      } else {
        filter.paymentStatus = paymentStatus;
      }
    }

    // Treatment Plan filter
    if (treatmentPlan && treatmentPlan !== 'All') {
      filter.treatmentPlanTitle = treatmentPlan;
    }

    // Specialist filter
    if (specialist && specialist !== 'All') {
      filter.doctorName = specialist;
    }

    // Appointment Date filter
    if (appointmentDate) {
      const targetDate = new Date(appointmentDate);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, totalCount] = await Promise.all([
      Booking.find(filter).sort(sortOrder).skip(skip).limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    // Aggregate Summary Cards from entire collection
    const allBookings = await Booking.find({});
    let totalRevenue = 0;
    let pendingPayments = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;

    allBookings.forEach((b) => {
      const tot = Number(b.totalAmount) || 0;
      const pd = Number(b.amountPaid) || 0;
      totalRevenue += pd;

      if (pd < tot && b.bookingStatus !== 'Cancelled') {
        pendingPayments += tot - pd;
      }

      if (b.bookingStatus === 'Pending') pendingCount++;
      else if (b.bookingStatus === 'Confirmed') confirmedCount++;
      else if (b.bookingStatus === 'Completed') completedCount++;
    });

    const summary = {
      totalBookings: allBookings.length,
      pendingBookings: pendingCount,
      confirmedBookings: confirmedCount,
      completedBookings: completedCount,
      totalRevenue,
      pendingPayments,
    };

    return res.status(200).json({
      success: true,
      data: bookings,
      summary,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum) || 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/bookings/:id
 * Retrieve a single booking by ID or reference with full history
 */
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    let booking = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      booking = await Booking.findById(id).populate('treatmentPlan');
    }
    if (!booking) {
      booking = await Booking.findOne({ bookingReference: id }).populate('treatmentPlan');
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/bookings
 * Create a new booking with double booking prevention and payment record
 */
export const createBooking = async (req, res) => {
  try {
    const {
      treatmentPlanId,
      treatmentPlanTitle,
      patientName,
      patientEmail,
      patientPhone,
      patientAge,
      appointmentDate,
      appointmentTime,
      doctorName,
      amountPaid = 0,
      paymentOption = 'full',
      paymentMethod = 'Card',
      notes = '',
    } = req.body;

    if (!patientName || !patientEmail || !patientPhone || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Patient name, email, phone, appointment date, and time slot are required.',
      });
    }

    // Double booking check: prevent same doctor from having two active appointments in the same slot
    const targetDate = new Date(appointmentDate);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingBooking = await Booking.findOne({
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      appointmentTime,
      doctorName: doctorName || 'Dr. Sarah Johnson (Chief Orthodontist)',
      bookingStatus: { $nin: ['Cancelled', 'cancelled', 'No Show'] },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: `The time slot "${appointmentTime}" on ${new Date(appointmentDate).toDateString()} is already booked with ${doctorName}. Please choose another schedule.`,
      });
    }

    // Determine plan pricing
    let finalTitle = treatmentPlanTitle || 'Dental Consultation & Treatment Plan';
    let totalAmount = 250;

    if (treatmentPlanId && mongoose.Types.ObjectId.isValid(treatmentPlanId)) {
      const plan = await TreatmentPlan.findById(treatmentPlanId);
      if (plan) {
        finalTitle = plan.title;
        totalAmount = plan.netPayable || plan.price || 250;
      }
    }

    const paidNum = Math.max(0, Number(amountPaid) || 0);
    const payStatus = normalizePaymentStatus('', totalAmount, paidNum);

    const initialPayments = [];
    if (paidNum > 0) {
      initialPayments.push({
        transactionId: `TXN-${Date.now()}`,
        amount: paidNum,
        paymentMethod: paymentMethod || 'Card',
        paymentDate: new Date(),
        status: payStatus === 'Paid' ? 'Paid' : 'Partially Paid',
        notes: `Initial ${paymentOption === 'partial' ? 'Advance' : 'Full'} Payment`,
      });
    }

    const initialTimeline = [
      {
        action: 'Booking Created',
        status: 'Confirmed',
        timestamp: new Date(),
        notes: `Scheduled with ${doctorName || 'Dr. Sarah Johnson'} for ${appointmentTime}.`,
      },
    ];

    if (paidNum > 0) {
      initialTimeline.push({
        action: 'Payment Recorded',
        status: payStatus,
        timestamp: new Date(),
        notes: `Received $${paidNum} via ${paymentMethod || 'Card'}.`,
      });
    }

    const booking = await Booking.create({
      treatmentPlan: treatmentPlanId && mongoose.Types.ObjectId.isValid(treatmentPlanId) ? treatmentPlanId : undefined,
      treatmentPlanTitle: finalTitle,
      patientName,
      patientEmail,
      patientPhone,
      patientAge: Number(patientAge) || 25,
      appointmentDate: targetDate,
      appointmentTime,
      doctorName: doctorName || 'Dr. Sarah Johnson (Chief Orthodontist)',
      totalAmount,
      amountPaid: paidNum,
      paymentStatus: payStatus,
      bookingStatus: 'Confirmed',
      paymentMethod: paymentMethod || 'Card',
      transactionId: `TXN-${Date.now()}`,
      payments: initialPayments,
      timeline: initialTimeline,
      notes: notes || '',
    });

    // Also sync to Appointment collection for calendar visibility
    try {
      await Appointment.create({
        name: patientName,
        email: patientEmail,
        phone: patientPhone,
        department: 'General Dentistry',
        appointmentDate: targetDate,
        appointmentTime,
        doctorName: doctorName || 'Dr. Sarah Johnson (Chief Orthodontist)',
        notes: `Treatment Plan: ${finalTitle}. Booking Ref: ${booking.bookingReference}`,
        status: 'Approved',
      });
    } catch (e) {
      logger.warn('Appointment mirror creation skipped:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully!',
      data: booking,
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/bookings/:id/status
 * Update booking status (Pending, Confirmed, Rescheduled, Completed, Cancelled, No Show)
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const allowed = ['Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled', 'No Show'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid booking status. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const booking = await Booking.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { bookingReference: id }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    booking.bookingStatus = status;
    booking.timeline.push({
      action: `Status changed to ${status}`,
      status,
      timestamp: new Date(),
      notes: note || `Updated by staff.`,
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking status updated to "${status}".`,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/bookings/:id/reschedule
 * Reschedule appointment date and time slot with collision check
 */
export const rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, doctorName, note } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'New appointment date and time slot are required.',
      });
    }

    const booking = await Booking.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { bookingReference: id }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const targetDoctor = doctorName || booking.doctorName;
    const newDate = new Date(appointmentDate);
    const startOfDay = new Date(newDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(newDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Collision check
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      appointmentTime,
      doctorName: targetDoctor,
      bookingStatus: { $nin: ['Cancelled', 'cancelled', 'No Show'] },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Slot ${appointmentTime} on ${newDate.toDateString()} is already booked with ${targetDoctor}. Please pick another slot.`,
      });
    }

    const oldDateStr = `${new Date(booking.appointmentDate).toLocaleDateString()} at ${booking.appointmentTime}`;
    const newDateStr = `${newDate.toLocaleDateString()} at ${appointmentTime}`;

    booking.appointmentDate = newDate;
    booking.appointmentTime = appointmentTime;
    if (doctorName) booking.doctorName = doctorName;
    booking.bookingStatus = 'Rescheduled';

    booking.timeline.push({
      action: 'Appointment Rescheduled',
      status: 'Rescheduled',
      timestamp: new Date(),
      notes: note || `Rescheduled from ${oldDateStr} to ${newDateStr}.`,
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Appointment successfully rescheduled to ${newDateStr}.`,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/bookings/:id/payments
 * Record an additional payment for the booking
 */
export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'Cash', transactionId, notes = '' } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive payment amount is required.' });
    }

    const booking = await Booking.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { bookingReference: id }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const newAmountPaid = (booking.amountPaid || 0) + paymentAmount;
    booking.amountPaid = newAmountPaid;

    const newPayStatus = normalizePaymentStatus(booking.paymentStatus, booking.totalAmount, newAmountPaid);
    booking.paymentStatus = newPayStatus;

    const paymentEntry = {
      transactionId: transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: paymentAmount,
      paymentMethod,
      paymentDate: new Date(),
      status: 'Paid',
      notes: notes || 'Payment collected at clinic',
    };

    booking.payments.push(paymentEntry);
    booking.timeline.push({
      action: 'Payment Collected',
      status: newPayStatus,
      timestamp: new Date(),
      notes: `Received $${paymentAmount} via ${paymentMethod}. New remaining balance: $${Math.max(0, booking.totalAmount - newAmountPaid)}.`,
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Payment of $${paymentAmount} recorded successfully!`,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/bookings/:id/notes
 * Update internal staff notes
 */
export const updateStaffNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffNotes } = req.body;

    const booking = await Booking.findOneAndUpdate(
      { $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { bookingReference: id }] },
      { staffNotes },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Staff notes updated successfully.',
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/bookings/:id
 * Delete or cancel a booking
 */
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOneAndDelete({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { bookingReference: id }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking deleted successfully.',
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
