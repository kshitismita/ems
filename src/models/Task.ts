import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    title: string;
    description: string;
    assignedTo: mongoose.Types.ObjectId;
    assignedBy: mongoose.Types.ObjectId;
    project?: mongoose.Types.ObjectId;
    status: 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: Date;
    estimatedHours?: number;
    actualHours?: number;
    tags?: string[];
    attachments?: string[];
    dependencies?: mongoose.Types.ObjectId[];
    comments: Array<{
        user: mongoose.Types.ObjectId;
        comment: string;
        createdAt: Date;
    }>;
    completedAt?: Date;
}

const taskSchema = new Schema<ITask>({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Task description is required'],
        trim: true,
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigned to is required'],
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigned by is required'],
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'completed', 'cancelled'],
        default: 'todo',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    dueDate: {
        type: Date,
    },
    estimatedHours: {
        type: Number,
        min: 0,
    },
    actualHours: {
        type: Number,
        min: 0,
    },
    tags: [{
        type: String,
        trim: true,
    }],
    attachments: [{
        type: String,
    }],
    dependencies: [{
        type: Schema.Types.ObjectId,
        ref: 'Task',
    }],
    comments: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    }],
    completedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });

export default mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);
