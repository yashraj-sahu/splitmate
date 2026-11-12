import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminService, AdminStats } from '../services/adminService';
import { UserProfile, Group, AdminRole } from '../types/models';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { Avatar } from '../components/common/Avatar';
import { CategoryBadge } from '../components/common/Badge';
import { 
  ShieldCheck, 
  Users, 
  Layers, 
  Receipt, 
  HandCoins, 
  ShieldAlert, 
  CheckCircle2, 
  Lock,
  Search
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);

        // Server-side check enforced inside adminService
        const [st, uList, gList, rList] = await Promise.all([
          adminService.getPlatformStats(user.id),
          adminService.getAllUsers(user.id),
          adminService.getAllGroups(user.id),
          adminService.getAdminRoles(user.id),
        ]);

        setStats(st);
        setUsers(uList);
        setGroups(gList);
        setAdminRoles(rList);
      } catch (err: any) {
        console.error('Admin verification error:', err);
        setError(err.message || 'Access Denied: Server-side database verification failed.');
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-text-secondary">
        Verifying database administrative privileges...
      </div>
    );
  }

  // Access denied fallback if user is not authorized in database
  if (!isAdmin || error) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="card-fintech border-rose-200 bg-rose-50/40 p-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-navy">
            Administrator Access Denied
          </h2>
          <p className="text-xs text-text-secondary max-w-md mx-auto mt-2 leading-relaxed">
            {error || 'This area is restricted to server-side verified administrators. Ordinary members cannot access or self-promote.'}
          </p>

          <div className="mt-6 p-4 rounded-xl bg-white border border-rose-200 text-left text-xs space-y-1.5">
            <span className="font-bold text-navy block">Security Policy Enforcement:</span>
            <p className="text-slate-600">
              • Access is governed strictly by the PostgreSQL <code className="text-royal font-mono">admin_roles</code> table.
            </p>
            <p className="text-slate-600">
              • Primary Administrator: <span className="font-mono text-navy font-semibold">singhsagarpratap196@gmail.com</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Database Authorized Super Admin</span>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
            Platform Administration Console
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Real-time platform metrics, user directory, and security audit log.
          </p>
        </div>
      </div>

      {/* Platform KPI Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Registered Users"
            value={stats.totalUsers.toString()}
            subtitle="Total verified profiles"
            icon={Users}
            variant="royal"
          />

          <StatCard
            title="Total Groups"
            value={stats.totalGroups.toString()}
            subtitle="Active expense groups"
            icon={Layers}
            variant="navy"
          />

          <StatCard
            title="Platform Volume"
            value={formatCurrency(stats.totalVolumePaise, 'INR')}
            subtitle={`${stats.totalExpenses} total bills created`}
            icon={Receipt}
            variant="green"
          />

          <StatCard
            title="Settlements Completed"
            value={formatCurrency(stats.totalSettlementVolumePaise, 'INR')}
            subtitle={`${stats.totalSettlements} debts settled`}
            icon={HandCoins}
            variant="amber"
          />
        </div>
      )}

      {/* Admin Security Verification Section */}
      <div className="card-fintech border-amber-200 bg-amber-50/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Database Role Verification Audit</span>
            </h3>
            <p className="text-xs text-text-secondary">
              Verified server-side role assignments retrieved directly from <code className="text-navy font-mono">public.admin_roles</code>:
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/80 border-b border-amber-200 text-text-secondary font-semibold">
              <tr>
                <th className="py-2.5 px-3">Role ID</th>
                <th className="py-2.5 px-3">Assigned User</th>
                <th className="py-2.5 px-3">Privilege Level</th>
                <th className="py-2.5 px-3">Bootstrap Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {adminRoles.map(role => {
                const assignedUser = users.find(u => u.id === role.user_id);
                return (
                  <tr key={role.id} className="hover:bg-white/50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{role.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-navy">
                      {assignedUser ? `${assignedUser.full_name} (${assignedUser.email})` : role.user_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono uppercase text-royal font-bold">
                      {role.role}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enforced by DB Policy</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Directory */}
      <div className="card-fintech p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-navy">
              Registered Platform Users ({users.length})
            </h3>
            <p className="text-xs text-text-secondary">
              Directory of verified user accounts
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="input-fintech pl-9 text-xs py-1.5"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {filteredUsers.map(u => {
            const isTargetAdmin = u.email.toLowerCase() === 'singhsagarpratap196@gmail.com';
            return (
              <div key={u.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">{u.full_name}</span>
                      {isTargetAdmin && (
                        <span className="bg-royal/10 text-royal text-[10px] font-semibold px-2 py-0.5 rounded">
                          Target Super Admin
                        </span>
                      )}
                    </div>
                    <span className="text-text-secondary text-[11px] block">{u.email}</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-text-secondary">
                  <span>Joined {formatDate(u.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Groups Overview */}
      <div className="card-fintech p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-navy">
            Platform Groups Overview ({groups.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {groups.map(grp => (
            <div key={grp.id} className="p-4 flex items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy text-sm">{grp.name}</span>
                  <CategoryBadge category={grp.category} />
                </div>
                {grp.description && (
                  <p className="text-text-secondary text-[11px]">{grp.description}</p>
                )}
              </div>

              <span className="font-mono font-bold text-slate-500">
                {grp.currency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

