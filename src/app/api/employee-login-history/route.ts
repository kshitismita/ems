import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LoginHistory from '@/models/LoginHistory';
import { verifyToken } from '@/lib/auth';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  _id?: string;
}

// GET login history for the current employee
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user: AuthUser = verifyToken(token);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: any = { 
      $or: [
        { userId: user.id },
        { email: user.email }
      ]
    };
    
    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) query.loginTime.$gte = new Date(startDate);
      if (endDate) query.loginTime.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const loginHistory = await LoginHistory.find(query)
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LoginHistory.countDocuments(query);

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
    console.error('Employee Login History GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch login history' }, { status: 500 });
  }
}
