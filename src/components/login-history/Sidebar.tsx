'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    Clock,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getLocalStorage } from '@/lib/storage';

export default function LoginHistorySidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const userRaw = getLocalStorage('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setUserRole(user.role);
      } catch (error) {
        console.error('Error parsing user data in login history sidebar:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Define navigation items based on user role
  const getNavItems = () => {
    if (isLoading) {
      // Show loading state items to prevent flicker
      return [
        { name: 'Dashboard', href: '/employee-dash', icon: LayoutDashboard },
        { name: 'My Projects', href: '/projects', icon: Briefcase },
        { name: 'My Reports', href: '/reports', icon: FileText },
      ];
    }
    
    if (userRole === 'admin') {
      return [
        { name: 'Dashboard', href: '/admin-dash', icon: LayoutDashboard },
        { name: 'Employees', href: '/employees', icon: Users },
        { name: 'My Projects', href: '/projects', icon: Briefcase },
        { name: 'My Reports', href: '/reports', icon: FileText },
        { name: 'No Activity Logs', href: '/login-history', icon: Clock },
      ];
    } else {
      // Fallback to employee items if role is not determined
      return [
        { name: 'Dashboard', href: '/employee-dash', icon: LayoutDashboard },
        { name: 'Team', href: '/employees', icon: Users },
        { name: 'My Projects', href: '/projects', icon: Briefcase },
        { name: 'My Reports', href: '/reports', icon: FileText },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-card/50 backdrop-blur-xl border-r border-white/10 hidden md:flex flex-col z-30">
      <div className="p-8 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-400 flex items-center justify-center shadow-lg shadow-white/5">
          <span className="text-black font-bold text-lg">S</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-widest">
          No Activity Logs
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative",
                isActive
                  ? "text-black bg-gradient-to-r from-gray-100 to-gray-300 shadow-md shadow-white/5"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5 transition-transform", isActive ? "text-black" : "text-gray-500 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <button className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </button>
        <div className="pt-2">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 text-white relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl -mr-8 -mt-8"></div>
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
              <p className="text-sm font-medium text-gray-200">Online</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
