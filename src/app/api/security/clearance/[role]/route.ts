import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

/**
 * Backend clearance check.
 * This route is called by AuthGuard to verify role on the server side
 * and trigger an "Unauthorized Access Alert" log if the role doesn't match.
 */
async function handleClearanceCheck(req: NextRequest, user: any, context: { params: { role: string } }) {
    return NextResponse.json({
        authorized: true,
        user: {
            id: user.id,
            role: user.role,
            name: user.name
        }
    });
}

export async function GET(req: NextRequest, context: { params: Promise<{ role: string }> }) {
    const { role } = await context.params;

    // Validate role parameter
    if (role !== 'admin' && role !== 'employee') {
        return NextResponse.json({ error: 'Invalid role requested' }, { status: 400 });
    }

    // Use withAuth with the dynamic role to trigger the security log automatically
    return withAuth(
        (request, user) => handleClearanceCheck(request, user, { params: { role } }),
        role as 'admin' | 'employee'
    )(req);
}
