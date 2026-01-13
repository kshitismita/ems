import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: string;
  sessionId: string;
  refreshToken: string;
  accessToken: string;
  userAgent?: string;
  ipAddress?: string;
  lastActivity: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  isExpired(): boolean;
  isActive(): boolean;
  revoke(reason?: string): Promise<ISession>;
}

export interface ISessionModel extends mongoose.Model<ISession> {
  findActiveByUserId(userId: string): Promise<ISession[]>;
  revokeAllByUserId(userId: string, reason?: string): Promise<any>;
  cleanupExpired(): Promise<any>;
}

const sessionSchema = new Schema<ISession>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  revoked: {
    type: Boolean,
    default: false,
    index: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

// Method to check if session is expired
sessionSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

// Method to check if session is active
sessionSchema.methods.isActive = function(): boolean {
  return !this.revoked && !this.isExpired();
};

// Method to revoke session
sessionSchema.methods.revoke = function(reason?: string) {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason || 'Manual revocation';
  return this.save();
};

// Static method to find active sessions for user
sessionSchema.statics.findActiveByUserId = function(userId: string) {
  return this.find({
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Static method to revoke all sessions for user
sessionSchema.statics.revokeAllByUserId = function(userId: string, reason?: string) {
  return this.updateMany(
    { userId, revoked: false },
    { 
      revoked: true, 
      revokedAt: new Date(), 
      revokedReason: reason || 'User logout' 
    }
  );
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { revoked: true, revokedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete revoked sessions after 24h
    ]
  });
};

export default (mongoose.models.Session as ISessionModel) || mongoose.model<ISession, ISessionModel>('Session', sessionSchema);
