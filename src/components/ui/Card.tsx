import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl border border-white/15 shadow-lg shadow-black/20 transition-all duration-300 backdrop-blur-sm",
        onClick && "cursor-pointer hover:bg-card/90 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 active:scale-[0.98] hover:translate-y-[-2px]",
        className
      )}
    >
      {children}
    </div>
  );
}
