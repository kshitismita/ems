import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
    employee: mongoose.Types.ObjectId;
    date: Date;
    checkIn: Date;
    checkOut?: Date;
    breakStart?: Date;
    breakEnd?: Date;
    totalHours?: number;
    overtimeHours?: number;
    status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'leave' | 'work-from-home';
    notes?: string;
    location?: string;
    approvedBy?: mongoose.Types.ObjectId;
    isApproved: boolean;
}

const attendanceSchema = new Schema<IAttendance>({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Employee is required'],
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
    },
    checkIn: {
        type: Date,
        required: [true, 'Check-in time is required'],
    },
    checkOut: {
        type: Date,
    },
    breakStart: {
        type: Date,
    },
    breakEnd: {
        type: Date,
    },
    totalHours: {
        type: Number,
        min: 0,
    },
    overtimeHours: {
        type: Number,
        min: 0,
        default: 0,
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave', 'work-from-home'],
        default: 'present',
    },
    notes: {
        type: String,
        trim: true,
    },
    location: {
        type: String,
        trim: true,
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    isApproved: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: 1 });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', attendanceSchema);
