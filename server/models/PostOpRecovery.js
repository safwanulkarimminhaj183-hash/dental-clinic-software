import mongoose from 'mongoose';

export const RECOVERY_STATUSES = ['Recovering', 'Needs Attention', 'Completed'];
export const FOLLOW_UP_STATUSES = ['Pending', 'Scheduled', 'Completed', 'Missed', 'Not Required'];
export const SWELLING_LEVELS = ['None', 'Mild', 'Moderate', 'Severe'];
export const BLEEDING_LEVELS = ['None', 'Minimal', 'Moderate', 'Heavy'];

// One entry per clinical assessment. Entries are append-only so that earlier
// readings (pain, swelling, bleeding...) are preserved when a record is edited.
const assessmentSchema = new mongoose.Schema(
  {
    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: String, default: '' },
    painLevel: { type: Number, min: 0, max: 10, required: true },
    swelling: { type: String, enum: SWELLING_LEVELS, default: 'None' },
    bleeding: { type: String, enum: BLEEDING_LEVELS, default: 'None' },
    symptoms: { type: String, default: '', trim: true, maxlength: 1000 },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: true, timestamps: false }
);

const postOpRecoverySchema = new mongoose.Schema(
  {
    // Link to the existing patient record — never a copy of the patient.
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientRecord', required: true, index: true },
    patientId: { type: String, required: true, trim: true, uppercase: true, index: true },
    patientName: { type: String, required: true, trim: true },

    procedure: { type: String, required: [true, 'Dental procedure is required'], trim: true, maxlength: 150 },
    procedureDate: { type: Date, required: [true, 'Procedure date is required'] },
    dentistName: { type: String, required: [true, 'Assigned dentist is required'], trim: true, maxlength: 120 },
    dentistId: { type: String, default: '', trim: true },
    recoveryStartDate: { type: Date, required: [true, 'Recovery start date is required'] },

    // Latest reading (mirrors the newest entry in `assessments`)
    painLevel: { type: Number, min: 0, max: 10, required: true },
    swelling: { type: String, enum: SWELLING_LEVELS, default: 'None' },
    bleeding: { type: String, enum: BLEEDING_LEVELS, default: 'None' },
    symptoms: { type: String, default: '', trim: true, maxlength: 1000 },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    careInstructions: { type: String, default: '', trim: true, maxlength: 3000 },

    recoveryStatus: { type: String, enum: RECOVERY_STATUSES, default: 'Recovering', index: true },

    followUpDate: { type: Date, default: null },
    followUpStatus: { type: String, enum: FOLLOW_UP_STATUSES, default: 'Pending' },
    // Reference into the existing Appointment collection (no second appointment system)
    followUpAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    followUpSyncNote: { type: String, default: '' },

    assessments: { type: [assessmentSchema], default: [] },

    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: String, default: '' },
    archiveReason: { type: String, default: '', trim: true, maxlength: 500 },

    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

postOpRecoverySchema.index({ followUpDate: 1, recoveryStatus: 1 });
postOpRecoverySchema.index({ isArchived: 1, createdAt: -1 });

const PostOpRecovery =
  mongoose.models.PostOpRecovery || mongoose.model('PostOpRecovery', postOpRecoverySchema);
export default PostOpRecovery;