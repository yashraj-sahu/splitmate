import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { groupService } from '../services/groupService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Expense, Group, ExpenseCategory, CurrencyCode } from '../types/models';
import { CategoryBadge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { Search, ReceiptText, Calendar, Filter, ArrowUpDown } from 'lucide-react';

const CATEGORIES: ('All' | ExpenseCategory)[] = [
  'All',
  'Food',
  'Travel',
  'Utilities',
  'Entertainment',
  'Housing',
  'Shopping',
  'Other',
];

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ExpenseCategory>('All');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [allExp, userGroups] = await Promise.all([
        expenseService.getAllExpensesForUser(user.id),
        groupService.getGroups(user.id),
      ]);
      setExpenses(allExp);
      setGroups(userGroups);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const groupsMap = groups.reduce((acc, g) => {
    acc[g.id] = g;
    return acc;
  }, {} as Record<string, Group>);

  const filtered = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(search.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesGroup = selectedGroupId === 'All' || exp.group_id === selectedGroupId;
    return matchesSearch && matchesCat && matchesGroup;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
    if (sortBy === 'date-asc') return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
    if (sortBy === 'amount-desc') return b.amount_paise - a.amount_paise;
    if (sortBy === 'amount-asc') return a.amount_paise - b.amount_paise;
    return 0;
  });

  const totalPaiseFiltered = filtered.reduce((acc, e) => acc + e.amount_paise, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">
            All Expenses
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Complete transaction record across all your active groups.
          </p>
        </div>

        <div className="card-fintech p-3 bg-white border border-slate-200 text-xs">
          <span className="text-text-secondary block">Total Volume Filtered:</span>
          <span className="text-base font-bold font-mono text-royal">
            {formatCurrency(totalPaiseFiltered, user?.default_currency || 'INR')}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-fintech p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-fintech pl-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="input-fintech text-xs"
            >
              <option value="All">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="input-fintech text-xs"
            >
              <option value="date-desc">Newest Date First</option>
              <option value="date-asc">Oldest Date First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Categories scroll row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-royal text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table / List */}
      <div className="card-fintech p-0 divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">
            No expenses found matching the current search criteria.
          </div>
        ) : (
          filtered.map(exp => {
            const grp = groupsMap[exp.group_id];
            return (
              <div key={exp.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar name={exp.creator_profile?.full_name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-navy truncate">
                        {exp.title}
                      </h4>
                      <CategoryBadge category={exp.category} />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-text-secondary">
                      <span className="font-semibold text-royal">
                        {grp ? grp.name : 'Group'}
                      </span>
                      <span>•</span>
                      <span>{formatDate(exp.expense_date)}</span>
                      <span>•</span>
                      <span>Paid by {exp.creator_profile?.full_name || 'Member'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-bold font-mono text-navy block">
                    {formatCurrency(exp.amount_paise, exp.currency as CurrencyCode)}
                  </span>
                  <span className="text-[10px] text-text-secondary capitalize font-medium">
                    {exp.split_method} split
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

