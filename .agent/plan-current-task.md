# Task Plan: SMS Alternatives and Supabase Keep-Alive

## Objective
Address user's difficulty with SMS provider registration (blacklisting) and implement a keep-alive mechanism for the Supabase free tier.

## Current Repository State
- **Documentation**: `docs/sms-alternatives.md` exists but needs better focus on "easy registration" and "shared shortcodes".
- **Supabase**: Edge functions are present (`send-sms`).
- **Automation**: No current GitHub Actions for keep-alive.

## Step-by-Step Plan
1. **SMS Provider Research & Selection**:
   - Identify providers offering shared shortcodes or virtual numbers that don't require business incorporation.
   - Specifically look for ClickSend, BulkSMS.com, and local Kenyan providers with shared IDs.
2. **Supabase Keep-Alive Implementation**:
   - [NEW] Create `supabase/functions/keep-alive/index.ts`.
   - [NEW] Create `.github/workflows/keep-alive.yml`.
3. **Documentation Enhancement**:
   - Update `docs/sms-alternatives.md` with registration-free options (or low-friction options).
   - [NEW] Create `docs/supabase-keep-alive.md`.
   - Update `docs/workflows.md` to include maintenance tasks.
   - Update root `README.md` docs table.

## Success Criteria
- [ ] List of SMS providers that work without rigid business registration documented.
- [ ] Deployed/Code-ready Supabase keep-alive Edge Function.
- [ ] Functional GitHub Action workflow for periodic pings.
- [ ] Comprehensive documentation following Peter's professional standards.

## Assumptions & Risks
- **Assumption**: A simple `SELECT 1` or query on an existing table is sufficient for activity.
- **Risk**: SMS providers might still require some form of ID verification (KYC) even for pay-as-you-go.

## Cost Analysis
- **SMS**: Pay-as-you-go costs vary (approx $0.01 - $0.05 per SMS). No monthly subscriptions.
- **Supabase**: $0 (Free Tier).
- **GitHub Actions**: $0 (Free Tier).
