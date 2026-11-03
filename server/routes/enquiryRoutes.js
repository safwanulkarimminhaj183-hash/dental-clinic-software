import express from 'express';
import {
  getEnquiries,
  createEnquiry,
  updateEnquiryStatus,
  deleteEnquiry,
} from '../controllers/enquiryController.js';
import { apiLimiter } from '../middleware/security.js';

const router = express.Router();

// GET /api/enquiries - Retrieve all enquiries with optional status or search filter
router.get('/', getEnquiries);

// POST /api/enquiries - Submit a new enquiry
router.post('/', apiLimiter, createEnquiry);

// PATCH /api/enquiries/:id/status - Update enquiry status (New, Contacted, Converted)
router.patch('/:id/status', updateEnquiryStatus);

// DELETE /api/enquiries/:id - Delete an enquiry
router.delete('/:id', deleteEnquiry);

export default router;
