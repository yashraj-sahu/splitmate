# SplitMate — Production Expense Management Application

> **Tagline:** *"Split Expenses. Not Friendships."*

SplitMate is a modern, production-grade fintech web application engineered for shared expense tracking, group balance management, multi-payer contributions, and debt simplification graph solving.

---

## 1. Key Architectural Features

- **Integer Paise Arithmetic Engine**: Eliminates IEEE 754 floating-point inaccuracies. All monetary storage and calculation is done in integer paise (1 INR = 100 paise), sequentially distributing rounding remainders to prevent penny leakage.
- **Min-Cash-Flow Debt Simplification**: A greedy graph solver reduces complex multi-party cycles (e.g. A owes B, B owes C) into the minimum possible transactions.
- **Multi-Payer & Custom Splits**: Full support for single or multiple payers with Equal, Exact, Percentage, and Shares/Ratio splitting.
- **Server-Side Admin Role Enforcement**: Administrator privileges for `singhsagarpratap196@gmail.com` are verified directly against the database (`public.admin_roles` and security definer functions). Ordinary users cannot self-promote.
- **PostgreSQL Row Level Security (RLS)**: Fine-grained access control ensures users only view groups, expenses, and settlements they belong to.
- **Dual Persistence Architecture**: Connects directly to Supabase when configured, with a reactive browser sandbox fallback for offline or demo testing.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Routing**: React Router 7.18.5 (Vulnerability-audited & secure)
- **Styling**: Tailwind CSS v3 with custom fintech palette (`#101D35` Navy, `#3563E9` Royal Blue, `#F5F7FC` Background, `#16A36A` Success Green)
- **Analytics & Charts**: Recharts
- **Icons**: Lucide React
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)

---

## 3. Project Structure

```
Splitmate/
├── .env.example                          # Vercel-compatible env template
├── supabase/
│   └── migrations/
│       └── 20261112_init_splitmate.sql  # Full DB schema, RLS policies & admin bootstrap
├── scripts/
│   └── test-runner.js                    # Calculation engine test suite
├── src/
│   ├── types/
│   │   └── models.ts                     # TypeScript domain models
│   ├── utils/
│   │   ├── formatters.ts                 # Currency & date formatters
│   │   ├── calculator.ts                 # Core paise math & debt simplification engine
│   │   └── calculator.test.ts            # Edge case calculation test specifications
│   ├── services/
│   │   ├── supabase.ts                   # Supabase client singleton
│   │   ├── authService.ts                # Authentication & DB admin verification
│   │   ├── groupService.ts               # Groups & members CRUD
│   │   ├── expenseService.ts             # Expenses, payers & settlements
│   │   ├── adminService.ts               # Platform stats & audit logs
│   │   └── mockData.ts                   # Default seed dataset & sandbox store
│   ├── context/
│   │   ├── AuthContext.tsx               # Global auth state & user personas
│   │   └── ToastContext.tsx              # Toast notifications provider
│   ├── components/
│   │   ├── common/                       # Modal, StatCard, Badge, Avatar, EmptyState
│   │   ├── layout/                       # Layout, Sidebar, Header
│   │   ├── expenses/                     # ExpenseModal with 4 split modes & multi-payers
│   │   ├── settlement/                   # SettleUpModal, DebtGraph
│   │   └── group/                        # CreateGroupModal, AddMemberModal
│   ├── pages/
│   │   ├── LandingPage.tsx               # Interactive hero & live calculation sandbox
│   │   ├── LoginPage.tsx                 # Supabase auth & 1-click test personas
│   │   ├── DashboardPage.tsx             # Overview cards, group positions & activity
│   │   ├── GroupsPage.tsx                # Group catalog with category filters
│   │   ├── GroupDetailPage.tsx           # Expenses, Balances, Members & Analytics tabs
│   │   ├── ExpensesPage.tsx              # Searchable global transaction ledger
│   │   ├── AnalyticsPage.tsx             # Recharts spending distributions & timelines
│   │   ├── ProfilePage.tsx               # Currency settings & database status
│   │   └── AdminPage.tsx                 # Database-enforced admin dashboard
│   ├── App.tsx                           # React Router 7 declarative routing
│   ├── index.css                         # Tailwind CSS v3 base & components
│   └── main.tsx
└── tailwind.config.js                    # Fintech palette & content configuration
```

---

## 4. Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*(If left blank, SplitMate automatically runs in Sandbox Mode with rich realistic demo data!)*

### 3. Run Calculation Engine Tests
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
```

---

## 5. Supabase Setup & Migrations

To connect a live Supabase project:
1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the migration file located at:
   `supabase/migrations/20261112_init_splitmate.sql`
4. This will create:
   - Tables: `profiles`, `admin_roles`, `groups`, `group_members`, `expenses`, `expense_payers`, `expense_splits`, `settlements`
   - Security Definer Functions: `is_admin()`, `is_group_member()`
   - Strict Row Level Security policies
   - Auto-bootstrap trigger: automatically assigns `super_admin` role to `singhsagarpratap196@gmail.com` upon signup or migration.

---

## 6. Vercel Deployment

1. Push your repository to GitHub/GitLab.
2. Import the project in Vercel.
3. Set Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build Command: `npm run build`
5. Output Directory: `dist`
