import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

async function handleSearchEmployee(req: NextRequest, user: AuthUser) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Search by name or email (case-insensitive)
    const searchRegex = new RegExp(query.trim(), 'i');
    
    const employee = await User.findOne({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex }
      ]
    })
    .populate('reportingAdmin', 'name email')
    .populate('projects', 'name status');

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Employee found',
      employee
    });

  } catch (error) {
    console.error('Search employee error:', error);
    return NextResponse.json(
      { error: 'Failed to search employee' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return withAuth(handleSearchEmployee)(req);
}
