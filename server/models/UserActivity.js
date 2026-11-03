import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'view_service',
        'view_category',
        'search_service',
        'book_appointment',
        'emergency_request',
        'register',
        'login',
        'view_branch',
        'view_doctor',
        'post_op_recovery_create',
        'post_op_recovery_update',
        'post_op_recovery_archive',
        'post_op_recovery_restore',
        'post_op_recovery_followup',
        'post_op_recovery_view',
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

userActivitySchema.index({ userId: 1, action: 1 });
userActivitySchema.index({ email: 1, action: 1 });
userActivitySchema.index({ ipAddress: 1 });
userActivitySchema.index({ createdAt: -1 });

const UserActivity =
  mongoose.models.UserActivity ||
  mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;