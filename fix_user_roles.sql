-- ============================================
-- FIX USER_ROLES: Populate Email and Verify Admin
-- ============================================
-- Run this script in Supabase SQL Editor
-- This bypasses RLS policies

-- Step 1: Populate email field from auth.users for all user_roles
UPDATE user_roles
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE user_roles.user_id = auth_users.id
  AND (user_roles.email IS NULL OR user_roles.email = '');

-- Step 2: Verify and activate all admin users
UPDATE user_roles
SET 
  email_verified = true,
  is_active = true
WHERE role = 'admin';

-- Step 3: Verify the updates
SELECT 
  id,
  user_id,
  email,
  role,
  department,
  is_active,
  email_verified,
  created_at
FROM user_roles
ORDER BY created_at DESC;
