import mongoose from 'mongoose';

const LoginHistorySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  loginTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  success: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  failureReason: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true
});

// Index for better query performance
LoginHistorySchema.index({ loginTime: -1 });
LoginHistorySchema.index({ email: 1, loginTime: -1 });
LoginHistorySchema.index({ success: 1, loginTime: -1 });

export default mongoose.models.LoginHistory || mongoose.model('LoginHistory', LoginHistorySchema);
