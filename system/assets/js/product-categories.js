/**
 * SOLAR ERP — PRODUCT CATEGORIES
 * product-categories.js
 *
 * Single source of truth for the 7 inventory categories (icon + i18n
 * key), matching the products.category CHECK constraint exactly. Any
 * page rendering a category badge, filter tab, or select option reads
 * from here. Lives in shared assets/js/ (not crm/) because Module 3's
 * calculator package cards need category icons/labels too — same
 * reasoning inventory-store.js and pricing-engine.js already established.
 */

'use strict';

const ProductCategories = (() => {

  const LIST = [
    { id: 'SOLAR_PANEL',           icon: '☀️', labelKey: 'crm.categories.SOLAR_PANEL' },
    { id: 'BATTERY',                icon: '🔋', labelKey: 'crm.categories.BATTERY' },
    { id: 'INVERTER',               icon: '⚡', labelKey: 'crm.categories.INVERTER' },
    { id: 'MOUNTING_STRUCTURE',     icon: '🏗️', labelKey: 'crm.categories.MOUNTING_STRUCTURE' },
    { id: 'CABLE',                  icon: '🔗', labelKey: 'crm.categories.CABLE' },
    { id: 'ACCESSORY',              icon: '🧰', labelKey: 'crm.categories.ACCESSORY' },
    { id: 'ELECTRICAL_COMPONENT',   icon: '🔧', labelKey: 'crm.categories.ELECTRICAL_COMPONENT' },
  ];

  const _byId = {};
  LIST.forEach((c) => { _byId[c.id] = c; });

  function all() { return LIST; }
  function get(id) { return _byId[id] || null; }
  function icon(id) { return (get(id) || {}).icon || '📦'; }
  function label(id) {
    const c = get(id);
    if (!c) return id || '—';
    return (typeof I18n !== 'undefined') ? I18n.t(c.labelKey) : c.id;
  }

  return { all, get, icon, label };

})();

if (typeof window !== 'undefined') window.ProductCategories = ProductCategories;
if (typeof module !== 'undefined') module.exports = ProductCategories;
