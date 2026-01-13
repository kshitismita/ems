import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
    name: string;
    description: string;
    status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    startDate: Date;
    endDate?: Date;
    deadline?: Date;
    budget?: number;
    assignedEmployees: mongoose.Types.ObjectId[];
    admin: mongoose.Types.ObjectId;
    progress: number;
    tags?: string[];
    attachments?: string[];
    referenceUrls?: string[];
    workflow?: {
        currentStage: string;
        stages: Array<{
            name: string;
            description?: string;
            completed: boolean;
            completedAt?: Date;
        }>;
    };
    remarks?: Array<{
        text: string;
        createdBy: mongoose.Types.ObjectId;
        createdAt: Date;
    }>;
    documents?: Array<{
        name: string;
        url: string;
        fileType: string;
        size: number;
        uploadedBy: mongoose.Types.ObjectId;
        uploadedAt: Date;
    }>;
    referenceLinks?: Array<{
        title: string;
        url: string;
        addedBy: mongoose.Types.ObjectId;
        addedAt: Date;
    }>;
    apiKeys?: Array<{
        name: string;
        keyValue: string;
        description?: string;
        addedBy: mongoose.Types.ObjectId;
        addedAt: Date;
        lastUsed?: Date;
        lastUsedBy?: mongoose.Types.ObjectId;
        usageCount?: number;
    }>;
    createdBy: mongoose.Types.ObjectId;
}

const projectSchema = new Schema<IProject>({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Project description is required'],
        trim: true,
    },
    status: {
        type: String,
        enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
        default: 'planning',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
    },
    endDate: {
        type: Date,
    },
    deadline: {
        type: Date,
    },
    budget: {
        type: Number,
        min: 0,
    },
    assignedEmployees: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Project admin is required'],
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },
    tags: [{
        type: String,
        trim: true,
    }],
    attachments: [{
        type: String,
    }],
    referenceUrls: [{
        type: String,
        trim: true,
    }],
    workflow: {
        currentStage: {
            type: String,
            default: 'planning',
        },
        stages: [{
            name: {
                type: String,
                required: true,
            },
            description: {
                type: String,
            },
            completed: {
                type: Boolean,
                default: false,
            },
            completedAt: {
                type: Date,
            },
        }],
    },
    remarks: [{
        text: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
    }],
    documents: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileType: String,
        size: Number,
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        uploadedAt: { type: Date, default: Date.now },
    }],
    referenceLinks: [{
        title: { type: String, required: true },
        url: { type: String, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
    }],
    apiKeys: [{
        name: { type: String, required: true },
        keyValue: { type: String, required: true },
        description: { type: String },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
        lastUsed: { type: Date },
        lastUsedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        usageCount: { type: Number, default: 0 },
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

projectSchema.index({ admin: 1, status: 1 });
projectSchema.index({ assignedEmployees: 1 });
projectSchema.index({ deadline: 1 });

export default mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
