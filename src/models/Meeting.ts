import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
    title: string;
    description?: string;
    agenda?: string[];
    meetingLink?: string;
    startTime: Date;
    endTime: Date;
    organizer: mongoose.Types.ObjectId;
    attendees: mongoose.Types.ObjectId[];
    status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
    location?: string;
    isRecurring: boolean;
    recurrence?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        endDate?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
    {
        title: {
            type: String,
            required: [true, 'Meeting title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        agenda: [{
            type: String,
            trim: true,
        }],
        meetingLink: {
            type: String,
            trim: true,
        },
        startTime: {
            type: Date,
            required: [true, 'Start time is required'],
        },
        endTime: {
            type: Date,
            required: [true, 'End time is required'],
        },
        organizer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Organizer is required'],
        },
        attendees: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        status: {
            type: String,
            enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
            default: 'scheduled',
        },
        location: {
            type: String,
            trim: true,
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurrence: {
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly'],
            },
            interval: {
                type: Number,
                min: 1,
            },
            endDate: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
MeetingSchema.index({ startTime: 1, status: 1 });
MeetingSchema.index({ attendees: 1, startTime: 1 });
MeetingSchema.index({ organizer: 1 });

// Pre-save hook to validate end time is after start time
MeetingSchema.pre('save', function(next: any) {
    if (this.endTime && this.startTime && this.endTime <= this.startTime) {
        const error = new Error('End time must be after start time');
        return next(error);
    }
    next();
});

export default mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);
