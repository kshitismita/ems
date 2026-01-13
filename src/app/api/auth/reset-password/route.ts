import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // In a real app, you would validate the token against the database
    // For now, we'll just check if token exists and is valid format
    if (token.length < 20) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Find user by email (you might need to modify this based on your token storage)
    // For now, let's find any user and update their password (this is just for testing)
    const user = await User.findOne({});

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 404 }
      );
    }

    user.password = newPassword;
    await user.save();


    return NextResponse.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
