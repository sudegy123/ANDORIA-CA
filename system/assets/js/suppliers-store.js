/**
 * ANDORIA CRM — SUPPLIERS STORE (Repository layer, minimal)
 * suppliers-store.js
 *
 * Just enough for Module 1's product form (pick or quick-add a
 * supplier). Module 8 (Purchase Management) extends this same object
 * with full CRUD/purchase-orders/balance tracking later — this file is
 * the one place that grows, never a second competing store.
 */

'use strict';

const SuppliersStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  function mapSupplier(row) {
    return {
      id: row.id,
      company: row.company,
      contactPerson: row.contact_person,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      address: row.address,
      outstandingBalance: row.outstanding_balance,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {

    /** @returns {Promise<Array>} */
    async list() {
      const { data, error } = await client().from('suppliers').select('*').order('company');
      if (error) {
        console.error('[SuppliersStore] list failed:', error);
        return [];
      }
      return data.map(mapSupplier);
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async get(id) {
      const { data, error } = await client().from('suppliers').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.error('[SuppliersStore] get failed:', error);
        return null;
      }
      return data ? mapSupplier(data) : null;
    },

    /**
     * @param {Object} input - { company, contactPerson, phone, whatsapp, email, address }
     * @returns {Promise<Object>}
     */
    async create(input) {
      const { data, error } = await client().from('suppliers').insert({
        company: input.company,
        contact_person: input.contactPerson || null,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        email: input.email || null,
        address: input.address || null,
      }).select().single();
      if (error) {
        console.error('[SuppliersStore] create failed:', error);
        throw error;
      }
      return mapSupplier(data);
    },

  };

})();

if (typeof window !== 'undefined') window.SuppliersStore = SuppliersStore;
if (typeof module !== 'undefined') module.exports = SuppliersStore;
