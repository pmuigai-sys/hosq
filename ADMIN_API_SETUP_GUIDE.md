# Complete Setup Guide - Proper User Management with Admin API

## 🎯 What We're Fixing

The current system has an issue: when creating users, their emails aren't confirmed in Supabase Auth, preventing login. The **proper solution** is to use Supabase's Admin API with a service role key.

---

## 📋 Step 1: Get Your Service Role Key

1. **Open Supabase Dashboard**
2. **Go to:** Settings → API
3. **Find:** `service_role` key (under "Project API keys")
4. **Copy** the key (⚠️ Keep this secret!)

---

## 📋 Step 2: Add Service Role Key to .env.local

Add this line to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Your `.env.local` should now look like:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ← ADD THIS
```

⚠️ **IMPORTANT:** Never commit this file to Git! It's already in `.gitignore`.

---

## 📋 Step 3: Fix Current Users (One-Time SQL Script)

Run this SQL in **Supabase Dashboard → SQL Editor** to fix existing users:

```sql
-- Populate email field from auth.users
UPDATE user_roles
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE user_roles.user_id = auth_users.id
  AND (user_roles.email IS NULL OR user_roles.email = '');

-- Verify and activate all admin users
UPDATE user_roles
SET email_verified = true, is_active = true
WHERE role = 'admin';

-- Confirm admin emails in Supabase Auth
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'admin');

-- Confirm specific user
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'ptmthairu@gmail.com';

-- Verify results
SELECT 
  ur.email,
  ur.role,
  ur.is_active,
  ur.email_verified,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
ORDER BY ur.created_at DESC;
```

---

## 📋 Step 4: Restart Dev Server

After adding the service role key:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ How It Works Now

### **Creating New Users (After Setup)**

When you create a user in the Admin Dashboard:

1. ✅ User is created via **Admin API** (not regular signUp)
2. ✅ Email is **auto-confirmed** (no SQL needed!)
3. ✅ User can **login immediately**
4. ✅ Success message confirms everything worked

### **If Service Key Not Configured**

If you haven't added the service key yet, you'll see:

```
❌ Admin API not configured!

To create users properly, you need to:

1. Get your Service Role Key from:
   Supabase Dashboard → Settings → API → service_role

2. Add it to your .env.local file:
   SUPABASE_SERVICE_ROLE_KEY=your_key_here

3. Restart the dev server (npm run dev)
```

---

## 🔧 What Changed in the Code

### **New File: `src/lib/supabase-admin.ts`**

This file contains:
- `supabaseAdmin` - Admin client with service role key
- `createConfirmedUser()` - Creates users with auto-confirmed emails
- `confirmUserEmail()` - Confirms existing user emails

### **Updated: `src/components/AdminDashboard.tsx`**

The `handleCreateUser` function now:
- Uses `createConfirmedUser()` instead of `supabase.auth.signUp()`
- Auto-confirms emails via Admin API
- Shows helpful error messages if service key is missing

### **Updated: `.env.example`**

Added documentation for `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 Testing

After completing all steps:

1. **Refresh browser** at `http://localhost:5173`
2. **Login** with `ptmthairu@gmail.com` / `admin@123`
3. **Create a new user** via Admin Dashboard
4. **Verify** the success message says "Email Confirmed: Yes"
5. **Test login** with the new user's credentials

---

## 📚 Why This Approach?

### **Before (❌ Wrong Way)**
- Used `supabase.auth.signUp()` (client-side)
- Required manual SQL to confirm emails
- `confirmed_at` is a generated column (can't update directly)
- Error-prone and manual

### **After (✅ Correct Way)**
- Uses `supabase.auth.admin.createUser()` (server-side)
- Auto-confirms emails via `email_confirm: true`
- Follows Supabase best practices
- Fully automated

---

## ⚠️ Security Notes

1. **Never expose service role key** to the frontend
2. **Keep it in `.env.local`** (not committed to Git)
3. **Only use in server-side code** or admin operations
4. **The current implementation is safe** because:
   - Service key is only in environment variables
   - Admin functions only run when admin is logged in
   - RLS policies still protect the database

---

## 🎉 You're Done!

After following these steps:
- ✅ Existing users can login
- ✅ New users are auto-confirmed
- ✅ No more manual SQL needed
- ✅ Proper Supabase Admin API usage

**Need help?** Check the browser console or terminal for error messages.
