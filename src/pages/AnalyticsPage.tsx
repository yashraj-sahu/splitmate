import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { groupService } from '../services/groupService';
import { formatCurrency } from '../utils/formatters';
import { Expense, Group, CurrencyCode } from '../types/models';
import { StatCard } from '../components/common/StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  CreditCard, 
  ShoppingBag, 
  ArrowUpRight,
  Receipt
} from 'lucide-react';

const PALETTE = ['#3563E9', '#101D35', '#16A36A', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#F43F5E'];

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [allExp, allGrp] = await Promise.all([
          expenseService.getAllExpensesForUser(user.id),
          groupService.getGroups(user.id),
        ]);
        setExpenses(allExp);
        setGroups(allGrp);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Aggregate category data
  const categoryMap: Record<string, number> = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount_paise;
  });
  const categoryData = Object.entries(categoryMap).map(([name, paise]) => ({
    name,
    amount: paise / 100,
    paise,
  }));

  // Aggregate group data
  const groupMap: Record<string, number> = {};
  const groupNamesMap = groups.reduce((acc, g) => ({ ...acc, [g.id]: g.name }), {} as Record<string, string>);
  expenses.forEach(e => {
    const gName = groupNamesMap[e.group_id] || 'Unknown Group';
    groupMap[gName] = (groupMap[gName] || 0) + e.amount_paise;
  });
  const groupData = Object.entries(groupMap).map(([name, paise]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '…' : name,
    fullName: name,
    amount: paise / 100,
    paise,
  }));

  // Aggregate monthly trends
  const monthMap: Record<string, number> = {};
  expenses.forEach(e => {
    const month = e.expense_date.substring(0, 7); // YYYY-MM
    monthMap[month] = (monthMap[month] || 0) + e.amount_paise;
  });
  const monthData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, paise]) => ({
      month,
      amount: paise / 100,
      paise,
    }));

  const totalPaise = expenses.reduce((acc, e) => acc + e.amount_paise, 0);
  const avgExpensePaise = expenses.length > 0 ? Math.round(totalPaise / expenses.length) : 0;
  const maxExpense = expenses.reduce((max, e) => (e.amount_paise > max ? e.amount_paise : max), 0);

  // Top spending category
  let topCategory = 'None';
  let topCatPaise = 0;
  Object.entries(categoryMap).forEach(([cat, paise]) => {
    if (paise > topCatPaise) {
      topCategory = cat;
      topCatPaise = paise;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
          Financial Analytics
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Visual spending breakdowns, category proportions, and historical group trends.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Spending"
          value={formatCurrency(totalPaise, user?.default_currency || 'INR')}
          subtitle={`Across ${expenses.length} tracked expenses`}
          icon={CreditCard}
          variant="royal"
        />

        <StatCard
          title="Average Expense"
          value={formatCurrency(avgExpensePaise, user?.default_currency || 'INR')}
          subtitle="Mean bill per transaction"
          icon={Receipt}
          variant="navy"
        />

        <StatCard
          title="Top Category"
          value={topCategory}
          subtitle={topCatPaise > 0 ? formatCurrency(topCatPaise, user?.default_currency || 'INR') : 'No expenses'}
          icon={ShoppingBag}
          variant="amber"
        />

        <StatCard
          title="Largest Single Bill"
          value={formatCurrency(maxExpense, user?.default_currency || 'INR')}
          subtitle="Maximum ticket size"
          icon={ArrowUpRight}
          variant="rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category (Pie Chart) */}
        <div className="card-fintech">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-navy flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-royal" />
              <span>Spending by Category</span>
            </h3>
            <span className="text-xs text-text-secondary font-mono">
              {categoryData.length} categories
            </span>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-text-secondary">
              No category data recorded yet
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cat-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Spent']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Spending by Group (Bar Chart) */}
        <div className="card-fintech">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-navy flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-royal" />
              <span>Spending by Group</span>
            </h3>
            <span className="text-xs text-text-secondary font-mono">
              {groupData.length} groups
            </span>
          </div>

          {groupData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-text-secondary">
              No group data available
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Total Expenses']}
                  />
                  <Bar dataKey="amount" fill="#3563E9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Timeline Trend */}
      <div className="card-fintech">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-navy flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Monthly Spending Timeline</span>
          </h3>
          <span className="text-xs text-text-secondary">
            Cumulative timeline
          </span>
        </div>

        {monthData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-xs text-text-secondary">
            No historical timeline data yet
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Expenses']}
                />
                <Bar dataKey="amount" fill="#101D35" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

