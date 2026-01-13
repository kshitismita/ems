import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: any;
}

export function withAuth(
  handler: (req: NextRequest, user: any, context?: any) => Promise<NextResponse>,
  requiredRole?: string
) {
  return async (req: NextRequest, context?: any) => {
    try {
      // Extract token from Authorization header or cookie
      let token = '';
      const authHeader = req.headers.get('authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        // Fallback to cookie
        const cookieToken = req.cookies.get('auth_token')?.value;
        if (cookieToken) {
          token = cookieToken;
        }
      }

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const user = verifyToken(token);

      console.log(`[AUTH_MIDDLEWARE] Request: ${req.method} ${req.nextUrl.pathname}`);
      console.log(`[AUTH_MIDDLEWARE] User: ${user.name} (${user.id}), Role: ${user.role}, Required: ${requiredRole || 'None'}`);

      // Check role requirements - case-insensitive and trimmed comparison
      const normalizedUserRole = user.role?.toString().trim().toLowerCase();
      const normalizedRequiredRole = requiredRole?.toString().trim().toLowerCase();

      if (normalizedRequiredRole && normalizedUserRole !== normalizedRequiredRole) {
        console.log(`[AUTH_MIDDLEWARE] Access Denied: User role '${normalizedUserRole}' does not match required role '${normalizedRequiredRole}'`);

        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Call the handler with the request, user, and context (for params)
      return await handler(req, user, context);
    } catch (error: any) {
      console.error('Authentication error details:', {
        message: error.message,
        stack: error.stack,
        url: req.nextUrl.pathname
      });

      // Handle token expiry specifically
      if (error.message === 'TOKEN_EXPIRED') {
        return NextResponse.json(
          {
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid token', details: error.message },
        { status: 401 }
      );
    }
  };
}

export default withAuth;
