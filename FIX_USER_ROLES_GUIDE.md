# Fix User Roles - Step by Step Guide

## Problem
- Email column is blank in the Admin Dashboard
- Admin user showing "Pending" instead of "Verified"
- Verify Email button not working due to RLS policies

## Solution

### Step 1: Run SQL Script in Supabase

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (left sidebar)

2. **Run the following SQL script:**

```sql
-- ============================================
-- FIX USER_ROLES: Populate Email and Verify Admin
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

-- Step 3: Verify the updates (check results)
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
```

3. **Click "Run"** to execute the script

4. **Verify the results** in the output panel - you should see:
   - All users now have their email populated
   - Admin users have `email_verified = true` and `is_active = true`

### Step 2: Refresh the Admin Dashboard

1. Go back to your browser at `http://localhost:5173`
2. Refresh the page (F5 or Ctrl+R)
3. You should now see:
   - ✅ Email addresses in the Email column
   - ✅ Admin showing "Active" and "Verified" badges
   - ✅ Other users showing "Active" and "Pending" badges

### Step 3: Test the Verify Email Button

1. Try clicking "Verify Email" on a non-admin user
2. If you get an error alert, check the browser console (F12)
3. The error message will tell us what's wrong

## Why This Happened

The `email` column was added to the `user_roles` table in the migration, but:
1. Existing users didn't have their email populated
2. The admin user wasn't marked as verified
3. RLS policies prevent updates unless you're already a verified admin (chicken-and-egg problem)

Running the SQL script directly bypasses RLS and fixes all these issues.

## Next Steps

After running the SQL script:
- The Admin Dashboard should display correctly
- You can create new users with the "Mark as Verified" checkbox
- You can verify existing users with the "Verify Email" button
- All user emails will be visible in the table

If you still encounter issues after running the SQL script, please share:
1. The output from the SQL script
2. Any error messages from the browser console
3. A screenshot of the updated Admin Dashboard
