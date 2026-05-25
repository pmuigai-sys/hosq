# Fix "Email Not Confirmed" Error - Complete Guide

## Problem
When trying to login with `ptmthairu@gmail.com`, you get an error: **"Email not confirmed"**

## Root Cause
Supabase has **TWO separate email verification systems**:

1. **`auth.users.email_confirmed_at`** - Supabase Auth's built-in email confirmation (REQUIRED for login)
2. **`user_roles.email_verified`** - Our custom manual verification system (for admin approval)

We fixed #2 but not #1. Supabase Auth won't allow login until `email_confirmed_at` is set in the `auth.users` table.

## Solution

### Run This SQL Script in Supabase SQL Editor

```sql
-- ============================================
-- FIX AUTH EMAIL CONFIRMATION
-- ============================================

-- Confirm email for the specific user (ptmthairu@gmail.com)
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'ptmthairu@gmail.com';

-- Confirm email for all admin users
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
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
```

### Steps:
1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy and paste** the script above
3. **Click "Run"**
4. **Check the output** - you should see both emails with `email_confirmed_at` and `confirmed_at` timestamps
5. **Go back to your app** at `http://localhost:5173`
6. **Try logging in** with `ptmthairu@gmail.com` / `admin@123`

## Expected Result
✅ Login should now work successfully!
✅ You'll be redirected to the Admin Dashboard
✅ You can manage users, stages, and flags

## Why This Happened
When you created users via `supabase.auth.signUp()`, Supabase normally sends a confirmation email. But since:
- Email sending might not be configured in your Supabase project
- Or the emails went to spam
- Or you're in development mode

The users were created but never confirmed. This SQL script manually confirms them, bypassing the email confirmation requirement.

## For Future User Creation
When creating new users in the Admin Dashboard, they will face the same issue. You have two options:

### Option 1: Auto-confirm all new users (Development Only)
Add this to your Supabase project settings:
- Go to **Authentication** → **Settings**
- Enable **"Disable email confirmations"** (development only!)

### Option 2: Manually confirm each new user via SQL
After creating a user, run:
```sql
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'new_user@example.com';
```

### Option 3: Configure Email Provider (Production)
Set up SMTP or use Supabase's email service to send real confirmation emails.

## Summary
- ✅ `user_roles.email_verified` = Our custom admin approval system
- ✅ `auth.users.email_confirmed_at` = Supabase Auth's email confirmation (required for login)
- ✅ Both need to be set for users to access the system

Run the SQL script above and you should be good to go! 🚀
