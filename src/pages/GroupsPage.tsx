import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import { expenseService } from '../services/expenseService';
import { calculateBalances } from '../utils/calculator';
import { formatCurrency } from '../utils/formatters';
import { Group, GroupCategory, CurrencyCode } from '../types/models';
import { CategoryBadge } from '../components/common/Badge';
import { CreateGroupModal } from '../components/group/CreateGroupModal';
import { Users, Plus, Search, ArrowRight, Filter } from 'lucide-react';

const CATEGORIES: ('All' | GroupCategory)[] = [
  'All',
  'Trip',
  'Home',
  'Couple',
  'Project',
  'Friends',
  'Other',
];

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [balancesMap, setBalancesMap] = useState<Record<string, number>>({});
  const [membersCountMap, setMembersCountMap] = useState<Record<string, number>>({});
  const [totalSpentMap, setTotalSpentMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | GroupCategory>('All');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userGroups = await groupService.getGroups(user.id);
      setGroups(userGroups);

      const balances: Record<string, number> = {};
      const counts: Record<string, number> = {};
      const spents: Record<string, number> = {};

      for (const grp of userGroups) {
        const [grpExpenses, grpSettlements, grpMembers] = await Promise.all([
          expenseService.getGroupExpenses(grp.id),
          expenseService.getGroupSettlements(grp.id),
          groupService.getGroupMembers(grp.id),
        ]);

        counts[grp.id] = grpMembers.length;
        spents[grp.id] = grpExpenses.reduce((acc, e) => acc + e.amount_paise, 0);

        const memberIds = grpMembers.map(m => m.user_id);
        const calculated = calculateBalances(grpExpenses, grpSettlements, memberIds);
        balances[grp.id] = calculated[user.id]?.net_balance_paise || 0;
      }

      setBalancesMap(balances);
      setMembersCountMap(counts);
      setTotalSpentMap(spents);
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [user]);

  const filteredGroups = groups.filter(grp => {
    const matchesSearch = grp.name.toLowerCase().includes(search.toLowerCase()) ||
      (grp.description && grp.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || grp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">
            Expense Groups
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Manage your shared expenses with friends, flatmates, and travel buddies.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-royal/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-fintech pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-royal text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="card-fintech text-center py-16">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-navy">No groups match your criteria</h3>
          <p className="text-xs text-text-secondary mt-1 mb-5">
            {search || selectedCategory !== 'All'
              ? 'Try modifying your search or filter settings.'
              : 'Start by creating your first group for a trip or household!'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary text-xs"
          >
            Create New Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map(grp => {
            const balance = balancesMap[grp.id] || 0;
            const membersCount = membersCountMap[grp.id] || 0;
            const totalSpent = totalSpentMap[grp.id] || 0;

            return (
              <div
                key={grp.id}
                onClick={() => navigate(`/groups/${grp.id}`)}
                className="card-fintech cursor-pointer hover:border-royal/50 hover:-translate-y-1 hover:shadow-fintech-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <CategoryBadge category={grp.category} />
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {grp.currency}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-navy tracking-tight line-clamp-1">
                    {grp.name}
                  </h3>
                  {grp.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                      {grp.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-royal" />
                      {membersCount} {membersCount === 1 ? 'member' : 'members'}
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      Spent: {formatCurrency(totalSpent, grp.currency as CurrencyCode)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-text-secondary block">
                      Your Net Position
                    </span>
                    <span
                      className={`text-sm font-bold font-mono ${
                        balance > 0
                          ? 'text-emerald-600'
                          : balance < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {balance === 0
                        ? 'Settled up'
                        : formatCurrency(balance, grp.currency as CurrencyCode, true)}
                    </span>
                  </div>

                  <span className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:text-royal transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onGroupCreated={loadGroups}
      />
    </div>
  );
};

