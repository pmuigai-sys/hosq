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

---
*Author: Peter Thairu Muigai*
*Version: 1.0.0*
