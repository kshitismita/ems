import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import Session from '@/models/Session';
import { cleanupExpiredSessions } from '@/lib/auth';

// Get active sessions for the current user
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Cleanup expired sessions periodically
    await cleanupExpiredSessions();

    const sessions = await Session.findActiveByUserId(user.id);
    
    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === user.sessionId
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      total: formattedSessions.length
    });

  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
});

// Revoke a specific session
export const DELETE = withAuth(async (req: NextRequest, user: any) => {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Find the session to ensure it belongs to the current user
    const session = await Session.findOne({
      sessionId,
      userId: user.id
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Don't allow revoking the current session through this endpoint
    if (session.sessionId === user.sessionId) {
      return NextResponse.json(
        { error: 'Cannot revoke current session through this endpoint' },
        { status: 400 }
      );
    }

    await session.revoke('User manually revoked session');

    return NextResponse.json({
      message: 'Session revoked successfully'
    });

  } catch (error: any) {
    console.error('Error revoking session:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
});
