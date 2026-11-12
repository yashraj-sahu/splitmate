// Core domain models for SplitMate

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'SGD' | 'AED';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  default_currency: CurrencyCode;
  created_at: string;
  updated_at?: string;
}

export type AdminRoleType = 'admin' | 'super_admin';

export interface AdminRole {
  id: string;
  user_id: string;
  role: AdminRoleType;
  created_at: string;
}

export type GroupCategory = 'Trip' | 'Home' | 'Couple' | 'Project' | 'Friends' | 'Other';

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  category: GroupCategory;
  currency: CurrencyCode;
  created_by: string;
  created_at: string;
  updated_at?: string;
  // Computed / Joined fields
  member_count?: number;
  total_expenses_paise?: number;
  user_net_balance_paise?: number;
}

export type GroupMemberRole = 'admin' | 'member';

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
  profile?: UserProfile;
}

export type ExpenseCategory = 
  | 'Food' 
  | 'Travel' 
  | 'Utilities' 
  | 'Entertainment' 
  | 'Housing' 
  | 'Shopping' 
  | 'Other';

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ExpensePayer {
  id: string;
  expense_id: string;
  user_id: string;
  amount_paid_paise: number; // in integer paise
  profile?: UserProfile;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  owed_amount_paise: number; // in integer paise
  percentage?: number | null;
  shares?: number | null;
  profile?: UserProfile;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  description?: string | null;
  amount_paise: number; // in integer paise (e.g. 100.50 INR = 10050 paise)
  currency: CurrencyCode;
  category: ExpenseCategory;
  split_method: SplitMethod;
  expense_date: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  // Relations
  payers?: ExpensePayer[];
  splits?: ExpenseSplit[];
  creator_profile?: UserProfile;
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount_paise: number; // in integer paise
  currency: CurrencyCode;
  settled_at: string;
  notes?: string | null;
  created_at: string;
  // Joined
  payer_profile?: UserProfile;
  payee_profile?: UserProfile;
}

export interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount_paise: number;
  from_profile?: UserProfile;
  to_profile?: UserProfile;
}

export interface MemberBalance {
  user_id: string;
  profile?: UserProfile;
  total_paid_paise: number;
  total_owed_paise: number;
  net_balance_paise: number; // positive = owed money, negative = owes money
}

