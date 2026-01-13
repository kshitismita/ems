import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyReport extends Document {
    employee: mongoose.Types.ObjectId;
    project: mongoose.Types.ObjectId;
    date: Date;
    tasksCompleted: string[];
    tasksInProgress: string[];
    challenges: string[];
    achievements: string[];
    notes?: string;
    attachments?: Array<{
        url: string;
        public_id: string;
        name: string;
        size: number;
        resource_type: string;
        format: string;
    }>;
    submittedAt: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    feedback?: string;
    status: 'submitted' | 'reviewed' | 'approved' | 'rejected';
}

const dailyReportSchema = new Schema<IDailyReport>({
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Employee is required'],
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
    },
    tasksCompleted: [{
        type: String,
        trim: true,
    }],
    tasksInProgress: [{
        type: String,
        trim: true,
    }],
    challenges: [{
        type: String,
        trim: true,
    }],
    achievements: [{
        type: String,
        trim: true,
    }],
    notes: {
        type: String,
        trim: true,
    },
    attachments: [{
        url: String,
        public_id: String,
        name: String,
        size: Number,
        resource_type: String,
        format: String,
    }],
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedAt: {
        type: Date,
    },
    feedback: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['submitted', 'reviewed', 'approved', 'rejected'],
        default: 'submitted',
    },
}, {
    timestamps: true,
    collection: 'dailyreports'
});

dailyReportSchema.index({ employee: 1, date: -1 });
dailyReportSchema.index({ status: 1 });
dailyReportSchema.index({ reviewedBy: 1 });

dailyReportSchema.index({ employee: 1, date: 1 }, { unique: true });

const DailyReport = mongoose.models.DailyReport || mongoose.model<IDailyReport>('DailyReport', dailyReportSchema);
export default DailyReport;
