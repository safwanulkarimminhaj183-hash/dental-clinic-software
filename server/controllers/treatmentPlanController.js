import mongoose from 'mongoose';
import Stripe from 'stripe';
import TreatmentPlan from '../models/TreatmentPlan.js';
import Booking from '../models/Booking.js';
import Appointment from '../models/Appointment.js';
import PatientRecord from '../models/PatientRecord.js';
import Enquiry from '../models/Enquiry.js';
import { getCache, setCache, deleteCachePattern } from '../utils/redisClient.js';
import { addNotificationJob } from '../utils/notificationQueue.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * 1. GET /api/treatment-plans
 * Dynamic Query Filtering ($gte, $lte, $in) & Personalized Recommendations
 */
export const getTreatmentPlans = async (req, res) => {
  try {
    const {
      age,
      minBudget,
      maxBudget,
      category,
      issue,
      issues,
      search,
      patientId,
      email,
      page = 1,
      limit = 20,
    } = req.query;

    const userEmail = email || req.user?.email;
    const cacheKey = `treatment_plans:age=${age || ''}:cat=${category || ''}:minB=${minBudget || ''}:maxB=${maxBudget || ''}:iss=${issue || issues || ''}:srch=${search || ''}:usr=${userEmail || patientId || ''}`;

    // ─── 2. Redis Caching Check ─────────────────────────────────────────────
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        source: 'redis_cache',
        count: cachedData.plans.length,
        data: cachedData.plans,
        recommendations: cachedData.recommendations || [],
        pagination: cachedData.pagination,
      });
    }

    // ─── 1. Build Dynamic MongoDB Query ─────────────────────────────────────
    const filter = {};

    // Dynamic Filter: Age range ($gte, $lte)
    if (age && !isNaN(Number(age))) {
      const numAge = Number(age);
      filter.targetAgeMin = { $lte: numAge };
      filter.targetAgeMax = { $gte: numAge };
    }

    // Dynamic Filter: Budget range ($gte, $lte)
    if (minBudget || maxBudget) {
      filter.price = {};
      if (minBudget && !isNaN(Number(minBudget))) {
        filter.price.$gte = Number(minBudget);
      }
      if (maxBudget && !isNaN(Number(maxBudget))) {
        filter.price.$lte = Number(maxBudget);
      }
    }

    // Dynamic Filter: Category ($in)
    if (category && category !== 'All') {
      const categories = category.split(',').map((c) => c.trim());
      filter.category = { $in: categories };
    }

    // Dynamic Filter: Dental Issues/Conditions ($in)
    const issueList = issues || issue;
    if (issueList && issueList !== 'All') {
      const parsedIssues = Array.isArray(issueList)
        ? issueList
        : issueList.split(',').map((i) => i.trim());
      filter.suitableForConditions = {
        $in: parsedIssues.map((i) => new RegExp(i, 'i')),
      };
    }

    // Dynamic Filter: Text Search
    if (search && search.trim() !== '') {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Execute find query
    const skip = (Number(page) - 1) * Number(limit);
    let plans = await TreatmentPlan.find(filter)
      .sort({ isPopular: -1, bookingsCount: -1, clicks: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // ─── Personalized Recommendations (Track Patient History) ───────────────
    let personalizedReason = null;
    let matchingConditions = [];

    if (patientId || userEmail) {
      const patientRecord = await PatientRecord.findOne({
        $or: [
          { patientId: patientId },
          { patientEmail: userEmail ? userEmail.toLowerCase() : '' },
        ],
      });

      if (patientRecord && patientRecord.medicalHistory) {
        matchingConditions = [
          ...(patientRecord.medicalHistory.conditions || []),
          ...(patientRecord.pastTreatments || []).map((t) => t.procedure),
        ];
      }
    }

    // Augment plans with recommendation scoring based on patient history
    plans = plans.map((plan) => {
      let isRecommended = false;
      let matchCount = 0;
      let matchedReason = '';

      if (matchingConditions.length > 0 && plan.suitableForConditions) {
        const foundMatches = plan.suitableForConditions.filter((cond) =>
          matchingConditions.some(
            (mc) => mc.toLowerCase().includes(cond.toLowerCase()) || cond.toLowerCase().includes(mc.toLowerCase())
          )
        );

        if (foundMatches.length > 0) {
          isRecommended = true;
          matchCount = foundMatches.length;
          matchedReason = `Recommended for your medical history: ${foundMatches.join(', ')}`;
        }
      }

      return {
        ...plan,
        isRecommended,
        recommendationScore: matchCount,
        recommendationReason: matchedReason,
      };
    });

    // Sort recommended plans to the top if user is logged in
    plans.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));

    const totalCount = await TreatmentPlan.countDocuments(filter);
    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
    };

    const responsePayload = { plans, pagination };

    // Store in Redis Cache (TTL 1 hour = 3600 seconds)
    await setCache(cacheKey, responsePayload, 3600);

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({
      success: true,
      source: 'database',
      count: plans.length,
      data: plans,
      pagination,
    });
  } catch (error) {
    console.error('❌ Error fetching treatment plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch treatment plans.',
      error: error.message,
    });
  }
};

/**
 * GET /api/treatment-plans/:id
 */
export const getTreatmentPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `treatment_plan:${id}`;

    // Check Cache
    const cachedPlan = await getCache(cacheKey);
    if (cachedPlan) {
      // Async update click count in DB silently
      TreatmentPlan.findByIdAndUpdate(id, { $inc: { clicks: 1 } }).exec();
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ success: true, data: cachedPlan });
    }

    const plan = await TreatmentPlan.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    }

    await setCache(cacheKey, plan, 1800);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Advanced Analytics: Track Click API
 * POST /api/treatment-plans/:id/click
 */
export const trackTreatmentPlanClick = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPlan = await TreatmentPlan.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } }, // MongoDB $inc operator
      { new: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ success: false, message: 'Treatment plan not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Click tracked successfully',
      clicks: updatedPlan.clicks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Secure Treatment Booking (ACID Transactions)
 * POST /api/treatment-plans/book
 */
export const bookTreatmentPlan = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      treatmentPlanId,
      patientName,
      patientEmail,
      patientPhone,
      patientAge,
      appointmentDate,
      appointmentTime,
      doctorName = 'Dr. Sarah Johnson (Chief Orthodontist)',
      amountPaid = 0,
      paymentMethod = 'Stripe',
      notes = '',
    } = req.body;

    if (!treatmentPlanId || !patientName || !patientEmail || !patientPhone || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking parameters (treatmentPlanId, patientName, patientEmail, patientPhone, appointmentDate, appointmentTime).',
      });
    }

    let bookingResult = null;
    let transactionSupported = true;

    try {
      session.startTransaction();

      // Check slot collision in Appointment / Booking collection to prevent double booking
      const formattedDate = new Date(appointmentDate);
      const startOfDay = new Date(formattedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(formattedDate.setHours(23, 59, 59, 999));

      const existingAppointment = await Appointment.findOne({
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        appointmentTime,
        doctorName,
        status: { $nin: ['Cancelled', 'cancelled'] },
      }).session(session);

      if (existingAppointment) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          success: false,
          message: `The time slot ${appointmentTime} on ${new Date(appointmentDate).toDateString()} is already booked with ${doctorName}. Please select another time slot.`,
        });
      }

      // Fetch Treatment Plan
      const plan = await TreatmentPlan.findById(treatmentPlanId).session(session);
      if (!plan) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: 'Treatment plan not found.' });
      }

      const totalAmount = plan.netPayable || plan.price;
      const paymentStatus = amountPaid >= totalAmount ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending';

      // 1. Create Booking Record inside transaction
      const booking = new Booking({
        treatmentPlan: plan._id,
        treatmentPlanTitle: plan.title,
        patientName,
        patientEmail,
        patientPhone,
        patientAge: Number(patientAge) || 25,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        doctorName,
        totalAmount,
        amountPaid: Number(amountPaid) || 0,
        paymentStatus,
        bookingStatus: 'Confirmed',
        paymentMethod,
        notes,
      });

      await booking.save({ session });

      // 2. Create Appointment Record inside transaction
      const appointment = new Appointment({
        name: patientName,
        email: patientEmail,
        phone: patientPhone,
        department: plan.category || 'General Dentistry',
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        doctorName,
        notes: `Booked Treatment Plan: ${plan.title}. ${notes}`,
        status: 'Approved',
      });

      await appointment.save({ session });

      // 3. Atomically increment plan's booking counter
      plan.bookingsCount += 1;
      if (amountPaid > 0) {
        plan.totalRevenue += Number(amountPaid);
      }
      await plan.save({ session });

      await session.commitTransaction();
      bookingResult = booking;
    } catch (txError) {
      await session.abortTransaction();

      // Fallback for standalone MongoDB deployments (without Replica Set enabled)
      if (txError.message && (txError.message.includes('replica set') || txError.message.includes('Transaction numbers'))) {
        transactionSupported = false;
        console.warn('ℹ️ [MongoDB Transaction Fallback] Replica set not active. Executing safe sequential transaction fallback...');

        const plan = await TreatmentPlan.findById(treatmentPlanId);
        if (!plan) return res.status(404).json({ success: false, message: 'Treatment plan not found.' });

        const totalAmount = plan.netPayable || plan.price;
        const paymentStatus = amountPaid >= totalAmount ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending';

        const booking = new Booking({
          treatmentPlan: plan._id,
          treatmentPlanTitle: plan.title,
          patientName,
          patientEmail,
          patientPhone,
          patientAge: Number(patientAge) || 25,
          appointmentDate: new Date(appointmentDate),
          appointmentTime,
          doctorName,
          totalAmount,
          amountPaid: Number(amountPaid) || 0,
          paymentStatus,
          bookingStatus: 'Confirmed',
          paymentMethod,
          notes,
        });
        await booking.save();

        const appointment = new Appointment({
          name: patientName,
          email: patientEmail,
          phone: patientPhone,
          department: plan.category || 'General Dentistry',
          appointmentDate: new Date(appointmentDate),
          appointmentTime,
          doctorName,
          notes: `Booked Treatment Plan: ${plan.title}. ${notes}`,
          status: 'Approved',
        });
        await appointment.save();

        await TreatmentPlan.findByIdAndUpdate(treatmentPlanId, {
          $inc: { bookingsCount: 1, totalRevenue: Number(amountPaid) || 0 },
        });

        bookingResult = booking;
      } else {
        throw txError;
      }
    } finally {
      session.endSession();
    }

    // ─── Invalidate Redis Cache ─────────────────────────────────────────────
    await deleteCachePattern('treatment_plans:*');

    // ─── 4. BullMQ Automated Notification Trigger ───────────────────────────
    await addNotificationJob('booking_confirmation', {
      patientName,
      patientEmail,
      patientPhone,
      treatmentPlanTitle: bookingResult.treatmentPlanTitle,
      appointmentDate: bookingResult.appointmentDate,
      appointmentTime: bookingResult.appointmentTime,
      bookingReference: bookingResult.bookingReference,
      totalAmount: bookingResult.totalAmount,
      amountPaid: bookingResult.amountPaid,
    });

    return res.status(201).json({
      success: true,
      message: 'Treatment plan booked successfully!',
      transactionMode: transactionSupported ? 'ACID_Session_Transaction' : 'Sequential_Fallback',
      booking: bookingResult,
    });
  } catch (error) {
    console.error('❌ Error booking treatment plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process booking transaction.',
      error: error.message,
    });
  }
};

/**
 * Enquiry Submission API (Triggers automated BullMQ notification)
 * POST /api/treatment-plans/enquire
 */
export const enquireTreatmentPlan = async (req, res) => {
  try {
    const { treatmentPlanTitle, patientName, patientEmail, patientPhone, message } = req.body;

    if (!patientName || !patientEmail || !treatmentPlanTitle) {
      return res.status(400).json({ success: false, message: 'Name, email, and treatment plan title are required.' });
    }

    // Save to MongoDB collection
    const enquiry = await Enquiry.create({
      treatmentPlanTitle,
      patientName,
      patientEmail,
      patientPhone: patientPhone || '',
      message: message || '',
      status: 'New',
    });

    // Queue notification job in BullMQ if active
    try {
      await addNotificationJob('treatment_enquiry', {
        patientName,
        patientEmail,
        patientPhone,
        treatmentPlanTitle,
        enquiryMessage: message,
      });
    } catch (queueErr) {
      // Safe fallback if redis is offline
    }

    return res.status(200).json({
      success: true,
      message: 'Enquiry submitted successfully! Our team will contact you shortly.',
      data: enquiry,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Payment Gateway: Stripe Payment Intent Integration
 * POST /api/treatment-plans/create-payment-intent
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd', treatmentPlanId, patientEmail } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    // If Stripe secret key is configured
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert dollars to cents
        currency,
        receipt_email: patientEmail,
        metadata: {
          treatmentPlanId: treatmentPlanId || '',
          patientEmail: patientEmail || '',
        },
      });

      return res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Fallback/Mock Mode for development without active Stripe keys
    const mockIntentId = `pi_mock_${Math.random().toString(36).substring(2, 12)}`;
    return res.status(200).json({
      success: true,
      mockMode: true,
      clientSecret: `${mockIntentId}_secret_mock`,
      paymentIntentId: mockIntentId,
      message: 'Mock Stripe Payment Intent generated for sandbox testing.',
    });
  } catch (error) {
    console.error('❌ Stripe Payment Intent error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Handle Stripe Webhook
 * POST /api/treatment-plans/webhook
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = req.body; // fallback parsing
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { metadata, amount_received } = paymentIntent;

      if (metadata && metadata.bookingId) {
        const amountPaidInDollars = amount_received / 100;
        const booking = await Booking.findById(metadata.bookingId);
        if (booking) {
          booking.amountPaid += amountPaidInDollars;
          booking.paymentStatus = booking.amountPaid >= booking.totalAmount ? 'Paid' : 'Partial';
          booking.paymentIntentId = paymentIntent.id;
          await booking.save();

          // Increment plan total revenue
          await TreatmentPlan.findByIdAndUpdate(booking.treatmentPlan, {
            $inc: { totalRevenue: amountPaidInDollars },
          });

          // Send payment confirmation email via BullMQ
          await addNotificationJob('payment_receipt', {
            patientName: booking.patientName,
            patientEmail: booking.patientEmail,
            treatmentPlanTitle: booking.treatmentPlanTitle,
            appointmentDate: booking.appointmentDate,
            appointmentTime: booking.appointmentTime,
            bookingReference: booking.bookingReference,
            amountPaid: amountPaidInDollars,
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

/**
 * 5. Advanced Analytics & Tracking (Admin Insight)
 * GET /api/treatment-plans/analytics
 */
export const getTreatmentPlanAnalytics = async (req, res) => {
  try {
    // Aggregation pipeline for aggregated performance stats
    const aggregatedStats = await TreatmentPlan.aggregate([
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          totalClicks: { $sum: '$clicks' },
          totalBookings: { $sum: '$bookingsCount' },
          totalRevenue: { $sum: '$totalRevenue' },
          avgPrice: { $avg: '$price' },
        },
      },
    ]);

    // Top viewed treatment plans
    const topClickedPlans = await TreatmentPlan.find()
      .select('title category clicks bookingsCount totalRevenue price')
      .sort({ clicks: -1 })
      .limit(5);

    // Top booked treatment plans
    const topBookedPlans = await TreatmentPlan.find()
      .select('title category clicks bookingsCount totalRevenue price')
      .sort({ bookingsCount: -1 })
      .limit(5);

    // Category distribution
    const categoryStats = await TreatmentPlan.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalClicks: { $sum: '$clicks' },
          totalBookings: { $sum: '$bookingsCount' },
          totalRevenue: { $sum: '$totalRevenue' },
        },
      },
      { $sort: { totalBookings: -1 } },
    ]);

    // Recent Bookings Overview
    const recentBookings = await Booking.find()
      .select('bookingReference patientName treatmentPlanTitle appointmentDate amountPaid paymentStatus bookingStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const summary = aggregatedStats[0] || {
      totalPlans: 0,
      totalClicks: 0,
      totalBookings: 0,
      totalRevenue: 0,
      avgPrice: 0,
    };

    return res.status(200).json({
      success: true,
      analytics: {
        summary,
        topClickedPlans,
        topBookedPlans,
        categoryStats,
        recentBookings,
      },
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data.',
      error: error.message,
    });
  }
};
