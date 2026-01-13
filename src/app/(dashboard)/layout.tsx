'use client';

import AuthGuard from '@/components/auth/AuthGuard';

export default function DashboardLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    // Basic AuthGuard without role requirement for the overall layout.
    // Specific pages will still have their own role-based AuthGuard for fine-grained control.
    return <AuthGuard>{children}</AuthGuard>;
}
