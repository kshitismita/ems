'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLocalStorage } from '@/lib/storage';
import { Loader2, ShieldAlert, ArrowRight, Lock } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: ('admin' | 'employee')[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = () => {
            const token = getLocalStorage('token');
            const userRaw = getLocalStorage('user');

            if (!token || !userRaw) {
                router.replace('/login');
                return;
            }

            try {
                const user = JSON.parse(userRaw);
                setUserRole(user.role);

                if (allowedRoles && !allowedRoles.includes(user.role)) {
                    setIsUnauthorized(true);
                    setLoading(false);

                    // Trigger backend security log
                    // We call the clearance API with the first required role.
                    // Because the user doesn't have it, withAuth will log an "Unauthorized Access Alert".
                    if (allowedRoles.length > 0) {
                        fetch(`/api/security/clearance/${allowedRoles[0]}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }).catch(err => console.error('Failed to trigger security log:', err));
                    }

                    return;
                }

                setAuthorized(true);
            } catch (error) {
                console.error('Error parsing user data in AuthGuard:', error);
                router.replace('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router, allowedRoles]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                        <Lock className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-400 font-medium tracking-wide">Verifying secure access...</p>
                </div>
            </div>
        );
    }

    if (isUnauthorized) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                        <div className="relative p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
                            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Access Restricted</h1>
                        <p className="text-gray-400 leading-relaxed">
                            You don't have the required administrative permissions to access this secure section.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={() => router.replace('/login')}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all group"
                        >
                            Back to Login
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold">
                        Security Clearance: {userRole || 'Insufficient'}
                    </p>
                </div>
            </div>
        );
    }

    return authorized ? <>{children}</> : null;
}
