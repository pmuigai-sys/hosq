# Developer Workflows

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd hosq
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Migration**:
   The project requires a Supabase database schema.
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard).
   - In the **SQL Editor**, create a new query.
   - Copy the SQL from `supabase/migrations/20260206132239_create_hospital_queue_system.sql` and run it.

4. **Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```text
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## Build and Deployment

### Building for Production
```bash
npm run build
```
The output will be in the `dist/` folder.

### Deployment
- **Web**: Deploy the `dist/` folder to Vercel, Netlify, or any static hosting.
- **Supabase Functions**: Deploy Edge Functions using the Supabase CLI:
  ```bash
  supabase functions deploy send-sms
  supabase functions deploy auto-emergency-triage
  ```

## Quality Assurance
- **Linting**:
  ```bash
  npm run lint
  ```
- **Type Checking**:
  ```bash
  npm run typecheck
  ```

## Project Maintenance

### Supabase Keep-Alive (Free Tier)
To prevent the Supabase project from being paused due to inactivity:
1.  **Deploy the Heartbeat Function**:
    ```bash
    supabase functions deploy keep-alive
    ```
2.  **Set GitHub Secrets**:
    -   `SUPABASE_URL`: Your project URL.
    -   `SUPABASE_ANON_KEY`: Your project's anonymous key.
3.  **Monitor Actions**: The GitHub Action is scheduled to run every 6 days. You can check the status in the **Actions** tab.

For detailed information, see [docs/supabase-keep-alive.md](./supabase-keep-alive.md).

---
*Author: Peter Thairu Muigai*
*Version: 1.1.0*
*Last Updated: 2026-03-02*
