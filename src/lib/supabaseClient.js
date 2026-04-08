import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://cmtlihembicyhngawajq.supabase.co';

/** Public anon key — safe for Edge Function invoke with JWT verify (anon role). */
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdGxpaGVtYmljeWhuZ2F3YWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MzM0MjQsImV4cCI6MjA5MTAwOTQyNH0.dXOPpOkmkw_Fz6cxnS--bDnwJBvGAA34hS1FhKoyAZk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
