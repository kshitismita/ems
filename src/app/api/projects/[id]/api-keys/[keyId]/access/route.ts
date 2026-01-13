import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import Project from '@/models/Project';
import ApiKeyLog from '@/models/ApiKeyLog';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

// POST - Log API key access and return the key value
export async function POST(
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

    // Get the project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access to this project
    const hasAccess = user.role === 'admin' ||
      project.admin.toString() === user.id ||
      project.assignedEmployees.some(empId => empId.toString() === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied - you must be assigned to this project' }, { status: 403 });
    }

    // Find the API key
    const apiKey = project.apiKeys?.find(key => key._id.toString() === keyId);
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Get client IP and user agent for logging
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log the access to database
    await ApiKeyLog.create({
      projectId,
      apiKeyId: keyId,
      userId: user.id,
      userName: user.name,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });

    console.log(`API Key Access Logged`);

    // Update usage count and last used time
    await Project.findByIdAndUpdate(
      projectId,
      {
        $inc: { 'apiKeys.$[elem].usageCount': 1 },
        $set: {
          'apiKeys.$[elem].lastUsed': new Date(),
          'apiKeys.$[elem].lastUsedBy': user.id
        }
      },
      {
        arrayFilters: [{ 'elem._id': keyId }]
      }
    );

    return NextResponse.json({
      message: 'API key accessed successfully',
      apiKey: {
        name: apiKey.name,
        keyValue: apiKey.keyValue,
        description: apiKey.description,
        usageCount: (apiKey.usageCount || 0) + 1,
        lastUsed: new Date()
      }
    });

  } catch (error) {
    console.error('Error accessing API key:', error);
    return NextResponse.json({ error: 'Failed to access API key' }, { status: 500 });
  }
}
