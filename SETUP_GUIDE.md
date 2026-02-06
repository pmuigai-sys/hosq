# Hospital Queue System - Setup Guide

## Quick Start

### Step 1: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Get your Supabase credentials from your Supabase project dashboard
3. Update `.env.local` with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 2: Configure Twilio (For SMS Notifications)

The Twilio credentials are automatically configured in your Supabase Edge Function. You'll need:

1. A Twilio account (sign up at twilio.com)
2. Your Account SID
3. Your Auth Token
4. A Twilio phone number

These are pre-configured in the Supabase environment.

### Step 3: Create Your First Admin User

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" and create an account with email/password
4. Copy the user's UUID
5. Go to SQL Editor and run:

```sql
INSERT INTO user_roles (user_id, role, is_active)
VALUES ('paste-user-uuid-here', 'admin', true);
```

### Step 4: Run the Application

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Testing the System

### Test Patient Flow

1. Open the app and click "Patient Portal"
2. Fill in the check-in form:
   - Name: Test Patient
   - Phone: +1234567890 (use your real number to test SMS)
   - Age: 30
   - Reason: General checkup
3. Submit and note the queue number
4. You'll see your position in the queue

### Test Staff Features

1. Click "Staff Login"
2. Sign in with the admin account you created
3. You should see the admin dashboard
4. Navigate to "Staff Management" to create additional staff accounts
5. Create test accounts for different roles:
   - receptionist@hospital.com (Role: Receptionist)
   - doctor@hospital.com (Role: Doctor)
   - billing@hospital.com (Role: Billing)
   - pharmacist@hospital.com (Role: Pharmacist)

### Test Queue Management

1. Sign in as a receptionist
2. You'll see the patient you created in the queue
3. Click "Call" to mark them as in service
4. Click "Next" to move them to the Doctor stage
5. The patient will receive an SMS notification
6. Sign out and sign in as a doctor
7. Filter by "Doctor Consultation" stage
8. You'll see the patient in the doctor's queue
9. Continue the flow through all stages

### Test Emergency Flags

1. While a patient is in queue, click "Add Flag"
2. Select an emergency condition
3. The patient will jump to position #1
4. The row will be highlighted in red

### Test Real-Time Updates

1. Open two browser windows
2. In one, have the patient portal tracking a queue number
3. In the other, sign in as staff
4. Move the patient through stages
5. Watch the patient portal update in real-time

## Common Configuration Tasks

### Adding a New Queue Stage

1. Sign in as admin
2. Go to SQL Editor in Supabase
3. Run:
```sql
INSERT INTO queue_stages (name, display_name, order_number, is_active)
VALUES ('lab', 'Laboratory Tests', 5, true);
```

### Creating Emergency Flags

Emergency flags are pre-configured, but you can add more:

```sql
INSERT INTO emergency_flags (name, description, is_active)
VALUES ('high_fever', 'High Fever - Temperature above 103°F', true);
```

### Customizing SMS Messages

Edit the SMS messages in:
- `src/lib/sms.ts` - For stage transition notifications
- `src/components/PatientPortal.tsx` - For check-in confirmation

## Database Schema Overview

### Main Tables

- **queue_stages**: Defines the patient journey (Registration → Doctor → Billing → Pharmacy)
- **patients**: Patient information (phone, name, age, visit reason)
- **queue_entries**: Active queue entries with current stage and position
- **queue_history**: Historical record of patient movement
- **user_roles**: Staff role assignments
- **emergency_flags**: Priority conditions
- **patient_emergency_flags**: Links patients to emergency conditions
- **sms_logs**: SMS notification tracking

### Key Features

- Auto-generated queue numbers (format: Q20260206-0001)
- Automatic position calculation with emergency priority
- Row Level Security (RLS) enabled on all tables
- Real-time subscriptions for live updates
- Triggers for automatic queue reordering

## Security Notes

- Never commit `.env.local` to version control
- Keep Twilio credentials secure
- Admin role has full access - assign carefully
- Patient data is protected by RLS policies
- Staff can only manage their assigned queues

## Troubleshooting

### SMS Not Sending

1. Check Twilio credentials in Supabase Edge Function secrets
2. Verify phone numbers include country code (+1 for US)
3. Check SMS logs table for error messages
4. Ensure Twilio account has sufficient balance

### Real-Time Updates Not Working

1. Check browser console for WebSocket errors
2. Verify Supabase project has real-time enabled
3. Check network tab for subscription connections

### User Can't Sign In

1. Verify user exists in Supabase Auth
2. Check user_roles table has entry for the user
3. Ensure is_active is set to true
4. Try resetting password in Supabase dashboard

### Queue Position Not Updating

1. Check database triggers are active
2. Verify queue_entries table has correct stage_id
3. Check browser console for errors
4. Refresh the page

## Production Deployment

When deploying to production:

1. Update environment variables in your hosting platform
2. Configure Twilio production credentials
3. Set up proper domain and SSL
4. Enable Supabase production mode
5. Set up monitoring and error tracking
6. Create backups of the database
7. Test all flows thoroughly before go-live

## Support

For technical support:
- Check the README.md for feature documentation
- Review Supabase logs for backend errors
- Check browser console for frontend errors
- Review SMS logs table for notification issues
