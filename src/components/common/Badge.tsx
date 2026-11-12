import React from 'react';
import { GroupCategory, ExpenseCategory } from '../../types/models';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const styles = {
    primary: 'bg-royal/10 text-royal border-royal/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    outline: 'bg-transparent text-slate-600 border-slate-300',
  }[variant];

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border font-medium ${sizeClasses} ${styles}`}>
      {children}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: GroupCategory | ExpenseCategory | string }> = ({ category }) => {
  const categoryStyles: Record<string, { bg: string; text: string; icon: string }> = {
    Food: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: '🍽️' },
    Travel: { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', icon: '✈️' },
    Trip: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: '🏖️' },
    Home: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: '🏠' },
    Utilities: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: '⚡' },
    Entertainment: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-700', icon: '🍿' },
    Housing: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700', icon: '🛋️' },
    Shopping: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '🛍️' },
    Friends: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: '👥' },
    Couple: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: '❤️' },
    Project: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700', icon: '💼' },
    Other: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', icon: '🏷️' },
  };

  const current = categoryStyles[category] || categoryStyles.Other;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-medium ${current.bg} ${current.text}`}>
      <span>{current.icon}</span>
      <span>{category}</span>
    </span>
  );
};

