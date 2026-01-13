import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKeyLog extends Document {
    projectId?: mongoose.Types.ObjectId;
    referenceId?: mongoose.Types.ObjectId;
    apiKeyId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    userName: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    timestamp: Date;
}

const apiKeyLogSchema = new Schema<IApiKeyLog>({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
    },
    referenceId: {
        type: Schema.Types.ObjectId,
        ref: 'ReferenceLibrary',
    },
    apiKeyId: {
        type: Schema.Types.ObjectId, // Can be embedded ID in Project or ReferenceLibrary _id
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    ipAddress: String,
    userAgent: String,
    endpoint: String,
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false, // We use custom timestamp field
});

// Index for efficient querying by key and project
apiKeyLogSchema.index({ projectId: 1, apiKeyId: 1, timestamp: -1 });

const ApiKeyLog = mongoose.models.ApiKeyLog || mongoose.model<IApiKeyLog>('ApiKeyLog', apiKeyLogSchema);
export default ApiKeyLog;
