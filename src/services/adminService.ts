import { supabase, isSupabaseConfigured } from './supabase';
import { authService } from './authService';
import { UserProfile, Group, Expense, AdminRole, Settlement } from '../types/models';
import { INITIAL_PROFILES, INITIAL_GROUPS, INITIAL_EXPENSES, INITIAL_SETTLEMENTS } from './mockData';

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalVolumePaise: number;
  totalSettlements: number;
  totalSettlementVolumePaise: number;
}

export const adminService = {
  /**
   * Enforce server-side / database admin role before returning platform metrics
   */
  async verifyAdminAccess(userId: string): Promise<boolean> {
    const isAdmin = await authService.checkAdminStatus(userId);
    if (!isAdmin) {
      throw new Error('Access denied: Requires verified database administrator role.');
    }
    return true;
  },

  /**
   * Platform-wide aggregated statistics for admin dashboard
   */
  async getPlatformStats(currentUserId: string): Promise<AdminStats> {
    await this.verifyAdminAccess(currentUserId);

    if (isSupabaseConfigured) {
      const [{ count: usersCount, error: uErr }, { count: groupsCount, error: gErr }, { data: expenseRows, error: eErr }, { data: settlementRows, error: sErr }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('expenses').select('amount_paise'),
        supabase.from('settlements').select('amount_paise'),
      ]);

      if (uErr) throw uErr;
      if (gErr) throw gErr;
      if (eErr) throw eErr;
      if (sErr) throw sErr;

      const totalVolumePaise = (expenseRows || []).reduce((acc: number, row: any) => acc + (Number(row.amount_paise) || 0), 0);
      const totalSettlementVolumePaise = (settlementRows || []).reduce((acc: number, row: any) => acc + (Number(row.amount_paise) || 0), 0);

      return {
        totalUsers: usersCount || 0,
        totalGroups: groupsCount || 0,
        totalExpenses: expenseRows?.length || 0,
        totalVolumePaise,
        totalSettlements: settlementRows?.length || 0,
        totalSettlementVolumePaise,
      };
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    // Demo store stats in local development only
    const rawProfiles = localStorage.getItem('splitmate_profiles');
    const profiles = rawProfiles ? JSON.parse(rawProfiles) : INITIAL_PROFILES;
    const rawGroups = localStorage.getItem('splitmate_groups');
    const groups = rawGroups ? JSON.parse(rawGroups) : INITIAL_GROUPS;
    const rawExpenses = localStorage.getItem('splitmate_expenses');
    const expenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : INITIAL_EXPENSES;
    const rawSettlements = localStorage.getItem('splitmate_settlements');
    const settlements: Settlement[] = rawSettlements ? JSON.parse(rawSettlements) : INITIAL_SETTLEMENTS;

    const totalVolumePaise = expenses.reduce((acc: number, exp: Expense) => acc + exp.amount_paise, 0);
    const totalSettlementVolumePaise = settlements.reduce((acc: number, s: Settlement) => acc + s.amount_paise, 0);

    return {
      totalUsers: profiles.length,
      totalGroups: groups.length,
      totalExpenses: expenses.length,
      totalVolumePaise,
      totalSettlements: settlements.length,
      totalSettlementVolumePaise,
    };
  },

  /**
   * Fetch all registered users for platform administration
   */
  async getAllUsers(currentUserId: string): Promise<UserProfile[]> {
    await this.verifyAdminAccess(currentUserId);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as UserProfile[];
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const raw = localStorage.getItem('splitmate_profiles');
    return raw ? JSON.parse(raw) : INITIAL_PROFILES;
  },

  /**
   * Fetch all groups across platform
   */
  async getAllGroups(currentUserId: string): Promise<Group[]> {
    await this.verifyAdminAccess(currentUserId);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Group[];
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const raw = localStorage.getItem('splitmate_groups');
    return raw ? JSON.parse(raw) : INITIAL_GROUPS;
  },

  /**
   * Fetch database admin role allocations
   */
  async getAdminRoles(currentUserId: string): Promise<AdminRole[]> {
    await this.verifyAdminAccess(currentUserId);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as AdminRole[];
    }

    if (isProduction) {
      throw new Error('Supabase configuration is required in production.');
    }

    const raw = localStorage.getItem('splitmate_admin_roles');
    return raw ? JSON.parse(raw) : [];
  }
};
