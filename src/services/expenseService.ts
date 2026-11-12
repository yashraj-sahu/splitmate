import { supabase, isSupabaseConfigured } from './supabase';
import { Expense, Settlement, UserProfile } from '../types/models';
import { INITIAL_EXPENSES, INITIAL_SETTLEMENTS, INITIAL_PROFILES } from './mockData';

const EXPENSES_KEY = 'splitmate_expenses';
const SETTLEMENTS_KEY = 'splitmate_settlements';
const PROFILES_KEY = 'splitmate_profiles';

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

function getStoredExpenses(): Expense[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(EXPENSES_KEY);
  if (!raw) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(INITIAL_EXPENSES));
    return INITIAL_EXPENSES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_EXPENSES;
  }
}

function getStoredSettlements(): Settlement[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(SETTLEMENTS_KEY);
  if (!raw) {
    localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(INITIAL_SETTLEMENTS));
    return INITIAL_SETTLEMENTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_SETTLEMENTS;
  }
}

function getStoredProfiles(): UserProfile[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(PROFILES_KEY);
  if (!raw) return INITIAL_PROFILES;
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROFILES;
  }
}

export const expenseService = {
  /**
   * Get all expenses for a specific group (with payers and splits joined)
   */
  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          creator_profile:profiles!created_by(*),
          payers:expense_payers(*, profile:profiles(*)),
          splits:expense_splits(*, profile:profiles(*))
        `)
        .eq('group_id', groupId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Expense[];
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const expenses = getStoredExpenses().filter(e => e.group_id === groupId);
    const profiles = getStoredProfiles();
    return expenses.map(e => ({
      ...e,
      creator_profile: profiles.find(p => p.id === e.created_by),
      payers: (e.payers || []).map(p => ({
        ...p,
        profile: profiles.find(pr => pr.id === p.user_id),
      })),
      splits: (e.splits || []).map(s => ({
        ...s,
        profile: profiles.find(pr => pr.id === s.user_id),
      })),
    }));
  },

  /**
   * Get all expenses involving a specific user across all groups
   */
  async getAllExpensesForUser(userId: string): Promise<Expense[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          creator_profile:profiles!created_by(*),
          payers:expense_payers(*, profile:profiles(*)),
          splits:expense_splits(*, profile:profiles(*))
        `)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      const all = (data || []) as unknown as Expense[];
      return all.filter(e => 
        e.created_by === userId ||
        e.payers?.some(p => p.user_id === userId) ||
        e.splits?.some(s => s.user_id === userId)
      );
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const expenses = getStoredExpenses();
    const profiles = getStoredProfiles();
    const userExpenses = expenses.filter(e =>
      e.created_by === userId ||
      e.payers?.some(p => p.user_id === userId) ||
      e.splits?.some(s => s.user_id === userId)
    );

    return userExpenses.map(e => ({
      ...e,
      creator_profile: profiles.find(p => p.id === e.created_by),
      payers: (e.payers || []).map(p => ({
        ...p,
        profile: profiles.find(pr => pr.id === p.user_id),
      })),
      splits: (e.splits || []).map(s => ({
        ...s,
        profile: profiles.find(pr => pr.id === s.user_id),
      })),
    }));
  },

  /**
   * Create an expense with payers and splits
   */
  async createExpense(data: {
    group_id: string;
    title: string;
    description?: string;
    amount_paise: number;
    currency: Expense['currency'];
    category: Expense['category'];
    split_method: Expense['split_method'];
    expense_date: string;
    created_by: string;
    payers: { user_id: string; amount_paid_paise: number }[];
    splits: { user_id: string; owed_amount_paise: number; percentage?: number; shares?: number }[];
  }): Promise<Expense> {
    if (isSupabaseConfigured) {
      // 1. Insert expense parent row
      const { data: expRow, error: expErr } = await supabase
        .from('expenses')
        .insert([{
          group_id: data.group_id,
          title: data.title,
          description: data.description,
          amount_paise: data.amount_paise,
          currency: data.currency,
          category: data.category,
          split_method: data.split_method,
          expense_date: data.expense_date,
          created_by: data.created_by,
        }])
        .select()
        .single();

      if (expErr) throw expErr;

      // 2. Insert payers
      const payerInserts = data.payers.map(p => ({
        expense_id: expRow.id,
        user_id: p.user_id,
        amount_paid_paise: p.amount_paid_paise,
      }));
      const { error: payerErr } = await supabase.from('expense_payers').insert(payerInserts);
      if (payerErr) throw payerErr;

      // 3. Insert splits
      const splitInserts = data.splits.map(s => ({
        expense_id: expRow.id,
        user_id: s.user_id,
        owed_amount_paise: s.owed_amount_paise,
        percentage: s.percentage ?? null,
        shares: s.shares ?? null,
      }));
      const { error: splitErr } = await supabase.from('expense_splits').insert(splitInserts);
      if (splitErr) throw splitErr;

      // Return refreshed record
      const refreshed = await this.getGroupExpenses(data.group_id);
      return refreshed.find(e => e.id === expRow.id) || (expRow as unknown as Expense);
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const expenses = getStoredExpenses();
    const newId = `exp-${Date.now()}`;
    const newExpense: Expense = {
      id: newId,
      group_id: data.group_id,
      title: data.title,
      description: data.description,
      amount_paise: data.amount_paise,
      currency: data.currency,
      category: data.category,
      split_method: data.split_method,
      expense_date: data.expense_date,
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      payers: data.payers.map((p, idx) => ({
        id: `p-${newId}-${idx}`,
        expense_id: newId,
        user_id: p.user_id,
        amount_paid_paise: p.amount_paid_paise,
      })),
      splits: data.splits.map((s, idx) => ({
        id: `s-${newId}-${idx}`,
        expense_id: newId,
        user_id: s.user_id,
        owed_amount_paise: s.owed_amount_paise,
        percentage: s.percentage,
        shares: s.shares,
      })),
    };

    expenses.unshift(newExpense);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    return newExpense;
  },

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      return;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const expenses = getStoredExpenses().filter(e => e.id !== expenseId);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  },

  /**
   * Get all settlements for a group
   */
  async getGroupSettlements(groupId: string): Promise<Settlement[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('settlements')
        .select(`
          *,
          payer_profile:profiles!payer_id(*),
          payee_profile:profiles!payee_id(*)
        `)
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Settlement[];
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const settlements = getStoredSettlements().filter(s => s.group_id === groupId);
    const profiles = getStoredProfiles();
    return settlements.map(s => ({
      ...s,
      payer_profile: profiles.find(p => p.id === s.payer_id),
      payee_profile: profiles.find(p => p.id === s.payee_id),
    }));
  },

  /**
   * Record a settlement between two members
   */
  async createSettlement(data: {
    group_id: string;
    payer_id: string;
    payee_id: string;
    amount_paise: number;
    currency: Expense['currency'];
    notes?: string;
  }): Promise<Settlement> {
    if (isSupabaseConfigured) {
      const { data: settleRow, error } = await supabase
        .from('settlements')
        .insert([{
          group_id: data.group_id,
          payer_id: data.payer_id,
          payee_id: data.payee_id,
          amount_paise: data.amount_paise,
          currency: data.currency,
          notes: data.notes,
          settled_at: new Date().toISOString(),
        }])
        .select(`
          *,
          payer_profile:profiles!payer_id(*),
          payee_profile:profiles!payee_id(*)
        `)
        .single();

      if (error) throw error;
      return settleRow as unknown as Settlement;
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const settlements = getStoredSettlements();
    const profiles = getStoredProfiles();
    const newSettlement: Settlement = {
      id: `settle-${Date.now()}`,
      group_id: data.group_id,
      payer_id: data.payer_id,
      payee_id: data.payee_id,
      amount_paise: data.amount_paise,
      currency: data.currency,
      settled_at: new Date().toISOString(),
      notes: data.notes,
      created_at: new Date().toISOString(),
      payer_profile: profiles.find(p => p.id === data.payer_id),
      payee_profile: profiles.find(p => p.id === data.payee_id),
    };

    settlements.unshift(newSettlement);
    localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements));
    return newSettlement;
  }
};
