import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';

interface ResetToken {
  email: string;
  token: string;
  expiresAt: Date;
}

// In-memory store for reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, ResetToken>();

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store reset token
    resetTokens.set(resetToken, {
      email,
      token: resetToken,
      expiresAt
    });


    // In a real app, you would send an email here
    console.log(`🔑 Password reset token generated for ${email}: ${resetToken}`);

    return NextResponse.json({
      message: 'Password reset link sent successfully',
      // In production, don't return the token in the response
      debug: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
