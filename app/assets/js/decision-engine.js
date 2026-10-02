/**
 * SOLAR SMART ADVISOR — DECISION ENGINE
 * decision-engine.js
 *
 * The adaptive brain of the advisor. Nothing here is a hardcoded device
 * list — every list is derived at request time from:
 *
 *   propertyType (+ shopType when propertyType === 'shop')
 *     → relevant Categories   (DeviceManager.getPropertyCategories/getShopCategories)
 *       → relevant Devices    (DeviceManager.getByCategory, filtered by device.ctx)
 *         → Variants          (device.watts tiers already modeled as separate device ids)
 *           → Quick Selection (DeviceManager.getQuickSelection)
 *
 * DeviceManager owns raw data. DecisionEngine owns the *rules* for which
 * slice of that data applies to a given context — this file is the only
 * place property-type/shop-type branching logic is allowed to live.
 */

'use strict';

const DecisionEngine = (() => {

  /**
   * Does this device apply to the given property/shop context?
   * @param {Object} device - device record with a `ctx` array
   * @param {string} propertyType
   * @param {string|null} shopType
   * @returns {boolean}
   */
  function deviceApplies(device, propertyType, shopType) {
    if (!device || !Array.isArray(device.ctx)) return false;
    if (device.ctx.includes('all')) return true;
    if (device.ctx.includes(propertyType)) return true;
    if (propertyType === 'shop' && shopType && device.ctx.includes(shopType)) return true;
    return false;
  }

  /**
   * Ordered, de-duplicated category id list for a context.
   * Falls back to the generic "shop" set until a shopType is chosen.
   * @param {string} propertyType
   * @param {string|null} shopType
   * @returns {string[]}
   */
  function getCategoryIds(propertyType, shopType) {
    if (propertyType === 'shop') {
      if (shopType) return DeviceManager.getShopCategories(shopType);
      return DeviceManager.getPropertyCategories('shop');
    }
    return DeviceManager.getPropertyCategories(propertyType);
  }

  /**
   * Full category objects (id/name/emoji), in the context-appropriate order.
   * @param {string} propertyType
   * @param {string|null} shopType
   * @returns {Object[]}
   */
  function getCategories(propertyType, shopType) {
    // Skip categories with no devices for this context — an empty card would be a dead end.
    return getCategoryIds(propertyType, shopType)
      .map(id => DeviceManager.getCategoryById(id))
      .filter(Boolean)
      .filter(c => getDevices(propertyType, shopType, c.id).length > 0);
  }

  /**
   * Devices to show for one category tab, filtered to the current context.
   * Handles the "emergency" virtual category specially: it pulls
   * critical=true devices from across every category instead of one.
   * @param {string} propertyType
   * @param {string|null} shopType
   * @param {string} categoryId
   * @returns {Object[]}
   */
  function getDevices(propertyType, shopType, categoryId) {
    if (categoryId === 'emergency') {
      return DeviceManager.getAll().filter(d =>
        d.critical && deviceApplies(d, propertyType, shopType)
      );
    }
    return DeviceManager.getByCategory(categoryId).filter(d =>
      deviceApplies(d, propertyType, shopType)
    );
  }

  /**
   * The first (highest-priority) category for a context — used as the
   * initially active device tab when step 4 is entered.
   * @param {string} propertyType
   * @param {string|null} shopType
   * @returns {string|null}
   */
  function getDefaultCategory(propertyType, shopType) {
    const cats = getCategories(propertyType, shopType);
    return cats.length ? cats[0].id : null;
  }

  /**
   * Quick-selection device ids for a context. Shop verticals take priority
   * over the generic "shop" set once a shopType is known.
   * @param {string} propertyType
   * @param {string|null} shopType
   * @returns {string[]}
   */
  function getQuickSelection(propertyType, shopType) {
    if (propertyType === 'shop' && shopType) {
      return DeviceManager.getQuickSelection(shopType);
    }
    return DeviceManager.getQuickSelection(propertyType);
  }

  /**
   * Whether this property type requires a follow-up shop-type question
   * before device selection can proceed.
   * @param {string} propertyType
   * @returns {boolean}
   */
  function requiresShopType(propertyType) {
    return propertyType === 'shop';
  }

  return {
    deviceApplies,
    getCategories,
    getDevices,
    getDefaultCategory,
    getQuickSelection,
    requiresShopType,
  };

})();

if (typeof window !== 'undefined') window.DecisionEngine = DecisionEngine;
if (typeof module !== 'undefined') module.exports = DecisionEngine;
