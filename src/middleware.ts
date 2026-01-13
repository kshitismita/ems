import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(req: NextRequest) {
    const token = req.cookies.get('auth_token')?.value;
    const { pathname } = req.nextUrl;

    // 1. Protected routes (dashboards)
    const isDashboardRoute = pathname.startsWith('/admin-dash') ||
        pathname.startsWith('/employee-dash') ||
        pathname.startsWith('/(dashboard)'); // if accessed directly via group path

    if (isDashboardRoute && !token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Auth routes (login/register) - if already logged in, redirect home or to dash
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

    if (isAuthRoute && token) {
        try {
            const user = verifyToken(token);
            const dashboardUrl = user.role === 'admin' ? '/admin-dash' : '/employee-dash';
            return NextResponse.redirect(new URL(dashboardUrl, req.url));
        } catch (e) {
            // Invalid token, let them proceed to login
        }
    }

    // 3. Root page redirection
    if (pathname === '/' && token) {
        try {
            const user = verifyToken(token);
            const dashboardUrl = user.role === 'admin' ? '/admin-dash' : '/employee-dash';
            return NextResponse.redirect(new URL(dashboardUrl, req.url));
        } catch (e) {
            // Ignore invalid token
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
