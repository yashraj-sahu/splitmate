import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/common/Avatar';
import { CurrencyCode } from '../types/models';
import { CURRENCY_SYMBOLS, formatDate } from '../utils/formatters';
import { isSupabaseConfigured } from '../services/supabase';
import { 
  UserCircle, 
  ShieldCheck, 
  Coins, 
  RotateCcw, 
  Database, 
  Check, 
  Mail, 
  Calendar 
} from 'lucide-react';

const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED'];

export const ProfilePage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [currency, setCurrency] = useState<CurrencyCode>(user?.default_currency || 'INR');
  const [saving, setSaving] = useState(false);

  const handleSaveCurrency = async () => {
    try {
      setSaving(true);
      if (user) {
        // Save in localStorage or supabase
        user.default_currency = currency;
        const rawProfiles = localStorage.getItem('splitmate_profiles');
        if (rawProfiles) {
          const profiles = JSON.parse(rawProfiles);
          const idx = profiles.findIndex((p: any) => p.id === user.id);
          if (idx !== -1) {
            profiles[idx].default_currency = currency;
            localStorage.setItem('splitmate_profiles', JSON.stringify(profiles));
          }
        }
        await refreshUser();
        showToast(`Default currency updated to ${currency}`, 'success');
      }
    } catch (err: any) {
      showToast('Failed to update currency', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSandbox = () => {
    if (confirm('Are you sure you want to restore the demo dataset? All local modifications will be reset.')) {
      localStorage.removeItem('splitmate_profiles');
      localStorage.removeItem('splitmate_groups');
      localStorage.removeItem('splitmate_group_members');
      localStorage.removeItem('splitmate_expenses');
      localStorage.removeItem('splitmate_settlements');
      localStorage.removeItem('splitmate_admin_roles');
      localStorage.removeItem('splitmate_demo_current_user');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
          Profile & Preferences
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Manage your personal profile, preferred currency, and security credentials.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="card-fintech p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
          <Avatar name={user?.full_name} size="xl" />
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-xl font-bold text-navy">
                {user?.full_name || 'Anonymous User'}
              </h3>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Platform Super Administrator</span>
                </span>
              )}
            </div>

            <p className="text-xs text-text-secondary flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.email}</span>
            </p>

            <p className="text-xs text-text-secondary flex items-center justify-center sm:justify-start gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Member since {user?.created_at ? formatDate(user.created_at) : '2026'}</span>
            </p>
          </div>
        </div>

        {/* Currency Preference */}
        <div className="py-6 border-b border-slate-100 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-navy flex items-center gap-2">
              <Coins className="w-4 h-4 text-royal" />
              <span>Default Financial Currency</span>
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Select the primary currency symbol used when rendering your personal balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as CurrencyCode)}
              className="input-fintech w-48 text-sm font-mono"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>
                  {c} ({CURRENCY_SYMBOLS[c]})
                </option>
              ))}
            </select>

            <button
              onClick={handleSaveCurrency}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              disabled={saving || currency === user?.default_currency}
            >
              <Check className="w-4 h-4" />
              <span>Save Preference</span>
            </button>
          </div>
        </div>

        {/* Security & System Info */}
        <div className="pt-6 space-y-4">
          <h4 className="text-sm font-bold text-navy flex items-center gap-2">
            <Database className="w-4 h-4 text-royal" />
            <span>Database & Security Architecture</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-semibold text-navy block mb-1">
                Data Persistence Mode
              </span>
              <p className="text-text-secondary">
                {isSupabaseConfigured
                  ? 'Connected to live Supabase PostgreSQL backend with Row-Level Security.'
                  : 'Operating in Local Sandbox Mode. Live reactive browser store active.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-semibold text-navy block mb-1">
                Admin Authorization Layer
              </span>
              <p className="text-text-secondary">
                Admin role is strictly queried from database tables (`admin_roles`), preventing client-side spoofing.
              </p>
            </div>
          </div>

          {!isSupabaseConfigured && !import.meta.env.PROD && (
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleResetSandbox}
                className="btn-secondary text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sandbox Dataset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

