import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LoginHistory from '@/models/LoginHistory';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  _id?: string;
}

export async function GET(req: NextRequest) {
  try {
    console.log('Login History API - Request received');
    
    // Extract token from Authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Login History API - No token provided');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Login History API - Token extracted');
    
    let user: AuthUser;
    try {
      user = verifyToken(token);
      console.log('Login History API - Token verified, user:', user);
    } catch (error) {
      console.log('Login History API - Invalid token:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only admins can view login history
    if (user.role !== 'admin') {
      console.log('Login History API - Non-admin access denied for user:', user.email);
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const email = searchParams.get('email');
    const success = searchParams.get('success');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const stats = searchParams.get('stats') === 'true';

    console.log('Login History API - Query params:', { page, limit, email, success, startDate, endDate, stats });

    await connectDB();
    console.log('Login History API - Connected to DB');

    if (stats) {
      console.log('Login History API - Fetching stats');
      // Fetch stats logic here
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [successfulLogins, failedLogins] = await Promise.all([
        LoginHistory.countDocuments({ success: true, loginTime: { $gte: startDate } }),
        LoginHistory.countDocuments({ success: false, loginTime: { $gte: startDate } })
      ]);

      const totalLogins = successfulLogins + failedLogins;
      const successRate = totalLogins > 0 ? (successfulLogins / totalLogins * 100).toFixed(2) : 0;

      return NextResponse.json({
        summary: {
          total: totalLogins,
          successful: successfulLogins,
          failed: failedLogins,
          successRate: successRate + '%'
        }
      });
    }

    console.log('Login History API - Fetching history');
    
    let query: any = {};
    
    if (email) query.email = { $regex: email, $options: 'i' };
    if (success !== null) query.success = success === 'true';
    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) query.loginTime.$gte = new Date(startDate);
      if (endDate) query.loginTime.$lte = new Date(endDate);
    }

    console.log('Login History API - MongoDB query:', query);

    const skip = (page - 1) * limit;

    const loginHistory = await LoginHistory.find(query)
      .populate('userId', 'name email role')
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LoginHistory.countDocuments(query);

    console.log('Login History API - Found records:', loginHistory.length, 'Total:', total);

    return NextResponse.json({
      loginHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Login History API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch login history' },
      { status: 500 }
    );
  }
}
