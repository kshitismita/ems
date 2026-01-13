import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import Project from '@/models/Project';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

// GET - Get API key access logs (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Extract and verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let user: AuthUser;
    try {
      user = verifyToken(token);
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Get the project with API keys
    const project = await Project.findById(projectId)
      .populate('apiKeys.addedBy', 'name email role')
      .lean();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is the admin of this project
    if (project.admin.toString() !== user.id) {
      return NextResponse.json({ error: 'Access denied - only project admin can view logs' }, { status: 403 });
    }

    // Return API keys with their usage information
    const apiKeysWithLogs = project.apiKeys?.map(key => ({
      _id: key._id,
      name: key.name,
      description: key.description,
      addedBy: key.addedBy,
      addedAt: key.addedAt,
      usageCount: key.usageCount || 0,
      lastUsed: key.lastUsed,
      // Note: In a real implementation, you'd store detailed access logs in a separate collection
      // For now, we're returning basic usage statistics
      accessLogs: key.lastUsed ? [{
        accessTime: key.lastUsed,
        userId: 'Unknown', // Would be populated from actual logs
        userName: 'Unknown',
        ipAddress: 'Unknown',
        userAgent: 'Unknown'
      }] : []
    })) || [];

    return NextResponse.json({
      projectId,
      projectName: project.name,
      apiKeys: apiKeysWithLogs,
      totalAccesses: apiKeysWithLogs.reduce((sum, key) => sum + (key.usageCount || 0), 0)
    });

  } catch (error) {
    console.error('Error fetching API key logs:', error);
    return NextResponse.json({ error: 'Failed to fetch API key logs' }, { status: 500 });
  }
}
