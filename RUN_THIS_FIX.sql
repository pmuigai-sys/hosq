-- ============================================
-- COMPLETE FIX: Run this in Supabase SQL Editor
-- ============================================
-- This fixes all user management issues:
-- 1. Populates email column
-- 2. Verifies admin users
-- 3. Confirms emails in Supabase Auth
-- NOTE: confirmed_at is a GENERATED column, only update email_confirmed_at
-- ============================================

-- Step 1: Populate email field from auth.users
UPDATE user_roles
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE user_roles.user_id = auth_users.id
  AND (user_roles.email IS NULL OR user_roles.email = '');

-- Step 2: Verify and activate all admin users in user_roles
UPDATE user_roles
SET 
  email_verified = true,
  is_active = true
WHERE role = 'admin';

-- Step 3: Confirm emails in Supabase Auth for all admins
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);

-- Step 4: Confirm email for specific user (ptmthairu@gmail.com)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'ptmthairu@gmail.com';

-- Step 5: Verify all updates (check results below)
SELECT 
  ur.email as user_email,
  ur.role,
  ur.is_active,
  ur.email_verified as verified_in_user_roles,
  au.email_confirmed_at as confirmed_in_auth,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL AND ur.email_verified = true THEN '✅ Can Access'
    WHEN au.email_confirmed_at IS NOT NULL AND ur.role = 'admin' THEN '✅ Can Access (Admin)'
    WHEN au.email_confirmed_at IS NULL THEN '❌ Cannot Login (Email not confirmed)'
    WHEN ur.email_verified = false THEN '⚠️ Can Login but Pending Verification'
    ELSE '❓ Unknown Status'
  END as status
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
ORDER BY ur.created_at DESC;
