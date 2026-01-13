import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, revokeAllUserSessions } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, logoutAll = false } = await req.json();
    
    // Try to get token from header or cookie
    let token = '';
    const authHeader = req.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieToken = req.cookies.get('auth_token')?.value;
      if (cookieToken) {
        token = cookieToken;
      }
    }

    // Create response with cleared cookies
    const response = NextResponse.json({
      message: 'Logout successful'
    });

    // Clear all auth cookies
    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');
    response.cookies.delete('session_id');

    if (token) {
      try {
        const user = verifyToken(token);
        
        if (logoutAll) {
          // Revoke all sessions for this user
          await revokeAllUserSessions(user.id, 'User logged out');
        } else if (sessionId) {
          // Revoke specific session
          await revokeSession(sessionId, 'User logged out');
        } else if (user.sessionId) {
          // Revoke current session
          await revokeSession(user.sessionId, 'User logged out');
        }
      } catch (error) {
        // Token is invalid, but we still want to clear cookies
        console.log('Token verification failed during logout:', error);
      }
    }

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Even if there's an error, clear cookies
    const response = NextResponse.json({
      message: 'Logout completed (with warnings)',
      warning: error.message
    });

    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');
    response.cookies.delete('session_id');

    return response;
  }
}

export async function GET(req: NextRequest) {
  // Handle GET request for logout (useful for direct navigation)
  return POST(req);
}
