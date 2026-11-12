import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ReceiptText, 
  PieChart, 
  UserCircle, 
  ShieldCheck, 
  LogOut,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { INITIAL_PROFILES } from '../../services/mockData';
import { isSupabaseConfigured } from '../../services/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, signOut, switchDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', path: '/groups', icon: Users },
    { name: 'Expenses', path: '/expenses', icon: ReceiptText },
    { name: 'Analytics', path: '/analytics', icon: PieChart },
    { name: 'Profile & Settings', path: '/profile', icon: UserCircle },
  ];

  if (isAdmin) {
    navItems.push({
      name: 'Admin Console',
      path: '/admin',
      icon: ShieldCheck,
    });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-navy text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-navy-light/40">
          <NavLink to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-royal to-royal-light flex items-center justify-center shadow-lg shadow-royal/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                Split<span className="text-royal-light">Mate</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-0.5">
                Fintech Expense Engine
              </span>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Banner */}
        <div className="px-6 py-3 bg-navy-dark/60 border-b border-navy-light/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300">
              {isSupabaseConfigured ? 'Supabase Connected' : 'Local Sandbox Mode'}
            </span>
          </div>
          {isAdmin && (
            <span className="bg-royal/30 text-royal-light text-[10px] font-semibold px-2 py-0.5 rounded-md border border-royal/40">
              Admin
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isSpecialAdmin = item.name === 'Admin Console';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-royal text-white shadow-md shadow-royal/30'
                      : isSpecialAdmin
                      ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                      : 'text-slate-300 hover:bg-navy-light/60 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
                {isSpecialAdmin && (
                  <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                    SECURE
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Demo User Switcher (For local development testing only) */}
        {!isSupabaseConfigured && !import.meta.env.PROD && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-navy-dark/80 border border-navy-light/30 text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Switch Demo Persona:
            </span>
            <select
              value={user?.id || ''}
              onChange={(e) => switchDemoUser(e.target.value)}
              className="w-full bg-navy text-slate-200 text-xs py-1.5 px-2.5 rounded-lg border border-navy-light/60 focus:outline-none focus:border-royal"
            >
              {INITIAL_PROFILES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.email.includes('singhsagar') ? '👑 (Admin)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Card & Sign Out Footer */}
        <div className="p-4 border-t border-navy-light/40 bg-navy-dark/40 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={user?.full_name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || 'Guest User'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || 'Not logged in'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

