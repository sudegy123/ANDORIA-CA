/**
 * ANDORIA CRM — BRANCHES
 * branches.js
 *
 * Was a hardcoded 2-entry array (Kober, Madani) through the whole
 * Product Polish sprint's Administration migration — now backed by the
 * real `branches` table, "unlimited branches" per that module's spec.
 *
 * Every existing call site (all()/get()/label()/whatsappDigits()) reads
 * this SYNCHRONOUSLY — dashboard cards, request detail, sales-report
 * text all call `Branches.label(id)` inline while building an HTML
 * string, with no `await`. Rather than touch every one of those call
 * sites, refresh() populates an in-memory cache once (called from
 * initCRM() before the router starts), and every read method is a
 * synchronous read of that cache — external API unchanged, nothing
 * downstream needed to change.
 */

'use strict';

const Branches = (() => {

  let _cache = [];
  let _byId = {};
  let _bySlug = {};

  function client() {
    return SupabaseClient.get();
  }

  function mapRow(row) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      managerId: row.manager_id,
      manager: row.manager ? { id: row.manager.id, name: row.manager.name } : null,
      phone: row.phone,
      whatsapp: row.whatsapp,
      address: row.address,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Populates the in-memory cache. Call once at CRM startup, and again after any write. */
  async function refresh() {
    // profiles!branches_manager_id_fkey disambiguates: branches.manager_id -> profiles
    // and profiles.branch_id -> branches are BOTH valid embed paths between these two
    // tables, and PostgREST refuses to guess which one "manager:profiles(...)" means.
    const { data, error } = await client().from('branches').select('*, manager:profiles!branches_manager_id_fkey(id, name)').order('name');
    if (error) { console.error('[Branches] refresh failed:', error); return; }
    _cache = data.map(mapRow);
    _byId = {}; _bySlug = {};
    _cache.forEach((b) => { _byId[b.id] = b; if (b.slug) _bySlug[b.slug] = b; });
  }

  /** All branches (active + inactive), in display order. Synchronous — reads the cache. */
  function all() { return _cache; }
  function allActive() { return _cache.filter((b) => b.active); }

  /** @param {string} idOrSlug @returns {Object|null} */
  function get(idOrSlug) {
    return _byId[idOrSlug] || _bySlug[idOrSlug] || null;
  }

  /** Display name, or an em dash if the branch is unset/unknown. */
  function label(idOrSlug) {
    const b = get(idOrSlug);
    return b ? b.name : '—';
  }

  /** Digits-only WhatsApp number (no leading '+') — what wa.me links want. */
  function whatsappDigits(idOrSlug) {
    const b = get(idOrSlug);
    return b && b.whatsapp ? b.whatsapp.replace(/\D/g, '') : '';
  }

  // ── Admin CRUD (Settings > Branches) ──────────────────────────
  async function create(input) {
    const { data, error } = await client().from('branches').insert({
      name: input.name, slug: input.slug || null, manager_id: input.managerId || null,
      phone: input.phone || null, whatsapp: input.whatsapp || null, address: input.address || null,
    }).select('*, manager:profiles!branches_manager_id_fkey(id, name)').single();
    if (error) throw error;
    await refresh();
    return mapRow(data);
  }

  async function update(id, input) {
    const patch = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.managerId !== undefined) patch.manager_id = input.managerId || null;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp;
    if (input.address !== undefined) patch.address = input.address;
    const { data, error } = await client().from('branches').update(patch).eq('id', id).select('*, manager:profiles!branches_manager_id_fkey(id, name)').single();
    if (error) throw error;
    await refresh();
    return mapRow(data);
  }

  async function archive(id) {
    const { error } = await client().from('branches').update({ active: false }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  async function restore(id) {
    const { error } = await client().from('branches').update({ active: true }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  return { refresh, all, allActive, get, label, whatsappDigits, create, update, archive, restore };

})();

if (typeof window !== 'undefined') window.Branches = Branches;
if (typeof module !== 'undefined') module.exports = Branches;
