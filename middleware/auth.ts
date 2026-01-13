import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AuthUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

export type { AuthUser } from '@/lib/auth';
export { canAccessEmployee, canAccessProject } from '@/lib/auth';

export function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
  requiredRole?: 'admin' | 'manager' | 'employee'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      await connectDB();

      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization token required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const user = verifyToken(token);

      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  };
}

export function withAdminAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return withAuth(handler, 'admin');
}

export function withManagerAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return withAuth(handler, 'manager');
}
