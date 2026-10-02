/**
 * ANDORIA CRM — USERS STORE (Repository layer)
 * users-store.js
 *
 * Staff account management, on top of `profiles` (RLS: any authenticated
 * user reads all profiles — a Users directory needs the full roster;
 * OWNER/ADMIN write). Two actions are NOT possible from this file on
 * purpose: creating a brand-new login and permanently deleting one both
 * need the Supabase Admin API, which needs the service-role key — a key
 * that must never reach the browser. supabase/config.toml already
 * documents this (enable_signup = false, staff created via Admin API).
 * Until an Edge Function is deployed to broker those two actions
 * server-side, they're a deliberate manual step via the Supabase
 * Dashboard, surfaced honestly in the UI rather than a button that
 * silently fails.
 */

'use strict';

const UsersStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  function mapRow(row) {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      active: row.active,
      archived: row.archived,
      branchId: row.branch_id,
      branch: row.branch ? { id: row.branch.id, name: row.branch.name } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {

    /** @returns {Promise<Array>} */
    async list() {
      const { data, error } = await client().from('profiles').select('*, branch:branches!profiles_branch_id_fkey(id, name)').order('name');
      if (error) { console.error('[UsersStore] list failed:', error); return []; }
      return data.map(mapRow);
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async get(id) {
      const { data, error } = await client().from('profiles').select('*, branch:branches!profiles_branch_id_fkey(id, name)').eq('id', id).maybeSingle();
      if (error) { console.error('[UsersStore] get failed:', error); return null; }
      return data ? mapRow(data) : null;
    },

    /**
     * @param {string} id
     * @param {Object} patch - any of name/role/branchId/active/archived
     * @returns {Promise<Object|null>}
     */
    async update(id, patch) {
      const data = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.role !== undefined) data.role = patch.role;
      if (patch.branchId !== undefined) data.branch_id = patch.branchId || null;
      if (patch.active !== undefined) data.active = patch.active;
      if (patch.archived !== undefined) data.archived = patch.archived;

      const { data: row, error } = await client().from('profiles').update(data).eq('id', id).select('*, branch:branches!profiles_branch_id_fkey(id, name)').maybeSingle();
      if (error) { console.error('[UsersStore] update failed:', error); throw error; }
      return row ? mapRow(row) : null;
    },

    /** @param {string} id @returns {Promise<void>} */
    async deactivate(id) {
      const { error } = await client().from('profiles').update({ active: false }).eq('id', id);
      if (error) throw error;
    },

    /** @param {string} id @returns {Promise<void>} */
    async reactivate(id) {
      const { error } = await client().from('profiles').update({ active: true }).eq('id', id);
      if (error) throw error;
    },

    /** Hides from the directory. Also deactivates — an archived account keeps no login access. @param {string} id */
    async archive(id) {
      const { error } = await client().from('profiles').update({ active: false, archived: true }).eq('id', id);
      if (error) throw error;
    },

    /** @param {string} id @returns {Promise<void>} */
    async restore(id) {
      const { error } = await client().from('profiles').update({ archived: false }).eq('id', id);
      if (error) throw error;
    },

    /**
     * Sends a password-reset email via Supabase Auth — works with the
     * anon key, no service role needed, unlike create/delete above.
     * @param {string} email
     */
    async sendPasswordReset(email) {
      const { error } = await client().auth.resetPasswordForEmail(email);
      if (error) throw error;
    },

  };

})();

if (typeof window !== 'undefined') window.UsersStore = UsersStore;
if (typeof module !== 'undefined') module.exports = UsersStore;
