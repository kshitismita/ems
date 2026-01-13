import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';

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

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const userAgent = getUserAgent(req);
    const ipAddress = getClientIP(req);
    
    const tokenPair = await refreshAccessToken(refreshToken, userAgent, ipAddress);

    // Create response
    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: tokenPair.sessionId,
      expiresAt: tokenPair.expiresAt
    });

    // Update cookies
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

  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    if (error.message === 'REFRESH_TOKEN_EXPIRED') {
      return NextResponse.json(
        { 
          error: 'Refresh token expired',
          code: 'REFRESH_TOKEN_EXPIRED',
          requiresLogin: true
        },
        { status: 401 }
      );
    }

    if (error.message === 'Session not found or expired' || 
        error.message === 'User not found or inactive') {
      return NextResponse.json(
        { 
          error: 'Session invalid',
          code: 'SESSION_INVALID',
          requiresLogin: true
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Token refresh failed',
        details: error.message
      },
      { status: 401 }
    );
  }
}
