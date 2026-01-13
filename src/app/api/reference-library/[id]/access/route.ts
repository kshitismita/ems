import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import ReferenceLibrary from '@/models/ReferenceLibrary';
import ApiKeyLog from '@/models/ApiKeyLog';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

// POST - Record access to a Reference Library API Key
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Extract and verify token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let user: AuthUser;
        try {
            user = verifyToken(token);
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await connectDB();

        const resource = await ReferenceLibrary.findById(id);
        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        if (resource.category !== 'api-keys' || !resource.apiKeyDetails) {
            return NextResponse.json({ error: 'Not an API key resource' }, { status: 400 });
        }

        // Get client IP and user agent for logging
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Log the access to database
        await ApiKeyLog.create({
            referenceId: id,
            apiKeyId: id, // For ref library, the document ID itself is the "key" ID context
            userId: user.id,
            userName: user.name,
            ipAddress,
            userAgent,
            timestamp: new Date()
        });

        console.log(`Reference Library API Key Access Logged`);

        // Update usage count and last used in the resource
        // We use dot notation for nested fields update
        resource.apiKeyDetails.usageCount = (resource.apiKeyDetails.usageCount || 0) + 1;
        resource.apiKeyDetails.lastUsed = new Date();
        resource.apiKeyDetails.lastUsedBy = user.id;
        await resource.save();

        return NextResponse.json({
            success: true,
            apiKey: {
                keyValue: resource.apiKeyDetails.keyValue
            }
        });

    } catch (error) {
        console.error('Error accessing API key:', error);
        return NextResponse.json({ error: 'Failed to access API key' }, { status: 500 });
    }
}
