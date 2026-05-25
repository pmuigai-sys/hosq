-- ============================================
-- FIX AUTH EMAIL CONFIRMATION
-- ============================================
-- This script confirms emails in Supabase Auth (auth.users table)
-- Run this in Supabase SQL Editor
-- NOTE: confirmed_at is a GENERATED column and cannot be updated directly

-- Confirm email for the specific user (ptmthairu@gmail.com)
UPDATE auth.users
SET 
  email_confirmed_at = NOW()
WHERE email = 'ptmthairu@gmail.com';

-- Confirm email for all admin users in user_roles
UPDATE auth.users
SET 
  email_confirmed_at = NOW()
WHERE id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);

-- Verify the updates
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('ptmthairu@gmail.com', 'pmuigai@kabarak.ac.ke')
ORDER BY created_at DESC;
