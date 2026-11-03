import express from 'express';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  rescheduleBooking,
  recordPayment,
  updateStaffNotes,
  deleteBooking,
} from '../controllers/bookingController.js';
import { apiLimiter, bookingLimiter } from '../middleware/security.js';

const router = express.Router();

// List bookings with search, filters, pagination, and summary cards
router.get('/', apiLimiter, getBookings);

// Create a new booking
router.post('/', bookingLimiter, createBooking);

// Single booking details
router.get('/:id', getBookingById);

// Update booking status
router.patch('/:id/status', updateBookingStatus);

// Reschedule appointment date and time
router.patch('/:id/reschedule', rescheduleBooking);

// Record payment (adds payment, updates balance & payment status)
router.post('/:id/payments', recordPayment);

// Update staff notes
router.patch('/:id/notes', updateStaffNotes);

// Delete booking
router.delete('/:id', deleteBooking);

export default router;
