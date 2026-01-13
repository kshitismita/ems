'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLocalStorage } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

interface GuestGuardProps {
    children: React.ReactNode;
}

/**
 * GuestGuard prevents authenticated users from accessing "Guest-only" pages (like Login/Register).
 * If a user is already logged in, it redirects them to their dashboard.
 */
export default function GuestGuard({ children }: GuestGuardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getLocalStorage('token');
        const userRaw = getLocalStorage('user');

        if (token && userRaw) {
            try {
                const user = JSON.parse(userRaw);
                // Redirect based on role
                const dashboardPath = user.role === 'admin' ? '/admin-dash' : '/employee-dash';
                router.replace(dashboardPath);
                return;
            } catch (error) {
                console.error('Error parsing user data in GuestGuard:', error);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}
