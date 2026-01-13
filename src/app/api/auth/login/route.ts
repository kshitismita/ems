import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import LoginHistory from '@/models/LoginHistory';
import { generateTokenPair, createAuthUser, generateToken } from '@/lib/auth';

export const runtime = 'nodejs';

// Helper function to get client IP address
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  return ip;
}

// Helper function to get user agent
function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}

// Helper function to record login attempt
async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  userId?: string,
  failureReason?: string
) {
  try {
    const loginHistory = new LoginHistory({
      email,
      success,
      ipAddress,
      userAgent,
      userId,
      failureReason,
    });
    await loginHistory.save();
  } catch (error) {
    console.error('Failed to record login history:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await req.json();
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Find user by email only (employee ID is auto-generated)
    console.log(`📡 Login attempt for email: ${email}`);
    const user = await User.findOne({ email });
    console.log(`👤 User found: ${!!user}`);

    if (!user) {
      await recordLoginAttempt(
        email,
        false,
        ipAddress,
        userAgent,
        undefined,
        'User not found by email'
      );
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await recordLoginAttempt(
        user.email,
        false,
        ipAddress,
        userAgent,
        user._id.toString(),
        'Invalid password'
      );
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      await recordLoginAttempt(
        user.email,
        false,
        ipAddress,
        userAgent,
        user._id.toString(),
        'Account is inactive'
      );
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 401 }
      );
    }

    // Auto-assign employee ID if user doesn't have one
    if (!user.employeeId) {
      const generatedEmployeeId = 'EMP' + Math.random().toString(36).substr(2, 9).toUpperCase();
      user.employeeId = generatedEmployeeId;
      await user.save();
    }

    // Record successful login
    await recordLoginAttempt(
      user.email,
      true,
      ipAddress,
      userAgent,
      user._id.toString()
    );

    // Generate token pair
    const authUser = createAuthUser(user);
    const tokenPair = await generateTokenPair(authUser, userAgent, ipAddress);
    
    // Also generate legacy token for backward compatibility
    const legacyToken = generateToken(authUser);

    // Create response
    const response = NextResponse.json({
      message: 'Login successful',
      user: authUser,
      token: legacyToken, // Legacy token for backward compatibility
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: tokenPair.sessionId,
      expiresAt: tokenPair.expiresAt
    });

    // Set cookies
    response.cookies.set('auth_token', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
    
    response.cookies.set('refresh_token', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    
    response.cookies.set('session_id', tokenPair.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;

  } catch (error) {
    console.error('💥 Login error details:', error);
    return NextResponse.json(
      {
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
