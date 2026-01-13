import React from 'react';
import { Card } from '../ui/Card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'blue' | 'indigo' | 'purple' | 'emerald' | 'orange' | 'red';
  onClick?: () => void;
}

const colorStyles = {
  primary: {
    bg: 'bg-[var(--primary)]/30',
    text: 'text-[var(--primary)]',
    ring: 'ring-[var(--primary)]/40',
    border: 'border-[var(--primary)]/30'
  },
  blue: {
    bg: 'bg-blue-500/30',
    text: 'text-blue-400',
    ring: 'ring-blue-500/40',
    border: 'border-blue-500/30'
  },
  indigo: {
    bg: 'bg-indigo-500/30',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/40',
    border: 'border-indigo-500/30'
  },
  purple: {
    bg: 'bg-purple-500/30',
    text: 'text-purple-400',
    ring: 'ring-purple-500/40',
    border: 'border-purple-500/30'
  },
  pink: {
    bg: 'bg-pink-500/30',
    text: 'text-pink-400',
    ring: 'ring-pink-500/40',
    border: 'border-pink-500/30'
  },
  orange: {
    bg: 'bg-orange-500/30',
    text: 'text-orange-400',
    ring: 'ring-orange-500/40',
    border: 'border-orange-500/30'
  },
  red: {
    bg: 'bg-red-500/30',
    text: 'text-red-400',
    ring: 'ring-red-500/40',
    border: 'border-red-500/30'
  },
  emerald: {
    bg: 'bg-emerald-500/30',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/40',
    border: 'border-emerald-500/30'
  },
  violet: {
    bg: 'bg-violet-500/30',
    text: 'text-violet-400',
    ring: 'ring-violet-500/40',
    border: 'border-violet-500/30'
  },
};

export function StatsCard({
  title,
  value,
  subValue,
  icon,
  color = 'primary',
  trend,
  trendValue,
  onClick
}: StatsCardProps) {
  const styles = colorStyles[color] || colorStyles.primary;

  return (
    <Card
      onClick={onClick}
      className="p-6 flex flex-col justify-between h-full transition-all duration-300 group border-border cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-primary/20 relative overflow-hidden"
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-7 h-7", styles.text)}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, {
            className: cn((icon as any).props?.className || '', styles.text)
          }) : icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border shadow-sm",
            trend === 'up' ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20' :
              trend === 'down' ? 'bg-red-500/30 text-red-400 border-red-500/40 shadow-red-500/20' :
                'bg-muted/60 text-muted-foreground border-border/50'
          )}>
            {trend === 'up' && <ArrowUp className="w-4 h-4" />}
            {trend === 'down' && <ArrowDown className="w-4 h-4" />}
            {trend === 'neutral' && <Minus className="w-4 h-4" />}
            <span className="font-medium">{trendValue}</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{title}</h3>
        <div className="flex items-baseline space-x-2">
          <h2 className="text-3xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{value}</h2>
          {subValue && (
            <span className="text-sm text-muted-foreground font-medium">{subValue}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
