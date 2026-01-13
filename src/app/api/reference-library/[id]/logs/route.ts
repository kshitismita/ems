import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import ApiKeyLog from '@/models/ApiKeyLog';
import ReferenceLibrary from '@/models/ReferenceLibrary';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

// GET - Get access logs for a specific Reference Library API Key
export async function GET(
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

        // Verify User Role - Only Admin should see full logs
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied: Admin only' }, { status: 403 });
        }

        const resource = await ReferenceLibrary.findById(id);
        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        // Get logs with pagination
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const logs = await ApiKeyLog.find({ referenceId: id })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ApiKeyLog.countDocuments({ referenceId: id });

        return NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
