'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getLocalStorage } from '@/lib/storage';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({ className = '', label = 'Back to Dashboard' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Get user role to determine which dashboard to go back to
    const userStr = getLocalStorage('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userRole = user?.role;

    if (userRole === 'admin') {
      router.push('/admin-dash');
    } else if (userRole === 'employee') {
      router.push('/employee-dash');
    } else {
      // Fallback to employee dashboard if role is unknown
      router.push('/employee-dash');
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 px-4 py-2 bg-card hover:bg-accent text-foreground rounded-xl transition-all duration-300 font-medium border border-border shadow-md hover:shadow-lg hover:translate-y-[-1px] ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
