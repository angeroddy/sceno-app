-- ============================================
-- RLS POLICIES FOR ANNONCEURS TABLE
-- Description: Allows users to manage their own profile
-- ============================================

-- Enable RLS on annonceurs table (if not already enabled)
ALTER TABLE annonceurs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Annonceurs can insert their own profile" ON annonceurs;
DROP POLICY IF EXISTS "Annonceurs can view their own profile" ON annonceurs;
DROP POLICY IF EXISTS "Annonceurs can update their own profile" ON annonceurs;
DROP POLICY IF EXISTS "Admins have full access to annonceurs" ON annonceurs;

-- ============================================
-- POLICY 1: Allow users to INSERT their own profile
-- ============================================
-- This is critical for signup to work!
CREATE POLICY "Annonceurs can insert their own profile"
ON annonceurs FOR INSERT
TO authenticated
WITH CHECK (
    auth_user_id = auth.uid()
);

-- ============================================
-- POLICY 2: Allow users to SELECT their own profile
-- ============================================
CREATE POLICY "Annonceurs can view their own profile"
ON annonceurs FOR SELECT
TO authenticated
USING (
    auth_user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM admins WHERE admins.auth_user_id = auth.uid()
    )
);

-- ============================================
-- POLICY 3: Allow users to UPDATE their own profile
-- ============================================
CREATE POLICY "Annonceurs can update their own profile"
ON annonceurs FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- ============================================
-- POLICY 4: Allow admins full access
-- ============================================
CREATE POLICY "Admins have full access to annonceurs"
ON annonceurs FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admins WHERE admins.auth_user_id = auth.uid()
    )
);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'annonceurs';
