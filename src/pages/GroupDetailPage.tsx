import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { groupService } from '../services/groupService';
import { expenseService } from '../services/expenseService';
import { calculateBalances, simplifyDebts } from '../utils/calculator';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Group, GroupMember, Expense, Settlement, CurrencyCode, SimplifiedDebt } from '../types/models';
import { CategoryBadge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { SettleUpModal } from '../components/settlement/SettleUpModal';
import { DebtGraph } from '../components/settlement/DebtGraph';
import { AddMemberModal } from '../components/group/AddMemberModal';
import { 
  Users, 
  Plus, 
  ReceiptText, 
  ArrowLeft, 
  UserPlus, 
  HandCoins, 
  PieChart as PieChartIcon, 
  Trash2,
  Calendar,
  Search,
  CheckCircle2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members' | 'analytics'>('expenses');
  const [loading, setLoading] = useState(true);

  // Search in expenses
  const [expenseSearch, setExpenseSearch] = useState('');

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [settleInitialData, setSettleInitialData] = useState<{
    payerId?: string;
    payeeId?: string;
    amountPaise?: number;
  }>({});

  const loadGroupData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [grp, grpMembers, grpExpenses, grpSettlements] = await Promise.all([
        groupService.getGroupById(id),
        groupService.getGroupMembers(id),
        expenseService.getGroupExpenses(id),
        expenseService.getGroupSettlements(id),
      ]);

      if (!grp) {
        showToast('Group not found', 'error');
        navigate('/groups');
        return;
      }

      setGroup(grp);
      setMembers(grpMembers);
      setExpenses(grpExpenses);
      setSettlements(grpSettlements);
    } catch (err) {
      console.error('Error loading group:', err);
      showToast('Failed to load group details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupData();
  }, [id]);

  if (loading || !group) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-text-secondary">
        Loading group workspace...
      </div>
    );
  }

  // Calculate balances & simplified debts
  const memberIds = members.map(m => m.user_id);
  const profilesMap = members.reduce((acc, m) => {
    if (m.profile) acc[m.user_id] = m.profile;
    return acc;
  }, {} as Record<string, any>);

  const memberBalances = calculateBalances(expenses, settlements, memberIds, profilesMap);
  const netBalancesMap = Object.entries(memberBalances).reduce((acc, [uid, mb]) => {
    acc[uid] = mb.net_balance_paise;
    return acc;
  }, {} as Record<string, number>);

  const simplifiedDebts = simplifyDebts(netBalancesMap, profilesMap);

  const totalSpentPaise = expenses.reduce((acc, e) => acc + e.amount_paise, 0);
  const userBalancePaise = user ? (memberBalances[user.id]?.net_balance_paise || 0) : 0;

  const handleSettleDebt = (debt: SimplifiedDebt) => {
    setSettleInitialData({
      payerId: debt.from_user_id,
      payeeId: debt.to_user_id,
      amountPaise: debt.amount_paise,
    });
    setSettleModalOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete expense "${title}"?`)) return;
    try {
      await expenseService.deleteExpense(expenseId);
      showToast(`Expense "${title}" deleted`, 'info');
      loadGroupData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  const filteredExpenses = expenses.filter(e =>
    e.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(expenseSearch.toLowerCase()))
  );

  // Group Analytics data
  const categorySpendingMap: Record<string, number> = {};
  expenses.forEach(e => {
    categorySpendingMap[e.category] = (categorySpendingMap[e.category] || 0) + e.amount_paise;
  });
  const categoryChartData = Object.entries(categorySpendingMap).map(([name, paise]) => ({
    name,
    amount: paise / 100,
    paise,
  }));

  const COLORS = ['#3563E9', '#101D35', '#16A36A', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back button & Breadcrumb */}
      <button
        onClick={() => navigate('/groups')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-navy transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Groups</span>
      </button>

      {/* Group Header Banner */}
      <div className="card-fintech p-6 lg:p-8 bg-gradient-to-r from-navy via-navy-light to-navy text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CategoryBadge category={group.category} />
              <span className="text-xs font-mono font-semibold text-royal-light bg-royal/30 px-2 py-0.5 rounded">
                Currency: {group.currency}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                {group.description}
              </p>
            )}
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-navy-dark/60 p-4 rounded-2xl border border-navy-light/40">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Expenses
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white block">
                {formatCurrency(totalSpentPaise, group.currency as CurrencyCode)}
              </span>
            </div>

            <div className="border-l border-navy-light/60 pl-4 sm:pl-6">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Your Position
              </span>
              <span
                className={`text-lg sm:text-xl font-bold font-mono block ${
                  userBalancePaise > 0
                    ? 'text-emerald-400'
                    : userBalancePaise < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {userBalancePaise === 0
                  ? 'Settled up'
                  : formatCurrency(userBalancePaise, group.currency as CurrencyCode, true)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={() => setExpenseModalOpen(true)}
                className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
              <button
                onClick={() => {
                  setSettleInitialData({});
                  setSettleModalOpen(true);
                }}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 bg-white text-navy flex-1 sm:flex-initial"
              >
                <HandCoins className="w-4 h-4 text-emerald-600" />
                <span>Settle Up</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'expenses'
              ? 'border-royal text-royal'
              : 'border-transparent text-text-secondary hover:text-navy'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'balances'
              ? 'border-royal text-royal'
              : 'border-transparent text-text-secondary hover:text-navy'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          <span>Balances & Settle Up</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-royal text-royal'
              : 'border-transparent text-text-secondary hover:text-navy'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-royal text-royal'
              : 'border-transparent text-text-secondary hover:text-navy'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search group expenses..."
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                className="input-fintech pl-10 text-xs sm:text-sm py-2"
              />
            </div>

            <button
              onClick={() => setExpenseModalOpen(true)}
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="card-fintech text-center py-12">
              <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-navy">No expenses recorded</p>
              <p className="text-xs text-text-secondary mt-1 mb-4">
                Add an expense to start splitting costs among members.
              </p>
              <button onClick={() => setExpenseModalOpen(true)} className="btn-primary text-xs">
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="card-fintech p-0 divide-y divide-slate-100 overflow-hidden">
              {filteredExpenses.map(exp => (
                <div key={exp.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar name={exp.creator_profile?.full_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-navy truncate">
                            {exp.title}
                          </h4>
                          <CategoryBadge category={exp.category} />
                        </div>

                        {exp.description && (
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                            {exp.description}
                          </p>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(exp.expense_date)}
                          </span>
                          <span>•</span>
                          <span>
                            Paid by{' '}
                            <strong className="text-navy font-semibold">
                              {exp.payers && exp.payers.length > 1
                                ? `${exp.payers.length} contributors`
                                : exp.creator_profile?.full_name || 'Member'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="capitalize">Split: {exp.split_method}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-navy block">
                          {formatCurrency(exp.amount_paise, exp.currency as CurrencyCode)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        title="Delete Expense"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Splits detailed preview pill */}
                  {exp.splits && exp.splits.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px]">
                      {exp.splits.map(s => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                        >
                          {s.profile?.full_name?.split(' ')[0] || 'User'}: {formatCurrency(s.owed_amount_paise, exp.currency as CurrencyCode)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BALANCES & SETTLE UP */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Debt Simplification Visualizer */}
          <div className="card-fintech">
            <DebtGraph
              simplifiedDebts={simplifiedDebts}
              currency={group.currency as CurrencyCode}
              onSettleDebt={handleSettleDebt}
            />
          </div>

          {/* Member Individual Balances Table */}
          <div className="card-fintech p-0 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
                Individual Member Balances
              </h4>
              <span className="text-xs text-text-secondary">
                Paise integer arithmetic
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {members.map(m => {
                const b = memberBalances[m.user_id];
                const net = b?.net_balance_paise || 0;
                return (
                  <div key={m.user_id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.profile?.full_name} size="sm" />
                      <div>
                        <span className="text-xs font-bold text-navy block">
                          {m.profile?.full_name || m.user_id}
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          Paid: {formatCurrency(b?.total_paid_paise || 0, group.currency as CurrencyCode)} | Share: {formatCurrency(b?.total_owed_paise || 0, group.currency as CurrencyCode)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-bold font-mono block ${
                          net > 0
                            ? 'text-emerald-600'
                            : net < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {net === 0
                          ? 'Settled'
                          : formatCurrency(net, group.currency as CurrencyCode, true)}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {net > 0 ? 'is owed' : net < 0 ? 'owes' : 'even'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past Settlements History */}
          <div className="card-fintech p-0 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
                Settlements History ({settlements.length})
              </h4>
            </div>

            {settlements.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-secondary">
                No settlements recorded yet in this group.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {settlements.map(s => (
                  <div key={s.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        <strong className="text-navy">{s.payer_profile?.full_name || 'Member'}</strong> paid{' '}
                        <strong className="text-navy">{s.payee_profile?.full_name || 'Member'}</strong>
                      </span>
                      {s.notes && (
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({s.notes})
                        </span>
                      )}
                    </div>
                    <span className="font-bold font-mono text-emerald-600">
                      {formatCurrency(s.amount_paise, group.currency as CurrencyCode)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              Group Roster ({members.length})
            </h3>
            <button
              onClick={() => setAddMemberOpen(true)}
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => (
              <div key={m.user_id} className="card-fintech p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={m.profile?.full_name} size="md" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy truncate">
                      {m.profile?.full_name || 'Member'}
                    </p>
                    <p className="text-[10px] text-text-secondary truncate">
                      {m.profile?.email || 'Registered user'}
                    </p>
                    <span className="text-[9px] font-semibold text-royal uppercase tracking-wider mt-0.5 inline-block">
                      {m.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-fintech">
            <h4 className="text-sm font-bold text-navy mb-4">
              Spending by Category
            </h4>
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-10">No expense data</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card-fintech">
            <h4 className="text-sm font-bold text-navy mb-4">
              Category Breakdown
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {categoryChartData.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-navy">{cat.name}</span>
                  </div>
                  <span className="font-mono font-bold text-navy">
                    {formatCurrency(cat.paise, group.currency as CurrencyCode)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        group={group}
        members={members}
        onExpenseAdded={loadGroupData}
      />

      <SettleUpModal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        group={group}
        members={members}
        initialPayerId={settleInitialData.payerId}
        initialPayeeId={settleInitialData.payeeId}
        initialAmountPaise={settleInitialData.amountPaise}
        onSettled={loadGroupData}
      />

      <AddMemberModal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        groupId={group.id}
        groupName={group.name}
        onMemberAdded={loadGroupData}
      />
    </div>
  );
};

