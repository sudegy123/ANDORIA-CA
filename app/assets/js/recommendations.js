/**
 * SOLAR SMART ADVISOR — RECOMMENDATIONS ENGINE
 * recommendations.js
 *
 * Translates calculation results into package recommendations.
 * Handles package selection logic, pricing, and comparison.
 * All display text (tier names, descriptions, features, confidence
 * checklist) comes from I18n — nothing here is hardcoded to one
 * language, so a language switch rebuilds it correctly automatically.
 */

'use strict';

const RecommendationsEngine = (() => {

  const TIER_IDS = ['essential', 'standard', 'premium'];

  // Numeric/structural tier data — NOT display text. Autonomy factor and
  // extra panels drive the price/spec math; the words come from I18n.
  const TIER_CONFIG = {
    essential: { autonomy_factor: 0.80, panel_extra: 0 },
    standard:  { autonomy_factor: 1.00, panel_extra: 0 },
    premium:   { autonomy_factor: 1.80, panel_extra: 2 },
  };

  /**
   * Determine which package tier to recommend.
   * @param {Object} calc - calculation result
   * @param {Object} state - app state
   * @returns {string} 'essential' | 'standard' | 'premium'
   */
  function selectTier(calc, state) {
    const dailyKwh = calc.raw_wh / 1000;
    const hasAC    = Object.values(state.selectedDevices || {})
      .some(d => d.id && d.id.includes('ac-'));
    const hasPump  = Object.values(state.selectedDevices || {})
      .some(d => d.id && d.id.includes('pump'));
    const isMedical = state.propertyType === 'clinic';
    const isFarm    = state.propertyType === 'farm';

    // Premium conditions
    if (isMedical)       return 'premium';
    if (dailyKwh > 8)    return 'premium';
    if (hasPump && isFarm) return 'premium';

    // Essential conditions
    if (dailyKwh < 1.5 && !hasAC && !hasPump) return 'essential';
    if ((state.budget || 9999) < 800)          return 'essential';

    // Default: Standard
    return 'standard';
  }

  /**
   * Build all three packages with specs and pricing, fully localized in
   * the current I18n language.
   * @param {Object} calc - calculation result
   * @param {Object} state - app state
   * @param {Object} CONSTANTS - pricing constants
   * @returns {Array} array of package objects
   */
  function buildPackages(calc, state, CONSTANTS) {
    const recommendedTier = selectTier(calc, state);

    return TIER_IDS.map(id => {
      const cfg = TIER_CONFIG[id];
      const t = (suffix, vars) => I18n.t(`steps.packages.tiers.${id}.${suffix}`, vars);

      const adjBattKwh = Math.round(calc.battery_kwh * cfg.autonomy_factor * 10) / 10;
      const adjBackup  = Math.round(calc.backup_hrs * cfg.autonomy_factor * 10) / 10;
      const panelCount = calc.panel_count + cfg.panel_extra;

      const price = CalcEngine.calcPackagePrice(
        { ...calc, battery_kwh: adjBattKwh, panel_count: panelCount },
        id,
        CONSTANTS.PRICE,
        CONSTANTS.PACKAGE_MULTIPLIERS
      );

      const featureIcons = ['☀️', '🔋', '❄️', '📊', '🛡️', '🔧'];
      const rawFeatures = I18n.tRaw(`steps.packages.tiers.${id}.features`) || [];
      const vars = { panelCount, batteryKwh: adjBattKwh, inverterW: calc.inverter_w, backupHrs: adjBackup };
      const features = rawFeatures.map((text, i) => ({
        icon: featureIcons[i] || '✔️',
        text: Object.keys(vars).reduce((s, k) => s.replace(`{${k}}`, vars[k]), text),
      }));

      return {
        id,
        tier_ar: t('tier'), // kept for backward compatibility; always current-language now
        name_ar: t('name'),
        desc_ar: t('desc'),
        warranty_ar: t('warranty'),
        recommended: id === recommendedTier,
        panel_count: panelCount,
        battery_kwh: adjBattKwh,
        backup_hrs:  adjBackup,
        inverter_w:  calc.inverter_w,
        price,
        features,
      };
    });
  }

  /**
   * Build display cards for real, staff-published packages (Module 3 —
   * Package Catalog), in the SAME shape buildPackages() above produces
   * for the formula tiers (id/tier_ar/name_ar/desc_ar/recommended/price/
   * features), so nothing downstream (Order Review, Payment, PDF,
   * WhatsApp) needs to know which source a package came from.
   * @param {Array} pricedPackages - PackageCatalog.getMatchedPackages().packages
   * @returns {Array}
   */
  function buildFromCatalog(pricedPackages) {
    const lang = I18n.getLang();
    const pt = (k, vars) => I18n.t('steps.packages.' + k, vars);

    return pricedPackages.map((p) => {
      const name = lang === 'ar' ? p.nameAr : p.nameEn;
      const desc = lang === 'ar' ? (p.descriptionAr || '') : (p.descriptionEn || '');
      const systemKw = p.totalPanelWatts / 1000;

      const features = p.components.map((c) => {
        const spec = c.capacityWatts ? `${c.capacityWatts}W` : (c.capacityKwh ? `${c.capacityKwh}kWh` : '');
        const key = spec ? 'componentLine' : 'componentLineNoSpec';
        return {
          icon: ProductCategories.icon(c.category),
          text: pt(key, { qty: c.quantity, spec, category: ProductCategories.label(c.category), brand: c.brand, model: c.model }),
        };
      });

      return {
        id: p.id,
        tier_ar: systemKw > 0 ? `${systemKw.toFixed(1)}kW` : '',
        name_ar: name,
        desc_ar: desc,
        recommended: !!p.recommended,
        price: p.price,
        features,
      };
    });
  }

  /**
   * Build the battery night simulation timeline. usableWh applies the
   * same temp/efficiency derating CalcEngine.calcBattery() used to size
   * the bank, matching CalcEngine.calcBackupHours() — otherwise this
   * chart shows the battery lasting longer than it was actually sized
   * to deliver.
   * @param {number} battKwh - usable battery kWh
   * @param {number} dod
   * @param {number} nightLoadW - watts of load at night
   * @param {number} tempFactor - temperature derating (default 0.90)
   * @param {number} roundTripEfficiency - chemistry round-trip efficiency (default 0.965)
   * @returns {Array} timeline rows
   */
  function buildBatteryTimeline(battKwh, dod, nightLoadW, tempFactor = 0.90, roundTripEfficiency = 0.965) {
    const usableWh = battKwh * 1000 * dod * tempFactor * roundTripEfficiency;
    const pm = I18n.t('units.pm');
    const am = I18n.t('units.am');

    const TIMES = [
      { label: `06:30${pm}`, hours_elapsed: 0 },
      { label: `09:00${pm}`, hours_elapsed: 2.5 },
      { label: `11:00${pm}`, hours_elapsed: 4.5 },
      { label: `01:00${am}`, hours_elapsed: 6.5 },
      { label: `03:00${am}`, hours_elapsed: 8.5 },
      { label: `05:00${am}`, hours_elapsed: 10.5 },
      { label: `06:30${am}`, hours_elapsed: 12, is_sunrise: true },
    ];

    return TIMES.map(t => {
      const consumed   = t.hours_elapsed > 0 ? (nightLoadW * t.hours_elapsed) / 1000 : 0;
      const remainKwh  = Math.max(0, usableWh / 1000 - consumed);
      const pct        = Math.round((remainKwh / (usableWh / 1000)) * 100);
      const colorClass = pct > 50 ? 'bat-green' : pct > 20 ? 'bat-yellow' : 'bat-red';
      const txtColor   = pct > 50 ? 'var(--color-success)' : pct > 20 ? 'var(--color-warning)' : 'var(--color-danger)';

      return {
        label:       t.label,
        pct:         Math.max(0, pct),
        color_class: colorClass,
        txt_color:   txtColor,
        is_sunrise:  !!t.is_sunrise,
      };
    });
  }

  /**
   * Build confidence checklist items for the Order Review step.
   * @param {Object} calc
   * @param {Object} state
   * @returns {string[]}
   */
  function buildConfidenceItems(calc, state) {
    const items = I18n.tRaw('steps.review.confidence') || [];
    const vars = {
      backupHrs: calc.backup_hrs,
      peakW: Math.round(calc.peak_w),
      psh: calc.psh,
    };
    const filled = items.map(text => Object.keys(vars).reduce((s, k) => s.replace(`{${k}}`, vars[k]), text));
    // Item index 2 vs 3 (expansion-aware vs generic margin note) — swap
    // based on state.expansion, matching the original single-language logic.
    if (filled.length >= 4) {
      if (!state.expansion) filled.splice(2, 1); // drop the "designed for expansion" line
      else filled.splice(3, 1); // drop the generic "25% margin" line
    }
    return filled;
  }

  // ── Public API ─────────────────────────────────────────────────
  return { selectTier, buildPackages, buildFromCatalog, buildBatteryTimeline, buildConfidenceItems };

})();

if (typeof window !== 'undefined') window.RecommendationsEngine = RecommendationsEngine;
if (typeof module !== 'undefined') module.exports = RecommendationsEngine;
