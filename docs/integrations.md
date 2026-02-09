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
- **Provider**: Twilio or similar (configured within the Edge Function).
- **Function**: `v1/send-sms`

## Icons (Lucide-React)
- **Library**: `lucide-react`
- **Known Issue**: Some icons (like `Fingerprint`) may be blocked by client-side ad-blockers due to privacy heuristic checks. See [Error Handling](./error-handling-and-logging.md) for details.

---
*Author: Peter Thairu Muigai*
*Version: 1.0.0*
