/**
 * ANDORIA CRM — AUTH CLIENT
 * auth-client.js
 *
 * Thin wrapper over Supabase Auth (module 17's real permission boundary —
 * see supabase/migrations/20260101000002_profiles_and_auth.sql). Session
 * state lives in Supabase's own storage (persistSession: true), this file
 * just exposes the handful of operations the CRM shell needs.
 */

'use strict';

const CRMAuth = (() => {
  function client() {
    return SupabaseClient.get();
  }

  async function signIn(email, password) {
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await client().auth.signOut();
  }

  async function getSession() {
    const { data } = await client().auth.getSession();
    return data.session || null;
  }

  /** The signed-in staff member's profile row (name/role/active) — null if not signed in. */
  async function getProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await client().from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (error) {
      console.error('[CRMAuth] getProfile failed:', error);
      return null;
    }
    return data;
  }

  function onAuthChange(fn) {
    client().auth.onAuthStateChange((_event, session) => fn(session));
  }

  /** Redirects to the login page unless a session exists — call at the top of crm/index.html's bootstrap. */
  async function requireSession() {
    const session = await getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  return { signIn, signOut, getSession, getProfile, onAuthChange, requireSession };
})();

if (typeof window !== 'undefined') window.CRMAuth = CRMAuth;
if (typeof module !== 'undefined') module.exports = CRMAuth;
