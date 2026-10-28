# ReWrite
Smart note formatting web app that transforms raw, unstructured input into structured, editable notes using React, TypeScript, Zustand, and modern frontend architecture.

## Data analytics project (SQL, Excel, Tableau)

This project includes an analytics path for the notes created in ReWrite:

1. **SQL:** `supabase/migrations/20261028000000_notes_analytics.sql` defines PostgreSQL tables for notes and note blocks, plus a Tableau-friendly view named `tableau_notes_analytics`.
2. **Excel:** use **Excel export** at the bottom of the sidebar to download a CSV analytics table. Excel opens the CSV directly. It contains one row per note with mode, timestamps, tags, block/task counts, and word counts.
3. **Tableau:** connect Tableau to the same PostgreSQL database and use `tableau_notes_analytics` as the data source. The view is shaped for note-level analysis.

The app also has an in-app dashboard at `/analytics` (click **Analytics** in the top bar). For a Tableau demo before you have real SQL data, connect Tableau to `tableau/sample_notes_analytics.csv`. This file contains clearly labeled demonstration records, not your actual notes. In Tableau Public, choose **Text file** on the start page and select that CSV, then create worksheets and a dashboard from its columns.

### Setup

- Apply both SQL migrations to the Supabase PostgreSQL project, in order (for example, in the Supabase SQL Editor). The first creates the analytics schema; the second adds per-user access rules for browser sync.
- In Supabase Authentication settings, enable **Anonymous Sign-ins** for this single-device/demo workflow.
- Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project’s Connect dialog. Never place a secret/service-role key in this browser app.
- In Tableau, connect to PostgreSQL using the database host, database name, and read-only credentials from the Supabase project. Select `public.tableau_notes_analytics`.

The browser keeps a local copy for offline use and syncs notes to Supabase when configured. The same anonymous browser session owns its notes; Tableau should use a separate read-only database login. Excel export is a snapshot CSV, while the in-app dashboard reflects the browser copy.
