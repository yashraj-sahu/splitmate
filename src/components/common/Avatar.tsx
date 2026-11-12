import React from 'react';
import { getInitials, getAvatarColor } from '../../utils/formatters';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
  }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        className={`rounded-full object-cover shrink-0 ring-2 ring-white ${sizeClasses} ${className}`}
      />
    );
  }

  const colorClass = getAvatarColor(name || 'User');
  const initials = getInitials(name);

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium shrink-0 ring-2 ring-white select-none ${sizeClasses} ${colorClass} ${className}`}
      title={name || undefined}
    >
      {initials}
    </div>
  );
};

