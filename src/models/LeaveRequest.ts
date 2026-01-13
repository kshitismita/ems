import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveRequest extends Document {
    employee: mongoose.Types.ObjectId;
    type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid';
    startDate: Date;
    endDate: Date;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    attachments?: string[];
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
}

const leaveRequestSchema = new Schema<ILeaveRequest>({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Employee is required'],
    },
    type: {
        type: String,
        enum: ['sick', 'vacation', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid'],
        required: [true, 'Leave type is required'],
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
    },
    days: {
        type: Number,
        required: [true, 'Number of days is required'],
        min: 0.5,
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: {
        type: Date,
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    attachments: [{
        type: String,
    }],
    emergencyContact: {
        name: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        relationship: {
            type: String,
            trim: true,
        },
    },
}, {
    timestamps: true,
});

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ approvedBy: 1 });

const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
