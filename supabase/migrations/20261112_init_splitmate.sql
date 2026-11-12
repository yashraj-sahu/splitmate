-- ============================================================================
-- SPLITMATE: PRODUCTION DATABASE SCHEMA & ROW LEVEL SECURITY POLICIES
-- Security Audited & Hardened Migration
-- Monetary Unit: BIGINT paise (1 INR = 100 paise; 1 USD = 100 cents)
-- No floating point numbers are used for financial figures.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    default_currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. ADMIN ROLES TABLE
-- Checked server-side. Ordinary users cannot insert or update their own admin status.
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);

-- 3. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Trip' CHECK (category IN ('Trip', 'Home', 'Couple', 'Project', 'Friends', 'Other')),
    currency TEXT NOT NULL DEFAULT 'INR',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- 5. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    category TEXT NOT NULL DEFAULT 'Food' CHECK (category IN ('Food', 'Travel', 'Utilities', 'Entertainment', 'Housing', 'Shopping', 'Other')),
    split_method TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- 6. EXPENSE PAYERS TABLE (Multiple Payers Support)
CREATE TABLE IF NOT EXISTS public.expense_payers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_paid_paise BIGINT NOT NULL CHECK (amount_paid_paise >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_payers_expense_id ON public.expense_payers(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payers_user_id ON public.expense_payers(user_id);

-- 7. EXPENSE SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owed_amount_paise BIGINT NOT NULL CHECK (owed_amount_paise >= 0),
    percentage NUMERIC(6,3),
    shares INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);

-- 8. SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    settled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CHECK (payer_id != payee_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer_id ON public.settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payee_id ON public.settlements(payee_id);

-- ============================================================================
-- HELPER FUNCTIONS & SECURITY DEFINER PROCEDURES
-- ============================================================================

-- Function to check whether a user is an administrator (Runs as SECURITY DEFINER with fixed search_path)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = check_user_id
    );
END;
$$;

-- Restrict function execution to authenticated users only
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Function to check whether user is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF check_user_id IS NULL OR check_group_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id AND user_id = check_user_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_group_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;

-- Function to check whether user is a group admin or group creator
CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF check_user_id IS NULL OR check_group_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.groups WHERE id = check_group_id AND created_by = check_user_id
    ) OR EXISTS (
        SELECT 1 FROM public.group_members WHERE group_id = check_group_id AND user_id = check_user_id AND role = 'admin'
    ) OR public.is_admin(check_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.is_group_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ADMIN ROLES POLICIES (Strict Server-Side Access Control)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view admin_roles" ON public.admin_roles;
CREATE POLICY "Admins can view admin_roles"
ON public.admin_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only super admins can insert admin_roles" ON public.admin_roles;
CREATE POLICY "Only super admins can insert admin_roles"
ON public.admin_roles FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

DROP POLICY IF EXISTS "Only super admins can update admin_roles" ON public.admin_roles;
CREATE POLICY "Only super admins can update admin_roles"
ON public.admin_roles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

DROP POLICY IF EXISTS "Only super admins can delete admin_roles" ON public.admin_roles;
CREATE POLICY "Only super admins can delete admin_roles"
ON public.admin_roles FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    AND user_id != auth.uid() -- Prevent admin self-lockout
);

-- ----------------------------------------------------------------------------
-- GROUPS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
CREATE POLICY "Users can view groups they belong to"
ON public.groups FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    public.is_group_member(id, auth.uid()) OR
    created_by = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Group admins or creator can update groups" ON public.groups;
CREATE POLICY "Group admins or creator can update groups"
ON public.groups FOR UPDATE
TO authenticated
USING (public.is_group_admin(id, auth.uid()))
WITH CHECK (
    public.is_group_admin(id, auth.uid()) AND
    created_by = (SELECT g.created_by FROM public.groups g WHERE g.id = groups.id)
);

DROP POLICY IF EXISTS "Group creator or platform admin can delete groups" ON public.groups;
CREATE POLICY "Group creator or platform admin can delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    created_by = auth.uid()
);

-- ----------------------------------------------------------------------------
-- GROUP MEMBERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view other members of their groups" ON public.group_members;
CREATE POLICY "Members can view other members of their groups"
ON public.group_members FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group creators and admins can add group members" ON public.group_members;
CREATE POLICY "Group creators and admins can add group members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
    public.is_group_admin(group_id, auth.uid()) OR
    (
        public.is_group_member(group_id, auth.uid()) AND
        role = 'member' -- Regular members cannot add someone with 'admin' role
    )
);

DROP POLICY IF EXISTS "Group admins can update member roles" ON public.group_members;
CREATE POLICY "Group admins can update member roles"
ON public.group_members FOR UPDATE
TO authenticated
USING (public.is_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
CREATE POLICY "Group admins can remove members"
ON public.group_members FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    user_id = auth.uid() OR -- Member can leave group
    (
        public.is_group_admin(group_id, auth.uid()) AND
        user_id != (SELECT g.created_by FROM public.groups g WHERE g.id = group_id) -- Cannot remove group creator
    )
);

-- ----------------------------------------------------------------------------
-- EXPENSES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group members can view expenses" ON public.expenses;
CREATE POLICY "Group members can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Group members can create expenses" ON public.expenses;
CREATE POLICY "Group members can create expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_group_member(group_id, auth.uid()))
    AND (created_by = auth.uid() OR public.is_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Expense creator or group admin can update expenses" ON public.expenses;
CREATE POLICY "Expense creator or group admin can update expenses"
ON public.expenses FOR UPDATE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    created_by = auth.uid() OR
    public.is_group_admin(group_id, auth.uid())
)
WITH CHECK (
    (public.is_admin(auth.uid()) OR created_by = auth.uid() OR public.is_group_admin(group_id, auth.uid()))
    AND group_id = (SELECT e.group_id FROM public.expenses e WHERE e.id = expenses.id) -- Cannot transfer expense across groups
);

DROP POLICY IF EXISTS "Expense creator or group admin can delete expenses" ON public.expenses;
CREATE POLICY "Expense creator or group admin can delete expenses"
ON public.expenses FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    created_by = auth.uid() OR
    public.is_group_admin(group_id, auth.uid())
);

-- ----------------------------------------------------------------------------
-- EXPENSE PAYERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group members can view expense payers" ON public.expense_payers;
CREATE POLICY "Group members can view expense payers"
ON public.expense_payers FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_payers.expense_id AND public.is_group_member(e.group_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Group members can insert expense payers" ON public.expense_payers;
CREATE POLICY "Group members can insert expense payers"
ON public.expense_payers FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_payers.expense_id 
          AND public.is_group_member(e.group_id, auth.uid())
          AND public.is_group_member(e.group_id, expense_payers.user_id) -- Payer must be member of the group
    )
);

DROP POLICY IF EXISTS "Expense creator or group admin can update expense payers" ON public.expense_payers;
CREATE POLICY "Expense creator or group admin can update expense payers"
ON public.expense_payers FOR UPDATE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_payers.expense_id AND (e.created_by = auth.uid() OR public.is_group_admin(e.group_id, auth.uid()))
    )
);

DROP POLICY IF EXISTS "Expense creator or group admin can delete expense payers" ON public.expense_payers;
CREATE POLICY "Expense creator or group admin can delete expense payers"
ON public.expense_payers FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_payers.expense_id AND (e.created_by = auth.uid() OR public.is_group_admin(e.group_id, auth.uid()))
    )
);

-- ----------------------------------------------------------------------------
-- EXPENSE SPLITS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group members can view expense splits" ON public.expense_splits;
CREATE POLICY "Group members can view expense splits"
ON public.expense_splits FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_splits.expense_id AND public.is_group_member(e.group_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Group members can insert expense splits" ON public.expense_splits;
CREATE POLICY "Group members can insert expense splits"
ON public.expense_splits FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_splits.expense_id 
          AND public.is_group_member(e.group_id, auth.uid())
          AND public.is_group_member(e.group_id, expense_splits.user_id) -- Split member must belong to the group
    )
);

DROP POLICY IF EXISTS "Expense creator or group admin can update expense splits" ON public.expense_splits;
CREATE POLICY "Expense creator or group admin can update expense splits"
ON public.expense_splits FOR UPDATE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_splits.expense_id AND (e.created_by = auth.uid() OR public.is_group_admin(e.group_id, auth.uid()))
    )
);

DROP POLICY IF EXISTS "Expense creator or group admin can delete expense splits" ON public.expense_splits;
CREATE POLICY "Expense creator or group admin can delete expense splits"
ON public.expense_splits FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_splits.expense_id AND (e.created_by = auth.uid() OR public.is_group_admin(e.group_id, auth.uid()))
    )
);

-- ----------------------------------------------------------------------------
-- SETTLEMENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Group members can view settlements" ON public.settlements;
CREATE POLICY "Group members can view settlements"
ON public.settlements FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "Settlement participants or group admin can record settlements" ON public.settlements;
CREATE POLICY "Settlement participants or group admin can record settlements"
ON public.settlements FOR INSERT
TO authenticated
WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_group_member(group_id, auth.uid()))
    AND (
        auth.uid() = payer_id OR 
        auth.uid() = payee_id OR 
        public.is_group_admin(group_id, auth.uid())
    )
    AND public.is_group_member(group_id, payer_id)
    AND public.is_group_member(group_id, payee_id)
);

DROP POLICY IF EXISTS "Settlement participants or group admin can delete settlements" ON public.settlements;
CREATE POLICY "Settlement participants or group admin can delete settlements"
ON public.settlements FOR DELETE
TO authenticated
USING (
    public.is_admin(auth.uid()) OR
    auth.uid() = payer_id OR
    auth.uid() = payee_id OR
    public.is_group_admin(group_id, auth.uid())
);

-- ============================================================================
-- AUTOMATED PROFILE CREATION & VERIFIED ADMIN BOOTSTRAP TRIGGER
-- ============================================================================

-- Function triggered on new user signup or email confirmation in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_admin_email CONSTANT TEXT := 'singhsagarpratap196@gmail.com';
    is_email_verified BOOLEAN;
BEGIN
    -- Determine whether email is confirmed
    is_email_verified := (NEW.email_confirmed_at IS NOT NULL OR NEW.confirmed_at IS NOT NULL);

    -- 1. Create or update user profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url, default_currency)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'default_currency', 'INR')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());

    -- 2. SECURE ADMIN BOOTSTRAP:
    -- Server-side check: ONLY grants admin role if the verified email matches singhsagarpratap196@gmail.com
    -- Unconfirmed accounts are strictly prevented from acquiring admin rights.
    IF LOWER(NEW.email) = LOWER(target_admin_email) AND is_email_verified THEN
        INSERT INTO public.admin_roles (user_id, role)
        VALUES (NEW.id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET 
            role = 'super_admin',
            updated_at = timezone('utc'::text, now());
    ELSIF OLD IS NOT NULL AND LOWER(OLD.email) = LOWER(target_admin_email) AND LOWER(NEW.email) != LOWER(target_admin_email) THEN
        -- Revoke admin role if email is changed away from target admin address
        DELETE FROM public.admin_roles WHERE user_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger fires on user insert or email / confirmation timestamp updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE OF email, email_confirmed_at, confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bootstrap existing verified user if singhsagarpratap196@gmail.com is already registered
DO $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN 
        SELECT id FROM auth.users 
        WHERE LOWER(email) = 'singhsagarpratap196@gmail.com'
          AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL)
    LOOP
        INSERT INTO public.admin_roles (user_id, role)
        VALUES (admin_record.id, 'super_admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
    END LOOP;
END;
$$;
