import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import ApiKeyLog from '@/models/ApiKeyLog';
import Project from '@/models/Project';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

// GET - Get access logs for a specific API key
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; keyId: string }> }
) {
    try {
        const { id: projectId, keyId } = await params;

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

        // Verify Project Access
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Only Admin or Assigned Employees can view logs? Or strictly Admin?
        // User requested "full log", usually implies sensitive or admin-level data.
        // Let's allow admins and assigned employees for now.
        const hasAccess = user.role === 'admin' ||
            project.admin.toString() === user.id ||
            project.assignedEmployees.some(empId => empId.toString() === user.id);

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get logs with pagination
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const logs = await ApiKeyLog.find({ apiKeyId: keyId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ApiKeyLog.countDocuments({ apiKeyId: keyId });

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
        console.error('Error fetching API key logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
