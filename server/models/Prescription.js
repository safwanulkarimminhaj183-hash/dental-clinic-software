import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true }, // e.g. "500mg"
  frequency: { type: String, required: true, trim: true }, // e.g. "Twice Daily after meals"
  duration: { type: String, required: true, trim: true }, // e.g. "5 Days"
  instructions: { type: String, default: '', trim: true },
}, { _id: true });

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => `RX-${Math.floor(100000 + Math.random() * 900000)}`,
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
    patientAge: {
      type: Number,
      default: 30,
    },
    patientPhone: {
      type: String,
      default: '',
    },
    doctorName: {
      type: String,
      required: true,
      default: 'Dr. Sarah Johnson (DDS, Orthodontics)',
    },
    doctorLicense: {
      type: String,
      default: 'DC-LICENSE-98412',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    medications: {
      type: [medicationSchema],
      required: true,
      default: [],
    },
    generalAdvice: {
      type: String,
      default: 'Maintain good oral hygiene. Avoid hard foods and rinse mouth with warm saline water twice daily.',
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    pdfUrl: {
      type: String,
      default: '',
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    lastResentAt: { type: Date, default: null },    
    resendCount: { type: Number, default: 0 }, 
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ patientEmail: 1, createdAt: -1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
