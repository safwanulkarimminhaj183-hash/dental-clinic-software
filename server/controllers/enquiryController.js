import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import { addNotificationJob } from '../utils/notificationQueue.js';
import logger from '../utils/logger.js';

/**
 * GET /api/enquiries
 * Retrieve all treatment plan enquiries with optional filtering
 */
export const getEnquiries = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { patientName: searchRegex },
        { patientEmail: searchRegex },
        { patientPhone: searchRegex },
        { treatmentPlanTitle: searchRegex },
        { message: searchRegex },
      ];
    }

    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });

    const stats = {
      total: await Enquiry.countDocuments(),
      newCount: await Enquiry.countDocuments({ status: 'New' }),
      contactedCount: await Enquiry.countDocuments({ status: 'Contacted' }),
      convertedCount: await Enquiry.countDocuments({ status: 'Converted' }),
    };

    return res.status(200).json({
      success: true,
      data: enquiries,
      stats,
      count: enquiries.length,
    });
  } catch (error) {
    logger.error('Error fetching enquiries:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/enquiries
 * Create a new treatment plan enquiry
 */
export const createEnquiry = async (req, res) => {
  try {
    const { treatmentPlanTitle, patientName, patientEmail, patientPhone, message } = req.body;

    if (!patientName || !patientEmail || !treatmentPlanTitle) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and treatment plan title are required.',
      });
    }

    const enquiry = await Enquiry.create({
      treatmentPlanTitle,
      patientName,
      patientEmail,
      patientPhone: patientPhone || '',
      message: message || '',
      status: 'New',
    });

    // Optionally notify via BullMQ background queue
    try {
      if (typeof addNotificationJob === 'function') {
        await addNotificationJob('treatment_enquiry', {
          patientName,
          patientEmail,
          patientPhone,
          treatmentPlanTitle,
          enquiryMessage: message,
        });
      }
    } catch (queueErr) {
      logger.warn('BullMQ notification skipped:', queueErr.message);
    }

    logger.info('New treatment plan enquiry created', { enquiryId: enquiry._id, patientEmail });

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully! Our team will contact you shortly.',
      data: enquiry,
    });
  } catch (error) {
    logger.error('Error creating enquiry:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/enquiries/:id/status
 * Update the status of an enquiry (New, Contacted, Converted)
 */
export const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['New', 'Contacted', 'Converted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    let enquiry = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      enquiry = await Enquiry.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );
    }

    if (!enquiry) {
      enquiry = await Enquiry.findOneAndUpdate(
        { _id: id },
        { status },
        { new: true, runValidators: true }
      );
    }

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    logger.info('Enquiry status updated', { enquiryId: id, status });

    return res.status(200).json({
      success: true,
      message: `Enquiry status updated to "${status}".`,
      data: enquiry,
    });
  } catch (error) {
    logger.error('Error updating enquiry status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/enquiries/:id
 * Delete an enquiry by ID
 */
export const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    let enquiry = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      enquiry = await Enquiry.findByIdAndDelete(id);
    }

    if (!enquiry) {
      enquiry = await Enquiry.findOneAndDelete({ _id: id });
    }

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    logger.info('Enquiry deleted successfully', { enquiryId: id });

    return res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully.',
      data: enquiry,
    });
  } catch (error) {
    logger.error('Error deleting enquiry:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
