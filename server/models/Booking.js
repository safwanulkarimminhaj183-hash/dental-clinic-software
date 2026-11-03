import mongoose from 'mongoose';

const paymentRecordSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      default: () => `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer', 'Mobile Banking', 'Stripe', 'Pay At Clinic'],
      default: 'Card',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid', 'Refunded'],
      default: 'Paid',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const timelineEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => `BK-${Math.floor(100000 + Math.random() * 900000)}`,
    },
    treatmentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TreatmentPlan',
      required: false,
    },
    treatmentPlanTitle: {
      type: String,
      required: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    patientEmail: {
      type: String,
      required: [true, 'Patient email is required'],
      trim: true,
      lowercase: true,
    },
    patientPhone: {
      type: String,
      required: [true, 'Patient phone number is required'],
      trim: true,
    },
    patientAge: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: 1,
      default: 25,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    appointmentTime: {
      type: String,
      required: [true, 'Appointment time slot is required'],
      trim: true,
    },
    doctorName: {
      type: String,
      default: 'Dr. Sarah Johnson (Chief Orthodontist)',
      trim: true,
    },
    doctorId: {
      type: String,
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid', 'Refunded', 'Pending', 'Partial', 'Failed'],
      default: 'Unpaid',
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled', 'No Show'],
      default: 'Confirmed',
    },
    paymentMethod: {
      type: String,
      default: 'Card',
      trim: true,
    },
    transactionId: {
      type: String,
      default: () => `TXN-${Date.now()}`,
      trim: true,
    },
    paymentIntentId: {
      type: String,
      default: '',
      trim: true,
    },
    payments: [paymentRecordSchema],
    timeline: [timelineEventSchema],
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    staffNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for remaining balance
bookingSchema.virtual('remainingBalance').get(function () {
  const remaining = (this.totalAmount || 0) - (this.amountPaid || 0);
  return Math.max(0, remaining);
});

bookingSchema.index({ appointmentDate: 1, appointmentTime: 1, doctorName: 1 });
bookingSchema.index({ patientEmail: 1 });
bookingSchema.index({ bookingStatus: 1, paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
