import React from 'react';
import { Menu, Plus, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  onQuickAddExpense?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title = 'Dashboard',
  onQuickAddExpense,
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onQuickAddExpense && (
          <button
            onClick={onQuickAddExpense}
            className="btn-primary flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">Expense</span>
          </button>
        )}

        <div className="relative">
          <button
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-royal" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <Avatar name={user?.full_name} size="sm" />
          <div className="text-left">
            <span className="text-xs font-semibold text-navy block leading-none">
              {user?.full_name || 'Guest'}
            </span>
            <span className="text-[10px] text-text-secondary">
              {user?.default_currency || 'INR'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

