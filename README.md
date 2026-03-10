# Hospital Queue Management System

A comprehensive real-time hospital queuing system with patient self-service, SMS notifications, role-based employee access, and admin management.

## Features

### Patient Portal (No Signup Required)
- Self-service check-in with basic information
- Real-time queue position tracking
- SMS notifications for queue updates
- Live status updates as they move through stages

### Staff Dashboard
- Role-based access (Receptionist, Doctor, Billing, Pharmacist)
- Call next patient in queue
- Move patients between stages
- Add emergency flags to prioritize patients
- Real-time queue updates

### Admin Panel
- Full system management
- Create and manage staff accounts
- Configure queue stages
- Manage emergency flags
- Monitor all queues

### Emergency Flag System
- Patients with emergency flags automatically skip to front of queue
- Pre-configured flags: Cardiac Emergency, Severe Bleeding, Breathing Difficulty, etc.
- Staff can add flags during check-in or service

## Documentation

| Topic                           | Description                             | Link                                                                                     | Last Updated |
| ------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ |
| Architecture                    | System design and component overview    | [docs/architecture.md](./docs/architecture.md)                                           | 2026-03-02   |
| Developer Workflows             | Setup, build, test, and deployment      | [docs/workflows.md](./docs/workflows.md)                                                 | 2026-03-02   |
| Code Conventions                | Naming, style, and structure guidelines | [docs/conventions.md](./docs/conventions.md)                                             | 2026-03-02   |
| Integrations                    | APIs, databases, and environment config | [docs/integrations.md](./docs/integrations.md)                                           | 2026-03-02   |
| Releases                        | Changelog and release process           | [docs/releases.md](./docs/releases.md)                                                   | 2026-03-02   |
| Testing & Quality Assurance     | Tests, coverage, tools                  | [docs/testing-and-quality-assurance.md](./docs/testing-and-quality-assurance.md)         | 2026-03-02   |
| Deployment & CI/CD              | Pipelines and infrastructure setup      | [docs/deployment-and-cicd.md](./docs/deployment-and-cicd.md)                             | 2026-03-02   |
| Collaboration & Version Control | Branching, PRs, best practices          | [docs/collaboration-and-version-control.md](./docs/collaboration-and-version-control.md) | 2026-03-02   |
| Error Handling & Logging        | Patterns, monitoring, and known issues  | [docs/error-handling-and-logging.md](./docs/error-handling-and-logging.md)               | 2026-03-02   |
| SMS Alternatives                | Low-friction providers for Kenya/Africa | [docs/sms-alternatives.md](./docs/sms-alternatives.md)                                   | 2026-03-02   |
| Supabase Keep-Alive             | Preventing free tier project pause      | [docs/supabase-keep-alive.md](./docs/supabase-keep-alive.md)                             | 2026-03-02   |

## GitHub Pages Deployment

The app is automatically built and deployed to GitHub Pages on every push to `main`.
The live URL is: **https://pmuigai-sys.github.io/hosq/**

### Required Repository Secrets

Before the deployment workflow can succeed, you must add the following secrets to the GitHub repository:

1. Go to **Settings → Secrets and variables → Actions** in the GitHub repository.
2. Click **New repository secret** and add each of the following:

| Secret name            | Where to find it                                                     |
| ---------------------- | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`    | Supabase Dashboard → Project Settings → API → Project URL            |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` public key   |

> **Note:** Do **not** add `VITE_SUPABASE_SERVICE_ROLE_KEY` as a secret here — the service role key must never be exposed in a client-side application.

### Enable GitHub Pages

1. Go to **Settings → Pages** in the GitHub repository.
2. Under **Source**, select **GitHub Actions**.
3. Save. The next push to `main` (or a manual run of the *Deploy to GitHub Pages* workflow) will publish the site.

---

## Local Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. BulkSMS.com Configuration

The SMS functionality requires BulkSMS.com API tokens configured in Supabase Edge Function secrets:

- BULKSMS_TOKEN_ID
- BULKSMS_TOKEN_SECRET

Set them with Supabase CLI:

```bash
supabase secrets set BULKSMS_TOKEN_ID=your_token_id BULKSMS_TOKEN_SECRET=your_token_secret
supabase functions deploy send-sms
```

### 3. Database Setup

The database schema is already created with the following tables:
- `queue_stages` - Defines the patient journey stages
- `emergency_flags` - Emergency conditions for priority handling
- `patients` - Patient records
- `queue_entries` - Active queue entries with positions
- `queue_history` - Historical tracking of patient movement
- `patient_emergency_flags` - Links patients to emergency flags
- `user_roles` - Staff role assignments
- `sms_logs` - SMS notification history

Default stages are pre-configured:
1. Registration
2. Doctor Consultation
3. Billing
4. Pharmacy

### 4. Create Admin Account

To create your first admin user, use the Supabase SQL editor:

```sql
-- First, create the user through Supabase Auth Dashboard or API
-- Then insert the role:
INSERT INTO user_roles (user_id, role, is_active)
VALUES ('user-uuid-from-auth-users', 'admin', true);
```

### 5. Install Dependencies

```bash
npm install
```

## Usage

### For Patients

1. Navigate to the Patient Portal
2. Fill in the check-in form with:
   - Full name
   - Phone number (with country code, e.g., +1234567890)
   - Age (optional)
   - Reason for visit
3. Submit to join the queue
4. Receive SMS confirmation with queue number
5. Track position in real-time on the page
6. Receive SMS when it's your turn at each stage

### For Hospital Staff

1. Click "Staff Login" in the navigation
2. Sign in with your hospital email and password
3. View the queue for your department
4. Actions available:
   - **Call**: Mark patient as in service
   - **Next**: Complete current stage and move to next
   - **Done**: Mark as completed (final stage)
   - **Add Flag**: Add emergency flag to prioritize

### For Administrators

1. Sign in with admin credentials
2. Access three management tabs:
   - **Staff Management**: Create accounts, manage roles
   - **Queue Stages**: Configure patient journey stages
   - **Emergency Flags**: Manage priority conditions

## Queue Flow

1. **Patient checks in** → Enters Registration queue
2. **Receptionist calls** → Patient moves to in-service
3. **Receptionist completes** → Patient moves to Doctor queue
4. **Doctor calls & completes** → Patient moves to Billing queue
5. **Billing completes** → Patient moves to Pharmacy queue
6. **Pharmacy completes** → Patient journey complete

## Emergency Flag Priority

Patients with emergency flags:
- Automatically move to position #1 in current queue
- Bypass normal queue order
- Staff receive visual indicators (red highlighting)
- Can be added at any stage by any staff member

## Real-Time Updates

The system uses Supabase real-time subscriptions for:
- Queue position changes
- Stage transitions
- New patient arrivals
- Emergency flag additions

All connected clients see updates instantly without page refresh.

## SMS Notifications

Patients receive SMS at:
- Initial check-in (confirmation)
- Each stage transition (ready notification)

Messages include:
- Patient name
- Queue number
- Current stage
- Instructions

## Role Permissions

| Role             | Capabilities                                       |
| ---------------- | -------------------------------------------------- |
| **Admin**        | Full system access, create users, configure stages |
| **Receptionist** | Manage registration queue, add patients            |
| **Doctor**       | Manage doctor consultation queue                   |
| **Billing**      | Manage billing queue                               |
| **Pharmacist**   | Manage pharmacy queue                              |

## Technologies Used

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time + Auth + Edge Functions)
- **SMS**: BulkSMS.com (Primary) / Africa's Talking (Legacy)
- **Icons**: Lucide React

## Support

For issues or questions, contact your system administrator.
