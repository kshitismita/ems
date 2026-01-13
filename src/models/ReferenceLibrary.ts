import mongoose, { Document, Schema } from 'mongoose';
import './User'; // Ensure User model is registered

export interface IReferenceLibrary extends Document {
    title: string;
    description: string;
    category: string;
    tags: string[];
    url?: string;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    isPublic: boolean;
    downloads: number;
    apiKeyDetails?: {
        keyValue: string;
        description?: string;
        usageCount: number;
        lastUsed?: Date;
        lastUsedBy?: mongoose.Types.ObjectId;
    };
}

const referenceLibrarySchema = new Schema<IReferenceLibrary>({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['policy', 'onboarding', 'compliance', 'training', 'prompts', 'links', 'api-keys', 'other'],
        default: 'other'
    },
    tags: [{ type: String, trim: true }],
    url: { type: String, trim: true },
    apiKeyDetails: {
        keyValue: String,
        description: String,
        usageCount: { type: Number, default: 0 },
        lastUsed: Date,
        lastUsedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    isPublic: { type: Boolean, default: false },
    downloads: { type: Number, default: 0 }
});

// Indexes for better performance
referenceLibrarySchema.index({ title: 1 });
referenceLibrarySchema.index({ category: 1 });
referenceLibrarySchema.index({ uploadedBy: 1 });
referenceLibrarySchema.index({ isPublic: 1 });

const ReferenceLibrary = mongoose.models.ReferenceLibrary || mongoose.model<IReferenceLibrary>('ReferenceLibrary', referenceLibrarySchema);
export default ReferenceLibrary;
