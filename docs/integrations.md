# Integrations

## Supabase
The primary backend service powering Hosq.

### Authentication
- Using Supabase Auth with Email/Password.
- Roles are managed via a custom `user_roles` table.

### Database
- PostgreSQL database hosted on Supabase.
- Row Level Security (RLS) is enabled to protect patient data.

### Real-time
- Using Supabase Realtime (Cdc) to push updates to the `QueueTracker` component.

## SMS Service
The system notifies patients via SMS when their queue status changes.

- **Mechanism**: Outbound HTTP calls via Supabase Edge Functions.
- **Mechanism**: Outbound HTTP calls via Supabase Edge Functions.
- **Provider**: BulkSMS.com (Primary - Low Friction).
- **Environment Variables**:
  - `BULKSMS_TOKEN_ID`: Your API Token ID from the BulkSMS dashboard.
  - `BULKSMS_TOKEN_SECRET`: Your API Token Secret (keep this secure).
- **Function**: `v1/send-sms`

## Emergency Auto-Triage
Rule-based emergency detection runs during patient self-check-in and auto-applies emergency flags.

- **Mechanism**: Supabase Edge Function evaluates visit reason text + age.
- **Function**: `v1/auto-emergency-triage`
- **Behavior**:
  - Matches emergency keywords with tolerance for common spelling/syntax errors.
  - Inserts matching rows into `patient_emergency_flags`.
  - Sets `queue_entries.has_emergency_flag = true` for priority queueing.
  - Adds an audit note in `queue_entries.notes` with matched rules.

## Check-In Abuse Protection
- Kenyan number enforcement is applied at database level (`patients.phone_number` is normalized to `+254...` format).
- Rate limiting is enforced at database level: one check-in per phone number every 6 hours within the same Nairobi day.
- These protections apply even if a client bypasses frontend validation.

## Icons (Lucide-React)
- **Library**: `lucide-react`
- **Known Issue**: Some icons (like `Fingerprint`) may be blocked by client-side ad-blockers due to privacy heuristic checks. See [Error Handling](./error-handling-and-logging.md) for details.

---
*Author: Peter Thairu Muigai*
*Version: 1.0.0*
