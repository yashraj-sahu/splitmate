import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import { expenseService } from '../services/expenseService';
import { calculateBalances } from '../utils/calculator';
import { formatCurrency, formatDate, fromPaise } from '../utils/formatters';
import { Group, Expense, Settlement, CurrencyCode } from '../types/models';
import { StatCard } from '../components/common/StatCard';
import { CategoryBadge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { CreateGroupModal } from '../components/group/CreateGroupModal';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  ReceiptText,
  AlertCircle
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [groupBalancesMap, setGroupBalancesMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedGroupForExpense, setSelectedGroupForExpense] = useState<Group | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<any[]>([]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userGroups = await groupService.getGroups(user.id);
      setGroups(userGroups);

      const expenses = await expenseService.getAllExpensesForUser(user.id);
      setAllExpenses(expenses);

      // Compute user balance per group
      const balances: Record<string, number> = {};
      for (const grp of userGroups) {
        const [grpExpenses, grpSettlements, grpMembers] = await Promise.all([
          expenseService.getGroupExpenses(grp.id),
          expenseService.getGroupSettlements(grp.id),
          groupService.getGroupMembers(grp.id),
        ]);

        const memberIds = grpMembers.map(m => m.user_id);
        const calculated = calculateBalances(grpExpenses, grpSettlements, memberIds);
        balances[grp.id] = calculated[user.id]?.net_balance_paise || 0;
      }
      setGroupBalancesMap(balances);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Total metrics
  const totalNetBalancePaise = Object.values(groupBalancesMap).reduce((a, b) => a + b, 0);
  const totalOwedToUserPaise = Object.values(groupBalancesMap).filter(b => b > 0).reduce((a, b) => a + b, 0);
  const totalUserOwesPaise = Object.values(groupBalancesMap).filter(b => b < 0).reduce((a, b) => a + Math.abs(b), 0);

  const handleOpenAddExpense = async (group?: Group) => {
    const targetGroup = group || groups[0];
    if (!targetGroup) {
      setCreateGroupOpen(true);
      return;
    }
    const members = await groupService.getGroupMembers(targetGroup.id);
    setSelectedGroupForExpense(targetGroup);
    setSelectedGroupMembers(members);
    setExpenseModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
            Hello, {user?.full_name?.split(' ')[0] || 'Friend'} 👋
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Here's a breakdown of your current group finances and debts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Users className="w-4 h-4" />
            <span>New Group</span>
          </button>
          <button
            onClick={() => handleOpenAddExpense()}
            className="btn-primary flex items-center gap-2 text-sm shadow-md shadow-royal/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Overall Net Balance"
          value={formatCurrency(totalNetBalancePaise, user?.default_currency || 'INR', true)}
          subtitle={
            totalNetBalancePaise > 0
              ? 'You are owed money overall'
              : totalNetBalancePaise < 0
              ? 'You owe money overall'
              : 'All your accounts are settled up'
          }
          icon={Wallet}
          variant={totalNetBalancePaise >= 0 ? 'green' : 'rose'}
        />

        <StatCard
          title="You Are Owed"
          value={formatCurrency(totalOwedToUserPaise, user?.default_currency || 'INR')}
          subtitle="Total pending returns to you"
          icon={ArrowDownLeft}
          variant="green"
        />

        <StatCard
          title="You Owe"
          value={formatCurrency(totalUserOwesPaise, user?.default_currency || 'INR')}
          subtitle="Total you need to pay back"
          icon={ArrowUpRight}
          variant="rose"
        />

        <StatCard
          title="Active Groups"
          value={groups.length.toString()}
          subtitle="Trips, flats, and projects"
          icon={Users}
          variant="royal"
        />
      </div>

      {/* Main Content Grid: Groups Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Your Groups (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy flex items-center gap-2">
              <Users className="w-5 h-5 text-royal" />
              <span>Your Expense Groups</span>
            </h3>
            <Link
              to="/groups"
              className="text-xs font-semibold text-royal hover:underline flex items-center gap-1"
            >
              <span>View All ({groups.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {groups.length === 0 ? (
            <div className="card-fintech text-center py-12">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy">No groups found</p>
              <p className="text-xs text-text-secondary mt-1 mb-4">
                Create a group to start tracking shared expenses with roommates or friends.
              </p>
              <button onClick={() => setCreateGroupOpen(true)} className="btn-primary text-xs">
                Create Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map(grp => {
                const balance = groupBalancesMap[grp.id] || 0;
                return (
                  <div
                    key={grp.id}
                    onClick={() => navigate(`/groups/${grp.id}`)}
                    className="card-fintech p-5 cursor-pointer hover:border-royal/40 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CategoryBadge category={grp.category} />
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          {grp.currency}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-navy tracking-tight line-clamp-1">
                        {grp.name}
                      </h4>
                      {grp.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {grp.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-text-secondary block">
                          Your Position
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

                      <span className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-royal hover:bg-royal/10 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Expenses Feed (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-royal" />
              <span>Recent Activity</span>
            </h3>
            <Link
              to="/expenses"
              className="text-xs font-semibold text-royal hover:underline flex items-center gap-1"
            >
              <span>View History</span>
            </Link>
          </div>

          <div className="card-fintech p-0 divide-y divide-slate-100 overflow-hidden">
            {allExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary">
                No recent transactions recorded yet.
              </div>
            ) : (
              allExpenses.slice(0, 6).map(exp => (
                <div
                  key={exp.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={exp.creator_profile?.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-navy truncate">
                        {exp.title}
                      </p>
                      <p className="text-[10px] text-text-secondary truncate mt-0.5">
                        {formatDate(exp.expense_date)} • {exp.category}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono text-navy shrink-0">
                    {formatCurrency(exp.amount_paise, exp.currency as CurrencyCode)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onGroupCreated={loadDashboardData}
      />

      {selectedGroupForExpense && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          group={selectedGroupForExpense}
          members={selectedGroupMembers}
          onExpenseAdded={loadDashboardData}
        />
      )}
    </div>
  );
};

