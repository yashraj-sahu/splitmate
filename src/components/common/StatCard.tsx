import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'royal' | 'green' | 'navy' | 'amber' | 'rose';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'royal',
  trend,
}) => {
  const variantStyles = {
    royal: {
      iconBg: 'bg-royal/10 text-royal',
      borderAccent: 'hover:border-royal/30',
    },
    green: {
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderAccent: 'hover:border-emerald-300',
    },
    navy: {
      iconBg: 'bg-navy/10 text-navy',
      borderAccent: 'hover:border-navy/30',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600',
      borderAccent: 'hover:border-amber-300',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600',
      borderAccent: 'hover:border-rose-300',
    },
  }[variant];

  return (
    <div className={`card-fintech transition-all duration-200 hover:-translate-y-0.5 hover:shadow-fintech-lg border border-slate-200/90 ${variantStyles.borderAccent}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${variantStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-navy">{value}</h3>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-text-secondary mt-1.5">{subtitle}</p>
      )}
    </div>
  );
};

