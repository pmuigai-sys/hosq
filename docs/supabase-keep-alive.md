# Supabase Keep-Alive System

To prevent the Supabase free tier project from pausing after 1 week of inactivity, a heartbeat mechanism has been implemented.

## Components

1.  **Edge Function**: `supabase/functions/keep-alive/index.ts`
    -   A simple function that performs a `SELECT` query on the `profiles` table to simulate activity.
2.  **GitHub Action**: `.github/workflows/keep-alive.yml`
    -   Scheduled to run every 6 days.
    -   Pings the Edge Function via `curl`.

## Configuration Required

To enable the GitHub Action, you must add the following **Secrets** to your GitHub repository:

| Secret Name         | Description                            | Source                                |
| :------------------ | :------------------------------------- | :------------------------------------ |
| `SUPABASE_URL`      | Your project's Supabase URL            | Supabase Dashboard -> Settings -> API |
| `SUPABASE_ANON_KEY` | Your project's `anon` `public` API key | Supabase Dashboard -> Settings -> API |

## Manual Trigger

You can manually trigger the heartbeat from the **Actions** tab in GitHub by selecting the "Supabase Keep-Alive" workflow and clicking **Run workflow**.

---
**Author**: Peter Thairu Muigai
**Version**: 1.0
**Last Updated**: 2026-03-02
