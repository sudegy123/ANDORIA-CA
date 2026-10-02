/**
 * SOLAR ERP — PACKAGES STORE (Repository layer)
 * packages-store.js
 *
 * Phase B Module 3 (Package Manager). Lives in shared assets/js/ (not
 * crm/) because the customer calculator's package-catalog.js needs
 * priced packages too — same reasoning inventory-store.js and
 * pricing-engine.js already established.
 *
 * Reads go through get_priced_packages() (supabase/migrations
 * /20260101000011) — a computed, read-only RPC, not a raw table read,
 * for the same anonymous-safety reason pricing-engine.js uses
 * get_live_pricing(): it returns a bill of materials (category/brand/
 * model/qty/capacity) and a computed price, never purchase_price or
 * stock quantity. Staff get every status (DRAFT/ACTIVE/ARCHIVED) back
 * from the same call; anonymous callers only ever see ACTIVE ones — the
 * function enforces that server-side, not this file.
 *
 * Writes go through upsert_package() for atomicity (replacing a
 * package's full component list has to be all-or-nothing — see the
 * migration's comment) except archive/restore, which are plain status
 * flips already covered by RLS (packages_write_admin), same pattern as
 * InventoryStore.archive/restore.
 */

'use strict';

const PackagesStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  function mapPriced(row) {
    return {
      id: row.id,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      status: row.status,
      installationCost: row.installationCost,
      defaultMarginPct: row.defaultMarginPct,
      price: Number(row.price),
      totalPanelWatts: Number(row.totalPanelWatts) || 0,
      totalBatteryKwh: Number(row.totalBatteryKwh) || 0,
      totalInverterWatts: Number(row.totalInverterWatts) || 0,
      components: (row.components || []).map((c) => ({
        productId: c.productId,
        category: c.category,
        brand: c.brand,
        model: c.model,
        quantity: c.quantity,
        capacityWatts: c.capacityWatts,
        capacityKwh: c.capacityKwh,
        warranty: c.warranty,
        unitPrice: Number(c.unitPrice),
      })),
    };
  }

  return {

    /**
     * All packages with computed live price + specs. Anonymous callers
     * get ACTIVE only; authenticated staff get every status (server-side
     * enforced — see get_priced_packages()).
     * @returns {Promise<Array>}
     */
    async listPriced() {
      const { data, error } = await client().rpc('get_priced_packages');
      if (error) {
        console.error('[PackagesStore] listPriced failed:', error);
        return [];
      }
      return (data || []).map(mapPriced);
    },

    /**
     * Create (p_id omitted) or fully replace (p_id given) a package and
     * its component list, atomically.
     * @param {Object} input - { id, nameEn, nameAr, descriptionEn, descriptionAr, installationCost, defaultMarginPct, status, components: [{productId, quantity}] }
     * @returns {Promise<string>} the package id
     */
    async upsert(input) {
      const { data, error } = await client().rpc('upsert_package', {
        p_id: input.id || null,
        p_name_en: input.nameEn,
        p_name_ar: input.nameAr,
        p_description_en: input.descriptionEn || null,
        p_description_ar: input.descriptionAr || null,
        p_installation_cost: input.installationCost || 0,
        p_default_margin_pct: input.defaultMarginPct || 0,
        p_status: input.status || 'DRAFT',
        p_components: input.components || [],
      });
      if (error) {
        console.error('[PackagesStore] upsert failed:', error);
        throw error;
      }
      return data;
    },

    /** @param {string} id @returns {Promise<void>} */
    async archive(id) {
      const { error } = await client().from('packages').update({ status: 'ARCHIVED' }).eq('id', id);
      if (error) { console.error('[PackagesStore] archive failed:', error); throw error; }
    },

    /** @param {string} id @returns {Promise<void>} */
    async restore(id) {
      const { error } = await client().from('packages').update({ status: 'ACTIVE' }).eq('id', id);
      if (error) { console.error('[PackagesStore] restore failed:', error); throw error; }
    },

  };

})();

if (typeof window !== 'undefined') window.PackagesStore = PackagesStore;
if (typeof module !== 'undefined') module.exports = PackagesStore;
