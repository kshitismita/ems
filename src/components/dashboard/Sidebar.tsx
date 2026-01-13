'use client';

import { usePathname, useRouter } from 'next/navigation';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    Clock,
    Calendar,
    Library,
    LogOut,
    ClipboardList,
    Settings,
    Video,
    Link,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationLink } from './NavigationLink';
import { useState, useEffect } from 'react';

interface ReferenceLink {
    _id: string;
    title: string;
    url: string;
    addedBy?: {
        name: string;
    };
    addedAt: string;
}

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [referenceLinks, setReferenceLinks] = useState<ReferenceLink[]>([]);

    useEffect(() => {
        setIsLoading(true);
        const userRaw = getLocalStorage('user');
        if (userRaw) {
            try {
                const user = JSON.parse(userRaw);
                setUserRole(user.role);
            } catch (error) {
                console.error('Error parsing user data in sidebar:', error);
            }
        }
        setIsLoading(false);
    }, []);

    // Fetch reference links for library
    useEffect(() => {
        const fetchReferenceLinks = async () => {
            try {
                const token = getLocalStorage('token');
                if (!token) return;

                const response = await fetch('/api/reference-library?limit=3', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setReferenceLinks(data.documents || []);
                }
            } catch (error) {
                console.error('Failed to fetch reference links:', error);
            }
        };

        fetchReferenceLinks();
    }, []);

    // Define navigation items based on user role
    const getNavItems = () => {
        if (isLoading) {
            // Show loading state items to prevent flicker
            return [
                { name: 'Dashboard', href: '/admin-dash', icon: LayoutDashboard },
                { name: 'Employees', href: '/employees', icon: Users },
                { name: 'Projects', href: '/projects', icon: Briefcase },
                { name: 'Reports', href: '/reports', icon: FileText },
                { name: 'Reference Library', href: '/reference-library', icon: Library },
            ];
        }

        if (userRole === 'employee') {
            return [
                { name: 'Dashboard', href: '/employee-dash', icon: LayoutDashboard },
                { name: 'Team', href: '/employees', icon: Users },
                { name: 'My Tasks', href: '/tasks', icon: ClipboardList },
                {
                    name: 'My Projects', href: '/projects', icon: Briefcase, onClick: () => {
                        // Clear any project-specific state when navigating to projects list
                        const token = getLocalStorage('token');
                        if (token) {
                            // Clear project-related filters or selections
                            localStorage.removeItem('projectFilters');
                            localStorage.removeItem('selectedProject');
                        }
                    }
                },
                { name: 'Meetings', href: '/meetings', icon: Video },
                { name: 'Attendance', href: '/attendance', icon: Clock },
                { name: 'Leave Management', href: '/leave/apply', icon: Calendar },
                { name: 'My Reports', href: '/reports', icon: FileText },
                { name: 'Reference Library', href: '/reference-library', icon: Library },
            ];
        } else if (userRole === 'admin') {
            return [
                { name: 'Dashboard', href: '/admin-dash', icon: LayoutDashboard },
                { name: 'Employees', href: '/employees', icon: Users },
                { name: 'Task Management', href: '/tasks', icon: ClipboardList },
                {
                    name: 'Projects', href: '/projects', icon: Briefcase, onClick: () => {
                        // Clear any project-specific state when navigating to projects list
                        const token = getLocalStorage('token');
                        if (token) {
                            // Clear project-related filters or selections
                            localStorage.removeItem('projectFilters');
                            localStorage.removeItem('selectedProject');
                        }
                    }
                },
                { name: 'Meetings', href: '/meetings', icon: Video },
                { name: 'Leave Management', href: '/admin/leave', icon: Calendar },
                { name: 'Reports', href: '/reports', icon: FileText },
                { name: 'Reference Library', href: '/reference-library', icon: Library },
            ];
        } else {
            // Default to empty or basic items if role unknown
            return [
                { name: 'Dashboard', href: '/admin-dash', icon: LayoutDashboard },
            ];
        }
    };

    const navItems = getNavItems();

    return (
        <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col min-h-screen shrink-0">
            <div className="p-8 pb-4 flex items-center gap-3">
                <img
                    src="/logo.png"
                    alt="SALAK Logo"
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2306B6D4'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='0.3em' fill='white' font-family='Arial' font-size='40' font-weight='bold'%3ES%3C/text%3E%3C/svg%3E";
                    }}
                />
                <h1 className="text-xl font-bold text-foreground">SALAK</h1>
            </div>

            
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    // Define vibrant colors for each icon
                    const iconColors = [
                        'text-blue-400',      // Dashboard
                        'text-purple-400',    // Employees/Team
                        'text-orange-400',    // Tasks/My Tasks
                        'text-emerald-400',   // Projects/My Projects
                        'text-indigo-400',    // Meetings
                        'text-pink-400',      // Attendance/Leave Management
                        'text-cyan-400',      // Leave Management/Reports/My Reports
                        'text-yellow-400',    // Reports/Reference Library
                        'text-red-400',       // Reference Library/Activity Logs
                    ];

                    const iconColor = iconColors[index % iconColors.length];

                    return (
                        <NavigationLink
                            key={item.name}
                            href={item.href}
                            isActive={isActive}
                            icon={item.icon}
                            onClick={item.onClick}
                            iconColor={iconColor}
                        >
                            {item.name}
                        </NavigationLink>
                    );
                })}
            </nav>

            <div className="p-2 border-t border-border space-y-2">
                <button
                    onClick={() => router.push('/settings')}
                    className="flex w-full items-center px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
                >
                    <Settings className="mr-3 h-5 w-5" />
                    Settings
                </button>
                <button
                    onClick={async () => {
                        try {
                            await fetch('/api/auth/logout', { method: 'POST' });
                        } catch (error) {
                            console.error('Logout API failed:', error);
                        }
                        removeLocalStorage('token');
                        removeLocalStorage('user');
                        router.replace('/login');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                >
                    <LogOut className="w-4 h-4 text-white" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
