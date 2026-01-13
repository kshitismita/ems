import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

/**
 * Demo Admin Config Route
 * This route is protected by withAuth with 'admin' requirement.
 * Accessing this with an 'employee' role will trigger an "Unauthorized Access Alert" activity log.
 */
async function handleGetAdminConfig(req: NextRequest) {
    return NextResponse.json({
        status: 'secure',
        message: 'You have accessed admin configuration successfully.',
        config: {
            systemName: 'Employee Management System',
            securityLevel: 'High',
            lastAudit: new Date().toISOString(),
            experimentalFeatures: false
        }
    });
}

export const GET = withAuth(handleGetAdminConfig, 'admin');
