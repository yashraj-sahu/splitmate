import { Group, UserProfile, Expense, Settlement, AdminRole } from '../types/models';

export const ADMIN_EMAIL = 'singhsagarpratap196@gmail.com';

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-admin-1',
    email: 'singhsagarpratap196@gmail.com',
    full_name: 'Sagar Pratap Singh',
    avatar_url: null,
    phone: '+91 98765 43210',
    default_currency: 'INR',
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'user-alex-2',
    email: 'alex.morgan@splitmate.io',
    full_name: 'Alex Morgan',
    avatar_url: null,
    phone: '+91 98111 22334',
    default_currency: 'INR',
    created_at: '2026-02-15T10:30:00Z',
  },
  {
    id: 'user-priya-3',
    email: 'priya.sharma@example.com',
    full_name: 'Priya Sharma',
    avatar_url: null,
    phone: '+91 98222 33445',
    default_currency: 'INR',
    created_at: '2026-03-01T12:00:00Z',
  },
  {
    id: 'user-rohit-4',
    email: 'rohit.verma@example.com',
    full_name: 'Rohit Verma',
    avatar_url: null,
    phone: '+91 98333 44556',
    default_currency: 'INR',
    created_at: '2026-03-05T14:20:00Z',
  },
];

export const INITIAL_ADMIN_ROLES: AdminRole[] = [
  {
    id: 'admin-role-1',
    user_id: 'user-admin-1',
    role: 'super_admin',
    created_at: '2026-01-10T09:00:00Z',
  },
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp-goa-101',
    name: 'Goa Summer Trip 🏖️',
    description: 'Beach resort, scooty rentals, water sports & seaside dining',
    category: 'Trip',
    currency: 'INR',
    created_by: 'user-admin-1',
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'grp-flat-102',
    name: 'Flat 402 Palm Heights 🏠',
    description: 'Monthly groceries, WiFi, cook charges and maid salary',
    category: 'Home',
    currency: 'INR',
    created_by: 'user-alex-2',
    created_at: '2026-09-15T11:00:00Z',
  },
  {
    id: 'grp-weekend-103',
    name: 'Weekend Trek & Camp 🏕️',
    description: 'Trek guide, campsite bookings, barbecue and equipment rentals',
    category: 'Friends',
    currency: 'INR',
    created_by: 'user-priya-3',
    created_at: '2026-10-20T08:00:00Z',
  },
];

export const INITIAL_GROUP_MEMBERS = [
  { id: 'gm-1', group_id: 'grp-goa-101', user_id: 'user-admin-1', role: 'admin' as const, joined_at: '2026-10-01T10:00:00Z' },
  { id: 'gm-2', group_id: 'grp-goa-101', user_id: 'user-alex-2', role: 'member' as const, joined_at: '2026-10-01T10:05:00Z' },
  { id: 'gm-3', group_id: 'grp-goa-101', user_id: 'user-priya-3', role: 'member' as const, joined_at: '2026-10-01T10:10:00Z' },
  { id: 'gm-4', group_id: 'grp-goa-101', user_id: 'user-rohit-4', role: 'member' as const, joined_at: '2026-10-01T10:15:00Z' },

  { id: 'gm-5', group_id: 'grp-flat-102', user_id: 'user-admin-1', role: 'member' as const, joined_at: '2026-09-15T11:00:00Z' },
  { id: 'gm-6', group_id: 'grp-flat-102', user_id: 'user-alex-2', role: 'admin' as const, joined_at: '2026-09-15T11:00:00Z' },
  { id: 'gm-7', group_id: 'grp-flat-102', user_id: 'user-rohit-4', role: 'member' as const, joined_at: '2026-09-15T11:05:00Z' },

  { id: 'gm-8', group_id: 'grp-weekend-103', user_id: 'user-admin-1', role: 'member' as const, joined_at: '2026-10-20T08:00:00Z' },
  { id: 'gm-9', group_id: 'grp-weekend-103', user_id: 'user-priya-3', role: 'admin' as const, joined_at: '2026-10-20T08:00:00Z' },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    group_id: 'grp-goa-101',
    title: 'Seaside Villa Stay (3 Nights)',
    description: 'Oceanfront villa booking with breakfast included',
    amount_paise: 2400000, // ₹24,000.00
    currency: 'INR',
    category: 'Housing',
    split_method: 'equal',
    expense_date: '2026-10-02',
    created_by: 'user-admin-1',
    created_at: '2026-10-02T12:00:00Z',
    payers: [
      { id: 'p-1', expense_id: 'exp-1', user_id: 'user-admin-1', amount_paid_paise: 2400000 },
    ],
    splits: [
      { id: 's-1', expense_id: 'exp-1', user_id: 'user-admin-1', owed_amount_paise: 600000 },
      { id: 's-2', expense_id: 'exp-1', user_id: 'user-alex-2', owed_amount_paise: 600000 },
      { id: 's-3', expense_id: 'exp-1', user_id: 'user-priya-3', owed_amount_paise: 600000 },
      { id: 's-4', expense_id: 'exp-1', user_id: 'user-rohit-4', owed_amount_paise: 600000 },
    ],
  },
  {
    id: 'exp-2',
    group_id: 'grp-goa-101',
    title: 'Fisherman’s Wharf Seafood Dinner',
    description: 'King prawns, crab roast, drinks & dessert',
    amount_paise: 760000, // ₹7,600.00
    currency: 'INR',
    category: 'Food',
    split_method: 'equal',
    expense_date: '2026-10-03',
    created_by: 'user-alex-2',
    created_at: '2026-10-03T21:30:00Z',
    payers: [
      { id: 'p-2', expense_id: 'exp-2', user_id: 'user-alex-2', amount_paid_paise: 760000 },
    ],
    splits: [
      { id: 's-5', expense_id: 'exp-2', user_id: 'user-admin-1', owed_amount_paise: 190000 },
      { id: 's-6', expense_id: 'exp-2', user_id: 'user-alex-2', owed_amount_paise: 190000 },
      { id: 's-7', expense_id: 'exp-2', user_id: 'user-priya-3', owed_amount_paise: 190000 },
      { id: 's-8', expense_id: 'exp-2', user_id: 'user-rohit-4', owed_amount_paise: 190000 },
    ],
  },
  {
    id: 'exp-3',
    group_id: 'grp-goa-101',
    title: 'Scooter Rentals & Fuel',
    description: '4 Honda Activas for 3 full days (Multiple Payers)',
    amount_paise: 480000, // ₹4,800.00
    currency: 'INR',
    category: 'Travel',
    split_method: 'equal',
    expense_date: '2026-10-02',
    created_by: 'user-priya-3',
    created_at: '2026-10-02T16:00:00Z',
    payers: [
      { id: 'p-3a', expense_id: 'exp-3', user_id: 'user-priya-3', amount_paid_paise: 280000 },
      { id: 'p-3b', expense_id: 'exp-3', user_id: 'user-rohit-4', amount_paid_paise: 200000 },
    ],
    splits: [
      { id: 's-9', expense_id: 'exp-3', user_id: 'user-admin-1', owed_amount_paise: 120000 },
      { id: 's-10', expense_id: 'exp-3', user_id: 'user-alex-2', owed_amount_paise: 120000 },
      { id: 's-11', expense_id: 'exp-3', user_id: 'user-priya-3', owed_amount_paise: 120000 },
      { id: 's-12', expense_id: 'exp-3', user_id: 'user-rohit-4', owed_amount_paise: 120000 },
    ],
  },
  {
    id: 'exp-4',
    group_id: 'grp-flat-102',
    title: 'High-Speed Fiber Internet & Streaming',
    description: '300 Mbps unlimited fiber connection for October',
    amount_paise: 149900, // ₹1,499.00
    currency: 'INR',
    category: 'Utilities',
    split_method: 'equal',
    expense_date: '2026-10-05',
    created_by: 'user-admin-1',
    created_at: '2026-10-05T09:00:00Z',
    payers: [
      { id: 'p-4', expense_id: 'exp-4', user_id: 'user-admin-1', amount_paid_paise: 149900 },
    ],
    splits: [
      { id: 's-13', expense_id: 'exp-4', user_id: 'user-admin-1', owed_amount_paise: 49968 },
      { id: 's-14', expense_id: 'exp-4', user_id: 'user-alex-2', owed_amount_paise: 49966 },
      { id: 's-15', expense_id: 'exp-4', user_id: 'user-rohit-4', owed_amount_paise: 49966 },
    ],
  },
  {
    id: 'exp-5',
    group_id: 'grp-weekend-103',
    title: 'Campsite & Bonfire Pass',
    description: 'Tents, sleeping bags, guided forest trail',
    amount_paise: 650000, // ₹6,500.00
    currency: 'INR',
    category: 'Entertainment',
    split_method: 'shares',
    expense_date: '2026-10-22',
    created_by: 'user-priya-3',
    created_at: '2026-10-22T17:00:00Z',
    payers: [
      { id: 'p-5', expense_id: 'exp-5', user_id: 'user-priya-3', amount_paid_paise: 650000 },
    ],
    splits: [
      { id: 's-16', expense_id: 'exp-5', user_id: 'user-admin-1', owed_amount_paise: 325000, shares: 1 },
      { id: 's-17', expense_id: 'exp-5', user_id: 'user-priya-3', owed_amount_paise: 325000, shares: 1 },
    ],
  },
];

export const INITIAL_SETTLEMENTS: Settlement[] = [
  {
    id: 'settle-1',
    group_id: 'grp-goa-101',
    payer_id: 'user-rohit-4',
    payee_id: 'user-admin-1',
    amount_paise: 250000, // ₹2,500.00
    currency: 'INR',
    settled_at: '2026-10-04T18:00:00Z',
    notes: 'Partial settlement via UPI for villa share',
    created_at: '2026-10-04T18:00:00Z',
  },
];

