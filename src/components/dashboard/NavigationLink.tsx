'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItemProps {
  children: React.ReactNode;
  href: string;
  icon: React.ElementType;
  isActive?: boolean;
  onClick?: () => void;
  iconColor?: string;
}

export function NavigationLink({ children, href, icon: Icon, isActive, onClick, iconColor }: NavItemProps) {
  return (
    <Link
      href={href}
      replace
      onClick={(e) => {
        if (onClick) onClick();
      }}
      className={cn(
        "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden",
        isActive
          ? "text-white bg-primary shadow-lg shadow-primary/20 scale-[1.02] opacity-100"
          : "text-gray-300 hover:text-white hover:bg-accent hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 hover:translate-x-1"
      )}
    >
      <Icon className={cn(
        "mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
        isActive ? "text-white" : (iconColor || "text-blue-400")
      )} />
      {children}
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Link>
  );
}
