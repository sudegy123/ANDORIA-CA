/**
 * SOLAR ERP — PRICING ENGINE
 * pricing-engine.js
 *
 * Phase B Module 2 (Live Pricing Engine). Replaces the mock CONSTANTS.PRICE
 * block calcPackagePrice() used to take as-is with numbers derived from
 * real Inventory stock, via the get_live_pricing() RPC (supabase/migrations
 * /20260101000010) — a narrow read-only surface, not a raw table read,
 * because the calculator runs for anonymous customers and RLS rightly
 * keeps products/settings staff-only (purchase cost, stock levels and
 * supplier links are internal, not something a public calculator should
 * expose).
 *
 * calcPackagePrice()'s formula itself is untouched — it still does
 * `panel_count * PANEL_PER_UNIT`, `battery_kwh * BATTERY_PER_KWH`, etc.
 * Only the numbers fed into it change: PANEL_PER_UNIT and
 * INVERTER_PER_500W are derived from a live $/W average scaled back up to
 * the "per standard unit" shape the formula already expects, so no other
 * file needs to change.
 *
 * Any category with zero active, capacity-tagged products falls back to
 * the original mock constant for just that category — `sourced` reports
 * which numbers are real so a caller can show "estimated" if it wants to.
 * A Supabase failure (offline, misconfigured) falls back entirely; the
 * calculator must never break because pricing couldn't be fetched live.
 */

'use strict';

const PricingEngine = (() => {

  let cached = null;

  async function fetchLive() {
    if (!SupabaseClient.isConfigured) return null;
    try {
      const { data, error } = await SupabaseClient.get().rpc('get_live_pricing');
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[PricingEngine] get_live_pricing failed, using estimated defaults:', err);
      return null;
    }
  }

  /**
   * @param {boolean} [forceRefresh]
   * @returns {Promise<{prices: Object, multipliers: Object, sourced: Object}>}
   */
  async function getLivePrices(forceRefresh = false) {
    if (cached && !forceRefresh) return cached;

    const live = await fetchLive();
    const mock = CONSTANTS.PRICE;

    const panelPerWatt    = live && live.panelPerWatt    != null ? Number(live.panelPerWatt)    : null;
    const batteryPerKwh   = live && live.batteryPerKwh   != null ? Number(live.batteryPerKwh)   : null;
    const inverterPerWatt = live && live.inverterPerWatt != null ? Number(live.inverterPerWatt) : null;

    const result = {
      prices: {
        PANEL_PER_UNIT:    panelPerWatt    != null ? panelPerWatt * CONSTANTS.PANEL_WATT_STANDARD : mock.PANEL_PER_UNIT,
        BATTERY_PER_KWH:   batteryPerKwh   != null ? batteryPerKwh                                 : mock.BATTERY_PER_KWH,
        INVERTER_PER_500W: inverterPerWatt != null ? inverterPerWatt * 500                         : mock.INVERTER_PER_500W,
        INSTALLATION_BASE: live && live.installationBase != null ? Number(live.installationBase) : mock.INSTALLATION_BASE,
        PROTECTION_BASE:   live && live.protectionBase   != null ? Number(live.protectionBase)   : mock.PROTECTION_BASE,
        MPPT_BASE:         live && live.mpptBase         != null ? Number(live.mpptBase)         : mock.MPPT_BASE,
      },
      multipliers: CONSTANTS.PACKAGE_MULTIPLIERS,
      sourced: {
        panel:    panelPerWatt    != null,
        battery:  batteryPerKwh   != null,
        inverter: inverterPerWatt != null,
      },
    };

    cached = result;
    return result;
  }

  return { getLivePrices };

})();

if (typeof window !== 'undefined') window.PricingEngine = PricingEngine;
if (typeof module !== 'undefined') module.exports = PricingEngine;
