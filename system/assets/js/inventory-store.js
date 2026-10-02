/**
 * SOLAR ERP — INVENTORY STORE (Repository layer)
 * inventory-store.js
 *
 * Lives in the shared assets/js/ (not crm/) because Module 2 (Live
 * Pricing Engine) needs the customer-facing calculator to read product
 * prices from here too — same reasoning CRMStore already established.
 *
 * Reads go straight through Supabase (RLS: any active staff can SELECT).
 * Writes that touch stock quantity go through SECURITY DEFINER RPCs
 * (create_product/adjust_stock — see supabase/migrations/20260101000009)
 * for the same reason CRM writes do: atomicity + a server-enforced role
 * check, not just RLS + client discipline. Plain field edits (price,
 * brand, status, etc — nothing ledger-affecting) go through a direct
 * `.update()`, which RLS already gates to WAREHOUSE/ADMIN/OWNER.
 */

'use strict';

const InventoryStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  const SELECT_WITH_SUPPLIER = '*, supplier:suppliers(id, company)';

  function mapProduct(row) {
    const available = row.quantity - row.reserved_qty;
    return {
      id: row.id,
      sku: row.sku,
      category: row.category,
      brand: row.brand,
      model: row.model,
      specification: row.specification,
      unit: row.unit,
      purchasePrice: row.purchase_price,
      sellingPrice: row.selling_price,
      quantity: row.quantity,
      reservedQty: row.reserved_qty,
      minStock: row.min_stock,
      warranty: row.warranty,
      notes: row.notes,
      status: row.status,
      supplierId: row.supplier_id,
      supplier: row.supplier ? { id: row.supplier.id, company: row.supplier.company } : null,
      capacityWatts: row.capacity_watts,
      capacityKwh: row.capacity_kwh,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      available,
      lowStock: available <= row.min_stock,
    };
  }

  function mapMovement(row) {
    return {
      id: row.id,
      productId: row.product_id,
      type: row.type,
      quantity: row.quantity,
      reason: row.reason,
      projectId: row.project_id,
      user: row.user ? { id: row.user.id, name: row.user.name } : null,
      createdAt: row.created_at,
    };
  }

  return {

    /**
     * @param {Object} filters - { category, status, search, lowStockOnly }
     * @returns {Promise<Array>}
     */
    async list(filters = {}) {
      let q = client().from('products').select(SELECT_WITH_SUPPLIER).order('updated_at', { ascending: false });
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.search) {
        const term = filters.search.replace(/[%,]/g, '');
        q = q.or(`sku.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
      }
      const { data, error } = await q;
      if (error) {
        console.error('[InventoryStore] list failed:', error);
        return [];
      }
      let mapped = data.map(mapProduct);
      if (filters.lowStockOnly) mapped = mapped.filter((p) => p.lowStock);
      return mapped;
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async get(id) {
      const { data, error } = await client().from('products').select(SELECT_WITH_SUPPLIER).eq('id', id).maybeSingle();
      if (error) {
        console.error('[InventoryStore] get failed:', error);
        return null;
      }
      return data ? mapProduct(data) : null;
    },

    /**
     * Create a product, optionally with initial stock (logged as a
     * MANUAL_IN movement, atomically, via the create_product() RPC).
     * @param {Object} input - { sku, category, brand, model, specification, unit, purchasePrice, sellingPrice, initialQuantity, minStock, warranty, notes, supplierId }
     * @returns {Promise<Object>} the created product
     */
    async create(input) {
      const { data, error } = await client().rpc('create_product', {
        p_sku: input.sku,
        p_category: input.category,
        p_brand: input.brand,
        p_model: input.model,
        p_specification: input.specification || null,
        p_unit: input.unit || 'pcs',
        p_purchase_price: input.purchasePrice,
        p_selling_price: input.sellingPrice,
        p_initial_quantity: input.initialQuantity || 0,
        p_min_stock: input.minStock || 0,
        p_warranty: input.warranty || null,
        p_notes: input.notes || null,
        p_supplier_id: input.supplierId || null,
        p_capacity_watts: input.capacityWatts || null,
        p_capacity_kwh: input.capacityKwh || null,
      });
      if (error) {
        console.error('[InventoryStore] create failed:', error);
        throw error;
      }
      return mapProduct(data);
    },

    /**
     * Plain field edit — never touches quantity (that's adjustStock's job).
     * @param {string} id
     * @param {Object} input - any of sku/category/brand/model/specification/unit/purchasePrice/sellingPrice/minStock/warranty/notes/supplierId
     * @returns {Promise<Object|null>}
     */
    async update(id, input) {
      const data = {};
      if (input.sku !== undefined) data.sku = input.sku;
      if (input.category !== undefined) data.category = input.category;
      if (input.brand !== undefined) data.brand = input.brand;
      if (input.model !== undefined) data.model = input.model;
      if (input.specification !== undefined) data.specification = input.specification;
      if (input.unit !== undefined) data.unit = input.unit;
      if (input.purchasePrice !== undefined) data.purchase_price = input.purchasePrice;
      if (input.sellingPrice !== undefined) data.selling_price = input.sellingPrice;
      if (input.minStock !== undefined) data.min_stock = input.minStock;
      if (input.warranty !== undefined) data.warranty = input.warranty;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.supplierId !== undefined) data.supplier_id = input.supplierId;
      if (input.capacityWatts !== undefined) data.capacity_watts = input.capacityWatts || null;
      if (input.capacityKwh !== undefined) data.capacity_kwh = input.capacityKwh || null;

      const { data: row, error } = await client().from('products').update(data).eq('id', id).select(SELECT_WITH_SUPPLIER).maybeSingle();
      if (error) {
        console.error('[InventoryStore] update failed:', error);
        throw error;
      }
      return row ? mapProduct(row) : null;
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async archive(id) {
      const { data, error } = await client().from('products').update({ status: 'ARCHIVED' }).eq('id', id).select(SELECT_WITH_SUPPLIER).maybeSingle();
      if (error) { console.error('[InventoryStore] archive failed:', error); throw error; }
      return data ? mapProduct(data) : null;
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async restore(id) {
      const { data, error } = await client().from('products').update({ status: 'ACTIVE' }).eq('id', id).select(SELECT_WITH_SUPPLIER).maybeSingle();
      if (error) { console.error('[InventoryStore] restore failed:', error); throw error; }
      return data ? mapProduct(data) : null;
    },

    /**
     * Atomic stock adjustment via the adjust_stock() RPC.
     * @param {string} productId
     * @param {'MANUAL_IN'|'MANUAL_OUT'} type
     * @param {number} delta - positive quantity
     * @param {string} reason
     * @returns {Promise<Object>} the updated product
     */
    async adjustStock(productId, type, delta, reason) {
      const { data, error } = await client().rpc('adjust_stock', {
        p_product_id: productId, p_type: type, p_delta: delta, p_reason: reason,
      });
      if (error) {
        console.error('[InventoryStore] adjustStock failed:', error);
        throw error;
      }
      return mapProduct(data);
    },

    /** @param {string} productId @returns {Promise<Array>} */
    async stockHistory(productId) {
      const { data, error } = await client()
        .from('stock_movements')
        .select('*, user:profiles(id, name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[InventoryStore] stockHistory failed:', error);
        return [];
      }
      return data.map(mapMovement);
    },

    /** Most recent stock movements across all products, for a dashboard activity feed. @returns {Promise<Array>} */
    async recentMovements(limit = 8) {
      const { data, error } = await client()
        .from('stock_movements')
        .select('*, user:profiles(id, name), product:products(id, sku, brand, model)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        console.error('[InventoryStore] recentMovements failed:', error);
        return [];
      }
      return data.map((row) => ({ ...mapMovement(row), product: row.product ? { id: row.product.id, sku: row.product.sku, brand: row.product.brand, model: row.product.model } : null }));
    },

    /** Products at or below their minimum stock threshold. @returns {Promise<Array>} */
    async lowStock() {
      const all = await this.list({ status: 'ACTIVE' });
      return all.filter((p) => p.lowStock);
    },

  };

})();

if (typeof window !== 'undefined') window.InventoryStore = InventoryStore;
if (typeof module !== 'undefined') module.exports = InventoryStore;
