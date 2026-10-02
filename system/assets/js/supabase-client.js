/**
 * SOLAR ERP — SUPABASE CLIENT
 * supabase-client.js
 *
 * The one place the project URL and anon (public) key live. The anon key
 * is meant to be public — it identifies the project, it does not grant
 * access on its own; every table's Row Level Security policy (see
 * supabase/migrations/20260101000007_rls_policies.sql) is what actually
 * decides what a given request/session can read or write.
 *
 * Loaded via the Supabase CDN UMD build (project stays zero-build-step —
 * see app.html/crm/index.html <script> order, this file must load AFTER
 * that CDN script and BEFORE crm-store.js/auth-client.js).
 *
 * Project: Andoria (ref ywjvmnzutsphkkljbqwe). The anon key below is the
 * public one from Project Settings → API Keys → "anon / public" — safe to
 * ship in client code, exactly as Supabase's own dashboard says.
 */

'use strict';

const SUPABASE_CONFIG = {
  url: 'https://ywjvmnzutsphkkljbqwe.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3anZtbnp1dHNwaGtrbGpicXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzY2NTgsImV4cCI6MjEwMTYxMjY1OH0.RHQhsmkxub-NpVQ4CN9ULuxj9auQ_OGzTAN1N6WebiU',
};

const SupabaseClient = (() => {
  const isConfigured = !SUPABASE_CONFIG.url.includes('YOUR-PROJECT-REF') && !SUPABASE_CONFIG.anonKey.includes('YOUR-ANON');

  let client = null;
  if (isConfigured && typeof window.supabase !== 'undefined') {
    client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } else if (!isConfigured) {
    console.warn(
      '[SupabaseClient] Not configured — edit assets/js/supabase-client.js with your project URL and anon key.'
    );
  }

  return {
    isConfigured,
    /** @returns {import('@supabase/supabase-js').SupabaseClient} */
    get() {
      if (!client) throw new Error('Supabase is not configured — see assets/js/supabase-client.js.');
      return client;
    },
  };
})();

if (typeof window !== 'undefined') window.SupabaseClient = SupabaseClient;
if (typeof module !== 'undefined') module.exports = SupabaseClient;
