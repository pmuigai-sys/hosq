-- ============================================
-- Fix admin user by ensuring email and email_verified fields are populated
-- This migration updates existing user_roles to add email from auth.users
-- ============================================

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

-- Step 3: Ensure all user_roles have is_active set (default to true if null)
UPDATE user_roles
SET is_active = true
WHERE is_active IS NULL;

-- Step 4: Ensure all user_roles have email_verified set (default to false if null, except admins)
UPDATE user_roles
SET email_verified = false
WHERE email_verified IS NULL
  AND role != 'admin';

-- Step 5: Confirm emails in Supabase Auth for all admin users
-- This is required for Supabase Auth to allow login
-- NOTE: confirmed_at is a GENERATED column and cannot be updated directly
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);
