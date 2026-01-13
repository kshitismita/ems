import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  plainTextPassword?: string; // Store actual password for admin viewing (SECURITY RISK)
  role: 'admin' | 'employee';
  employeeId?: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  isActive: boolean;
  profileImage?: string;
  reportingAdmin?: mongoose.Types.ObjectId;
  projects?: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  plainTextPassword: {
    type: String,
    select: false, // Don't include in queries by default for security
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee',
    required: true,
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
  },
  department: {
    type: String,
    trim: true,
  },
  position: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
  },
  hireDate: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  profileImage: {
    type: String,
  },
  reportingAdmin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  projects: [{
    type: Schema.Types.ObjectId,
    ref: 'Project',
  }],
}, {
  timestamps: true,
});

// Hash password before saving and store plain text for admin viewing
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    // If password is not modified, do nothing
    return;
  }

  try {
    // Check if the password is already hashed (bcrypt hashes start with $2a$ or $2b$)
    const isAlreadyHashed = this.password.startsWith('$2a$') || this.password.startsWith('$2b$');
    if (isAlreadyHashed) {
      return;
    }

    // Store plain text password for admin viewing (SECURITY RISK)
    this.plainTextPassword = this.password;

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User as mongoose.Model<IUser>;
