/**
 * SOLAR SMART ADVISOR — CALCULATION ENGINE
 * calculations.js
 *
 * PURE FUNCTIONS ONLY.
 * No DOM access. No state reads. No side effects.
 * Takes inputs, returns outputs.
 * 100% unit-testable.
 *
 * Engineering references:
 * - NREL PVWatts methodology
 * - IEC 62548 (PV array design)
 * - IEEE 1562 (battery sizing)
 */

'use strict';

const CalcEngine = (() => {

  /**
   * Round up to nearest step.
   * @param {number} val
   * @param {number} step
   * @returns {number}
   */
  function ceilToStep(val, step) {
    return Math.ceil(val / step) * step;
  }

  /**
   * Find minimum value from a sorted array that is >= target.
   * Used for standard inverter/MPPT sizes.
   * @param {number[]} sizes - sorted ascending
   * @param {number} target
   * @returns {number}
   */
  function nextStandardSize(sizes, target) {
    for (const s of sizes) {
      if (s >= target) return s;
    }
    return sizes[sizes.length - 1]; // return largest if none fit
  }

  return {

    /**
     * STEP 1 — Daily Energy Consumption
     *
     * @param {Array} devices - [{watts, hours, qty, ...}]
     * @param {number} wireLoss - multiplier for wiring/conversion loss (default 1.15)
     * @returns {{ raw_wh, adjusted_wh, monthly_kwh }}
     */
    calcDailyEnergy(devices, wireLoss = 1.15) {
      let rawWh = 0;
      for (const d of devices) {
        rawWh += d.watts * d.hours * d.qty;
      }
      const adjustedWh = rawWh * wireLoss;
      const monthlyKwh = Math.round((rawWh * 30) / 1000);
      return {
        raw_wh:       Math.round(rawWh),
        adjusted_wh:  Math.round(adjustedWh),
        monthly_kwh:  monthlyKwh,
      };
    },

    /**
     * STEP 2 — Peak Load
     * Sum of all running watts simultaneously.
     *
     * @param {Array} devices
     * @returns {number} peak watts
     */
    calcPeakLoad(devices) {
      let peakW = 0;
      for (const d of devices) {
        peakW += d.watts * d.qty;
      }
      return Math.round(peakW);
    },

    /**
     * STEP 3 — Surge Load
     * Largest motor startup surge + sum of all other running loads.
     * Motor loads draw 3-7× rated at startup.
     *
     * @param {Array} devices
     * @returns {{ surge_va, largest_motor_name }}
     */
    calcSurgeLoad(devices) {
      let maxSurge = 0;
      let maxSurgeDevice = null;
      let totalRunning = 0;

      for (const d of devices) {
        totalRunning += d.watts * d.qty;
        const thisSurge = d.watts * (d.surge || 1.0) * d.qty;
        if (thisSurge > maxSurge) {
          maxSurge = thisSurge;
          maxSurgeDevice = d;
        }
      }

      // Surge = largest motor surge + rest of loads at rated power
      const othersRunning = maxSurgeDevice
        ? totalRunning - (maxSurgeDevice.watts * maxSurgeDevice.qty)
        : 0;

      const surgeVA = Math.round(maxSurge + othersRunning);

      return {
        surge_va:           surgeVA,
        largest_motor_name: maxSurgeDevice ? maxSurgeDevice.name_ar : null,
      };
    },

    /**
     * STEP 4 — Battery Bank Size
     *
     * Sized off the energy actually needed to survive the customer's
     * selected backup/outage period — NOT off total daily consumption.
     * Total daily energy includes daytime load the panels can serve
     * directly while the sun is up; sizing the battery against the
     * *whole* day (as an older version of this engine did, via a fixed
     * "autonomy days" multiplier applied to total daily Wh) silently
     * produces a battery bigger than what the customer actually asked
     * for and disconnected from their real answer about outage length.
     *
     * Formula: Battery_kWh = (requiredBackupWh / 1000) / DoD / temp_factor / round_trip_efficiency
     * Battery_Ah = (Battery_kWh × 1000) / system_voltage
     *
     * requiredBackupWh itself = assumed backup load (W) × the customer's
     * selected backup hours — computed by the caller (run()) so this
     * function stays a pure formula, not a policy about what "backup
     * load" means.
     *
     * The round-trip-efficiency term is what makes chemistry matter here,
     * not just a relabeled DoD: a lead-acid/GEL bank needs more raw
     * capacity than lithium to deliver the same *usable* energy, because
     * more of what goes in during charging never comes back out.
     *
     * @param {number} requiredBackupWh - energy needed to cover the backup period
     * @param {number} dod - depth of discharge (0-1)
     * @param {number} voltageV - system voltage
     * @param {number} tempFactor - temperature derating (default 0.90 for Sudan)
     * @param {number} roundTripEfficiency - chemistry round-trip efficiency (default 0.965, lithium)
     * @returns {{ battery_kwh, battery_ah }}
     */
    calcBattery(requiredBackupWh, dod, voltageV, tempFactor = 0.90, roundTripEfficiency = 0.965) {
      const battKwh = (requiredBackupWh / 1000) / dod / tempFactor / roundTripEfficiency;
      const battAh  = (battKwh * 1000) / voltageV;
      return {
        battery_kwh: Math.round(battKwh * 10) / 10,
        battery_ah:  Math.ceil(battAh),
      };
    },

    /**
     * STEP 5 — Solar Panel Array
     *
     * Formula: Panel_W = (Daily_Wh_adj / PSH / efficiency) × safety_margin / panel_temp_factor
     *
     * @param {number} dailyWhAdj
     * @param {number} psh - peak sun hours for location
     * @param {number} systemEfficiency - system efficiency (default 0.75)
     * @param {number} safetyMargin - overhead multiplier (default 1.25)
     * @param {number} panelWp - individual panel watt-peak class (default CONSTANTS.PANEL_CLASS_DEFAULT's watts)
     * @param {number} tempFactor - panel temp derating (default 0.90)
     * @returns {{ array_w, array_w_exact, panel_count }}
     */
    calcPanels(dailyWhAdj, psh, systemEfficiency = 0.75, safetyMargin = 1.25, panelWp = 625, tempFactor = 0.90) {
      const arrayW     = (dailyWhAdj / psh / systemEfficiency) * safetyMargin / tempFactor;
      const panelCount = Math.ceil(arrayW / panelWp);
      return {
        array_w:       Math.ceil(arrayW / 100) * 100,  // rounded, DISPLAY only
        array_w_exact: arrayW,                          // unrounded — the real PV requirement; every panel-count derivation (this class and any alternative) must divide THIS, never the rounded display value, or two numbers claiming to describe the same system can silently disagree
        panel_count:   panelCount,
      };
    },

    /**
     * Resolve an inverter type/phase recommendation from the required
     * wattage and the customer's charging-architecture preference. This
     * calculator always sizes a battery bank for backup power, so
     * OFF_GRID and HYBRID are both technically suitable (returned as
     * suitableTypes) — ON_GRID is excluded since it doesn't require a
     * battery, which conflicts with the sizing this app always does, and
     * this advisor must never recommend ON_GRID as if it were a
     * battery-backup solution.
     *
     * chargingModeId maps directly to CONSTANTS.CHARGING_MODES — 'Solar
     * only' resolves to OFF_GRID (no grid connection at all, by
     * definition); SOLAR_GRID and GRID_ONLY both resolve to HYBRID,
     * since HYBRID is the only architecture in this schema that
     * actually supports a grid/generator input — GRID_ONLY is simply a
     * HYBRID inverter run with no PV array connected, a real and common
     * configuration, not an invented one (see CONSTANTS.CHARGING_MODES
     * and run()'s hasSolar handling for how panel sizing is skipped).
     *
     * Phase follows the researched single/three-phase threshold.
     * @param {number} inverterW
     * @param {string} [chargingModeId] - a CONSTANTS.CHARGING_MODES id, defaults to the HYBRID-mapped mode
     * @returns {{ type: string, suitableTypes: string[], phase: 'single'|'three' }}
     */
    resolveInverterType(inverterW, chargingModeId) {
      const threshold = (typeof CONSTANTS !== 'undefined' && CONSTANTS.INVERTER_SINGLE_PHASE_MAX_W) || 10000;
      const modes = (typeof CONSTANTS !== 'undefined' && CONSTANTS.CHARGING_MODES) || {};
      const mode = modes[chargingModeId];
      const type = (mode && mode.inverterType === 'OFF_GRID') ? 'OFF_GRID' : 'HYBRID';
      return {
        type,
        suitableTypes: ['HYBRID', 'OFF_GRID'],
        phase: inverterW > threshold ? 'three' : 'single',
      };
    },

    /**
     * STEP 6 — MPPT Charge Controller
     *
     * Formula: MPPT_A = (Array_W / Battery_V) × safety_factor
     *
     * @param {number} arrayW - total panel array watts
     * @param {number} voltageV - battery voltage
     * @param {number} safetyFactor - (default 1.25)
     * @param {number[]} standardSizes - standard MPPT ampere ratings
     * @returns {number} mppt_a
     */
    calcMPPT(arrayW, voltageV, safetyFactor = 1.25, standardSizes = [20, 30, 40, 50, 60, 80, 100]) {
      const requiredA = (arrayW / voltageV) * safetyFactor;
      return nextStandardSize(standardSizes, requiredA);
    },

    /**
     * STEP 7 — Inverter Size
     *
     * Must handle: peak continuous load × 1.2 safety
     * AND: surge load
     *
     * @param {number} peakW - peak running watts
     * @param {number} surgeVA - surge volt-amperes
     * @param {number[]} standardSizes - standard inverter watt ratings
     * @returns {number} inverter_w
     */
    calcInverter(peakW, surgeVA, standardSizes = [1000, 1500, 2000, 3000, 3500, 5000, 6000, 8000, 10000]) {
      const continuousRequired = peakW * 1.2;
      // For inverter sizing, surge VA ≈ surge W (power factor ~1 for resistive + motor mix)
      const required = Math.max(continuousRequired, surgeVA * 0.7); // 0.7 PF typical
      return nextStandardSize(standardSizes, required);
    },

    /**
     * STEP 8 — Battery Backup Hours
     * How long the battery lasts at a given nighttime load. Must apply
     * the SAME derating terms calcBattery() used to size the bank
     * (temp derating + round-trip efficiency), not just DoD — otherwise
     * this reports an optimistic hour count the bank was never actually
     * sized to deliver, drifting from calcBattery() by exactly those two
     * factors (~15% at defaults).
     *
     * @param {number} battKwh - battery bank kWh
     * @param {number} dod - depth of discharge
     * @param {number} nightLoadW - estimated night load in watts
     * @param {number} tempFactor - temperature derating (default 0.90, must match calcBattery's)
     * @param {number} roundTripEfficiency - chemistry round-trip efficiency (default 0.965, must match calcBattery's)
     * @returns {number} backup hours
     */
    calcBackupHours(battKwh, dod, nightLoadW, tempFactor = 0.90, roundTripEfficiency = 0.965) {
      if (!nightLoadW || nightLoadW <= 0) return 0;
      const usableWh = battKwh * 1000 * dod * tempFactor * roundTripEfficiency;
      return Math.round((usableWh / nightLoadW) * 10) / 10;
    },

    /**
     * Diesel generator fuel-cost estimate + solar fuel-savings estimate.
     * Deliberately takes dailyWh as its ONLY energy input — always call
     * this with the SAME calc.raw_wh the rest of the system (panels,
     * battery, inverter, PDF, WhatsApp) was already computed from, never
     * a second/independent energy figure, or the savings shown could
     * silently describe a different system than the one recommended.
     *
     * This is a fuel-cost offset, not a total-cost-of-ownership claim —
     * callers must present it as "reduces running fuel cost," never as
     * "solar has zero operating cost."
     *
     * @param {number} dailyWh - calc.raw_wh from the SAME calculation result
     * @param {Object} options - { dieselPriceUsd, literPerKwh, coveragePct }
     * @returns {Object} daily/monthly/yearly fuel-cost and savings estimates (USD)
     */
    calcDieselSavings(dailyWh, options = {}) {
      const dieselPrice = options.dieselPriceUsd
        ?? (typeof CONSTANTS !== 'undefined' && CONSTANTS.DIESEL_PRICE_USD_PER_LITER) ?? (6.50 / 3.785411784); // business figure: $6.50/US gallon — NEVER the old $0.656/L
      const literPerKwh = options.literPerKwh
        ?? (typeof CONSTANTS !== 'undefined' && CONSTANTS.GENERATOR_FUEL_L_PER_KWH) ?? 0.25;
      const coveragePct = options.coveragePct
        ?? (typeof CONSTANTS !== 'undefined' && CONSTANTS.SOLAR_COVERAGE_PCT) ?? 0.88;

      const dailyKwh          = (dailyWh || 0) / 1000;
      const dailyFuelCostUsd  = dailyKwh * literPerKwh * dieselPrice;
      const dailySavingsUsd   = dailyFuelCostUsd * coveragePct;

      return {
        daily_fuel_cost_usd:   Math.round(dailyFuelCostUsd * 100) / 100,
        daily_savings_usd:     Math.round(dailySavingsUsd * 100) / 100,
        monthly_savings_usd:   Math.round(dailySavingsUsd * 30 * 100) / 100,
        yearly_savings_usd:    Math.round(dailySavingsUsd * 365 * 100) / 100,
        diesel_price_usd_per_liter: dieselPrice,
        generator_fuel_l_per_kwh:   literPerKwh,
        coverage_pct:               coveragePct,
      };
    },

    /**
     * STEP 9 — Package Price
     * Mock pricing formula. Replace with product catalog lookup in production.
     *
     * @param {Object} calc - full calculation result
     * @param {string} tier - 'essential' | 'standard' | 'premium'
     * @param {Object} prices - price constants
     * @param {Object} multipliers - tier multipliers
     * @returns {number} price USD
     */
    calcPackagePrice(calc, tier, prices, multipliers) {
      const base =
        calc.panel_count  * prices.PANEL_PER_UNIT +
        calc.battery_kwh  * prices.BATTERY_PER_KWH +
        Math.ceil(calc.inverter_w / 500) * prices.INVERTER_PER_500W +
        prices.INSTALLATION_BASE +
        prices.PROTECTION_BASE +
        prices.MPPT_BASE;

      const tieredPrice = base * (multipliers[tier] || 1.0);
      // Round to nearest $50 for clean pricing
      return Math.ceil(tieredPrice / 50) * 50;
    },

    /**
     * MAIN — Run full calculation from device list.
     * Orchestrates steps 1-8 into a single result object.
     *
     * @param {Array} devices - selected devices with qty and hours
     * @param {Object} options - { psh, outageHours, voltageV, batteryChemistryId, panelClassId, chargingModeId }
     * @returns {Object} complete calculation result
     */
    run(devices, options = {}) {
      const chemistries = (typeof CONSTANTS !== 'undefined' && CONSTANTS.BATTERY_CHEMISTRY) || {};
      const panelClasses = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PANEL_CLASSES) || [];
      const defaultChemistryId = (typeof CONSTANTS !== 'undefined' && CONSTANTS.BATTERY_CHEMISTRY_DEFAULT) || 'LITHIUM';
      const defaultPanelClassId = (typeof CONSTANTS !== 'undefined' && CONSTANTS.PANEL_CLASS_DEFAULT) || 'W625';
      const defaultChargingModeId = (typeof CONSTANTS !== 'undefined' && CONSTANTS.CHARGING_MODE_DEFAULT) || 'SOLAR_GRID';

      const nightLoadFactor = (typeof CONSTANTS !== 'undefined' && CONSTANTS.NIGHT_LOAD_FACTOR) || 0.50;

      const {
        psh                = 5.5,
        voltageV           = 48,
        batteryChemistryId = defaultChemistryId,
        panelClassId       = defaultPanelClassId,
        chargingModeId     = defaultChargingModeId,
        outageHours        = 8, // matches StateManager's default — see state.js
      } = options;

      const chemistry  = chemistries[batteryChemistryId] || chemistries[defaultChemistryId] || { dod: 0.85, efficiency: 0.965 };
      const panelClass  = panelClasses.find(c => c.id === panelClassId) || panelClasses.find(c => c.id === defaultPanelClassId) || { id: defaultPanelClassId, watts: 625 };

      // GRID_ONLY (and any future mode explicitly flagged hasSolar:false)
      // has no PV array — panel_class stays populated (harmless, unused
      // metadata) but every panel-derived figure below is forced to zero
      // rather than computed, so the UI/PDF/WhatsApp/CRM can never show a
      // fabricated panel count for a system that has no panels.
      const chargingModes = (typeof CONSTANTS !== 'undefined' && CONSTANTS.CHARGING_MODES) || {};
      const chargingMode  = chargingModes[chargingModeId];
      const hasSolar = !chargingMode || chargingMode.hasSolar !== false;

      // Empty state
      if (!devices || devices.length === 0) {
        return {
          raw_wh: 0, adjusted_wh: 0, monthly_kwh: 0,
          peak_w: 0, surge_va: 0, largest_motor: null,
          battery_kwh: 0, battery_ah: 0, outage_hours: outageHours,
          array_w: 0, array_w_exact: 0, panel_count: 0,
          panel_alternatives: [],
          mppt_a: 0, inverter_w: 1000,
          backup_hrs: 0,
          device_count: 0,
          devices: [],
          psh,
          battery_chemistry: chemistry.id || batteryChemistryId,
          panel_class: panelClass,
          inverter_type: 'HYBRID', inverter_suitable_types: ['HYBRID', 'OFF_GRID'], inverter_phase: 'single',
          charging_mode: chargingModeId,
          has_solar: hasSolar,
        };
      }

      const energy  = this.calcDailyEnergy(devices);
      const peakW   = this.calcPeakLoad(devices);
      const surge   = this.calcSurgeLoad(devices);

      // Backup/night load estimate: a fraction of peak (fridge + fan +
      // lights typical — not every selected device runs simultaneously
      // through the outage), disclosed as CONSTANTS.NIGHT_LOAD_FACTOR
      // rather than a buried magic number. This is the SAME load figure
      // used both to size the battery below and to report backup_hrs,
      // so the two numbers can never drift apart from each other again.
      const nightLoadW       = peakW * nightLoadFactor;
      const requiredBackupWh = nightLoadW * outageHours;

      // Battery is sized to the customer's actual selected backup period
      // (outageHours, from the Step 4 outage question), not total daily
      // energy — see calcBattery()'s doc comment for why that distinction
      // matters.
      const battery = this.calcBattery(requiredBackupWh, chemistry.dod, voltageV, 0.90, chemistry.efficiency);
      // No PV array in GRID_ONLY mode — skip panel/MPPT sizing entirely
      // rather than computing then hiding it, so array_w_exact/panel_count
      // honestly reflect "no requirement," never a phantom number nobody
      // asked for.
      const panels  = hasSolar
        ? this.calcPanels(energy.adjusted_wh, psh, 0.75, 1.25, panelClass.watts)
        : { array_w: 0, array_w_exact: 0, panel_count: 0 };
      const mpptA   = hasSolar ? this.calcMPPT(panels.array_w, voltageV) : 0;
      const invW    = this.calcInverter(peakW, surge.surge_va);
      const inverterInfo = this.resolveInverterType(invW, chargingModeId);

      // Panel count under every non-legacy class at the SAME target array
      // capacity (array_w doesn't depend on panel wattage — only which
      // class tiles it does) — lets the report show "625W → N panels OR
      // 715W → M panels" instead of pretending only one class exists.
      // MUST divide array_w_exact (the real unrounded PV requirement),
      // not the rounded-to-nearest-100W array_w display value — dividing
      // the rounded figure can silently disagree with panel_count above,
      // which is computed from the same exact requirement.
      const panelAlternatives = hasSolar
        ? panelClasses
            .filter(pc => !pc.legacy)
            .map(pc => ({ id: pc.id, watts: pc.watts, panel_count: Math.max(1, Math.ceil(panels.array_w_exact / pc.watts)) }))
        : [];

      const backupHrs    = this.calcBackupHours(battery.battery_kwh, chemistry.dod, nightLoadW, 0.90, chemistry.efficiency);

      // Sort devices by daily Wh descending for breakdown display
      const sortedDevices = [...devices].sort(
        (a, b) => (b.watts * b.hours * b.qty) - (a.watts * a.hours * a.qty)
      );

      return {
        // Energy
        raw_wh:       energy.raw_wh,
        adjusted_wh:  energy.adjusted_wh,
        monthly_kwh:  energy.monthly_kwh,

        // Load
        peak_w:       peakW,
        surge_va:     surge.surge_va,
        largest_motor:surge.largest_motor_name,

        // Battery
        battery_kwh:  battery.battery_kwh,
        battery_ah:   battery.battery_ah,
        battery_chemistry: chemistry.id || batteryChemistryId,
        outage_hours: outageHours,

        // Panels
        array_w:       panels.array_w,        // rounded to nearest 100W — DISPLAY value
        array_w_exact: panels.array_w_exact,   // unrounded PV requirement — what panel_count/panel_alternatives actually derive from; exposed for auditability
        panel_count:  panels.panel_count,
        panel_class:  panelClass,
        panel_alternatives: panelAlternatives,

        // Controllers
        mppt_a:       mpptA,
        inverter_w:   invW,
        inverter_type:  inverterInfo.type,
        inverter_suitable_types: inverterInfo.suitableTypes,
        inverter_phase: inverterInfo.phase,
        charging_mode: chargingModeId,
        has_solar: hasSolar,

        // Runtime
        backup_hrs:   backupHrs,
        night_load_w: nightLoadW,

        // Meta
        device_count: devices.length,
        devices:      sortedDevices,
        psh,
      };
    },

    /**
     * ROI Calculation.
     * @param {number} systemCostUSD
     * @param {number} dieselMonthly
     * @param {number} genMaintMonthly
     * @param {number} coveragePct
     * @returns {Object} savings breakdown
     */
    calcROI(systemCostUSD, dieselMonthly, genMaintMonthly, coveragePct) {
      const totalMonthlyCost = dieselMonthly + genMaintMonthly;
      const monthlySaving    = Math.round(totalMonthlyCost * coveragePct);
      const yearlySaving     = monthlySaving * 12;
      const saving5yr        = yearlySaving * 5;
      const saving10yr       = yearlySaving * 10;
      const paybackMonths    = monthlySaving > 0
        ? Math.ceil(systemCostUSD / monthlySaving)
        : 999;

      return {
        total_monthly_cost: totalMonthlyCost,
        monthly_saving:     monthlySaving,
        yearly_saving:      yearlySaving,
        saving_5yr:         saving5yr,
        saving_10yr:        saving10yr,
        payback_months:     paybackMonths,
        gen_cost_monthly:   dieselMonthly,
      };
    },

  };
})();

if (typeof window !== 'undefined') window.CalcEngine = CalcEngine;
if (typeof module !== 'undefined') module.exports = CalcEngine;
