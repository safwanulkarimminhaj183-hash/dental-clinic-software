import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    patientEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
    },
    patientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    treatmentPlanTitle: {
      type: String,
      required: [true, 'Treatment plan title is required'],
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Converted'],
      default: 'New',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

enquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Enquiry', enquirySchema);
