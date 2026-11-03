import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      default: '',
      trim: true,
    },
    frequency: {
      type: String,
      default: 'Once daily',
      trim: true,
    },
    duration: {
      type: String,
      default: '5 days',
      trim: true,
    },
    prescribedDate: {
      type: Date,
      default: Date.now,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: false }
);

const xrayImageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'X-ray report title is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'X-ray image URL or data is required'],
    },
    modality: {
      type: String,
      enum: ['OPG Panoramic', 'Bitewing', 'Periapical', 'CBCT 3D', 'Cephalometric', 'Dental Photo', 'Other'],
      default: 'Periapical',
    },
    fileType: {
      type: String,
      default: 'image/jpeg',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    radiologistNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: false }
);

const pastTreatmentSchema = new mongoose.Schema(
  {
    treatmentDate: {
      type: Date,
      default: Date.now,
    },
    procedure: {
      type: String,
      required: [true, 'Treatment procedure is required'],
      trim: true,
    },
    toothNumber: {
      type: String,
      default: 'All / General',
      trim: true,
    },
    doctorName: {
      type: String,
      default: 'Dr. Sarah Johnson',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Completed', 'In Progress', 'Scheduled'],
      default: 'Completed',
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    nextSteps: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    treatmentProcedure: {
      type: String,
      required: [true, 'Treatment procedure is required'],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid', 'paid', 'partial', 'unpaid'],
      default: 'Unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer', 'Online', 'Insurance', 'Other'],
      default: 'Cash',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: false }
);

const patientAppointmentSchema = new mongoose.Schema(
  {
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
      trim: true,
    },
    doctorName: {
      type: String,
      default: 'Dr. Sarah Johnson',
      trim: true,
    },
    department: {
      type: String,
      default: 'General Dentistry',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Confirmed', 'Completed', 'Cancelled', 'pending', 'approved', 'confirmed', 'completed', 'cancelled'],
      default: 'Pending',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { _id: true, timestamps: false }
);

// Tooth History Schema for Lifecycle Tracking
const toothHistorySchema = new mongoose.Schema(
  {
    toothNumber: {
      type: String,
      required: true,
      trim: true,
    },
    timeline: [
      {
        date: {
          type: Date,
          required: true,
        },
        procedure: {
          type: String,
          required: true,
          trim: true,
        },
        doctor: {
          type: String,
          default: 'Dr. Sarah Johnson',
          trim: true,
        },
        status: {
          type: String,
          enum: ['Completed', 'In Progress', 'Proposed', 'Failed'],
          default: 'Completed',
        },
        notes: {
          type: String,
          default: '',
          trim: true,
        },
        cost: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { _id: true, timestamps: false }
);

// Lab Work Order Tracking Schema
const labOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    toothNumber: {
      type: String,
      required: true,
      trim: true,
    },
    labType: {
      type: String,
      enum: ['Crown', 'Bridge', 'Denture', 'Implant Abutment', 'Orthodontic Appliance', 'Other'],
      required: true,
    },
    material: {
      type: String,
      default: 'Porcelain',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Sent to Lab', 'In-Production', 'Received', 'Fitted', 'Cancelled'],
      default: 'Pending',
    },
    sentDate: {
      type: Date,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    fittedDate: {
      type: Date,
    },
    cabinetLocation: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

// Post-Op Recovery Tracking Schema
const postOpRecoverySchema = new mongoose.Schema(
  {
    treatmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    procedure: {
      type: String,
      required: true,
      trim: true,
    },
    treatmentDate: {
      type: Date,
      required: true,
    },
    followUpStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Urgent Follow-up Required', 'Patient Non-Responsive'],
      default: 'Pending',
    },
    painLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    feedbackDate: {
      type: Date,
    },
    infectionRisk: {
      type: String,
      enum: ['Low', 'Moderate', 'High'],
      default: 'Low',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    urgentFlag: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true }
);

const medicalHistorySchema = new mongoose.Schema(
  {
    allergies: {
      type: [String],
      default: [],
    },
    conditions: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
    bloodPressure: {
      type: String,
      default: '120/80 mmHg',
      trim: true,
    },
    heartRate: {
      type: String,
      default: '72 bpm',
      trim: true,
    },
    bloodSugar: {
      type: String,
      default: 'Normal',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const patientRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
      default: null,
    },
    patientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    patientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Unspecified'],
      default: 'Unspecified',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    emergencyContact: {
      type: String,
      default: '',
      trim: true,
    },
    medicalHistory: {
      type: medicalHistorySchema,
      default: () => ({}),
    },
    prescriptions: {
      type: [prescriptionSchema],
      default: [],
    },
    xrayImages: {
      type: [xrayImageSchema],
      default: [],
    },
    pastTreatments: {
      type: [pastTreatmentSchema],
      default: [],
    },
    invoices: {
      type: [invoiceSchema],
      default: [],
    },
    appointments: {
      type: [patientAppointmentSchema],
      default: [],
    },
    // Advanced Dental Features
    toothHistory: {
      type: [toothHistorySchema],
      default: [],
    },
    labOrders: {
      type: [labOrderSchema],
      default: [],
    },
    postOpRecovery: {
      type: [postOpRecoverySchema],
      default: [],
    },
    complianceStatus: {
      type: String,
      enum: ['Excellent', 'Good', 'Moderate', 'Low Attendance Risk', 'High Dropout Risk'],
      default: 'Good',
    },
    medicalRiskFlags: {
      anesthesiaContraindication: {
        type: Boolean,
        default: false,
      },
      drugInteractionRisk: {
        type: Boolean,
        default: false,
      },
      highRiskWarning: {
        type: String,
        default: '',
        trim: true,
      },
      lastRiskAssessment: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias: treatmentHistory <-> pastTreatments
patientRecordSchema.virtual('treatmentHistory').get(function () {
  return this.pastTreatments;
});

patientRecordSchema.virtual('treatmentHistory').set(function (val) {
  this.pastTreatments = val;
});

// Index search fields
patientRecordSchema.index({ patientId: 1, patientName: 1, patientPhone: 1 });
patientRecordSchema.index({ 'invoices.paymentStatus': 1, 'invoices.dueAmount': 1 });

const PatientRecord = mongoose.models.PatientRecord || mongoose.model('PatientRecord', patientRecordSchema);
export default PatientRecord;
