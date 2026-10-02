/**
 * SOLAR ERP — PACKAGE CATALOG (customer-calculator matching)
 * package-catalog.js
 *
 * Phase B Module 3. Turns a calculation result into up to 3 real,
 * staff-built ACTIVE packages (PackagesStore.listPriced()) that actually
 * cover the customer's calculated need — replacing the old fixed
 * essential/standard/premium formula tiers.
 *
 * "Covers the need" = the package's total panel wattage, battery kWh and
 * inverter wattage are each >= what CalcEngine determined the customer
 * requires. Recommended = the cheapest package that covers it; the next
 * two (if any) are shown in ascending price order so the customer sees a
 * clear low→high progression, same layout the old tiers had.
 *
 * If no ACTIVE package covers the requirement yet (most likely: the
 * business hasn't published any packages at all), usingFallback comes
 * back true and app.js's buildPackages() falls back to the Module 2
 * live-priced formula tiers — the wizard must never show an empty step
 * just because the Package Manager catalog is still empty.
 */

'use strict';

const PackageCatalog = (() => {

  function requiredTotals(calc) {
    return {
      panelWatts: calc.panel_count * CONSTANTS.PANEL_WATT_STANDARD,
      batteryKwh: calc.battery_kwh,
      inverterWatts: calc.inverter_w,
    };
  }

  function meetsRequirement(pkg, req) {
    return pkg.totalPanelWatts >= req.panelWatts
      && pkg.totalBatteryKwh >= req.batteryKwh
      && pkg.totalInverterWatts >= req.inverterWatts;
  }

  /**
   * @param {Object} calc - CalcEngine result
   * @returns {Promise<{packages: Array, usingFallback: boolean}>}
   */
  async function getMatchedPackages(calc) {
    const all = await PackagesStore.listPriced();
    const active = all.filter((p) => p.status === 'ACTIVE');
    const req = requiredTotals(calc);
    const fitting = active.filter((p) => meetsRequirement(p, req)).sort((a, b) => a.price - b.price);

    if (fitting.length === 0) return { packages: [], usingFallback: true };

    const chosen = fitting.slice(0, 3);
    return {
      packages: chosen.map((p, i) => ({ ...p, recommended: i === 0 })),
      usingFallback: false,
    };
  }

  return { getMatchedPackages };

})();

if (typeof window !== 'undefined') window.PackageCatalog = PackageCatalog;
if (typeof module !== 'undefined') module.exports = PackageCatalog;
