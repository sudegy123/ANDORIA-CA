/**
 * SOLAR SMART ADVISOR — CONSTANTS
 * constants.js
 *
 * All fixed values used across the application.
 * Change here, changes everywhere.
 * Never hardcode these values in other files.
 */

'use strict';

const CONSTANTS = Object.freeze({

  // ── Solar Engineering ──────────────────────────────────────────
  PSH_DEFAULT:        5.5,   // Peak sun hours — Khartoum conservative average
  SYSTEM_EFFICIENCY:  0.75,  // Panels→load efficiency (wiring, MPPT, conversion)
  SAFETY_MARGIN:      1.25,  // 25% overhead for clouds, dust, degradation
  WIRE_LOSS_FACTOR:   1.15,  // 15% extra for wiring/conversion losses on load calc

  BATT_VOLTAGE:       48,    // System voltage (48V recommended for >1kWh)

  // NOT used by battery sizing (calculations.js run()) as of 2026-08-20 —
  // that formula previously multiplied the customer's TOTAL daily energy
  // by this fixed day-count, which silently ignored their actual Step 4
  // outage-hours answer and produced a battery disconnected from their
  // real backup need. Battery sizing now targets requiredBackupWh =
  // NIGHT_LOAD_FACTOR × peak_w × the customer's selected outageHours.
  // Left defined (not deleted) in case a future multi-day cloudy-weather
  // autonomy feature wants it — do not re-wire this into battery sizing
  // without also asking the customer, or the same bug returns.
  AUTONOMY_DAYS:      1.2,

  BATT_TEMP_DERATING: 0.90,  // Sudan heat derating factor for battery capacity
  PANEL_TEMP_DERATING:0.90,  // Panel output derating for high ambient temps
  NIGHT_LOAD_FACTOR:  0.50,  // Assumed backup-period load as a fraction of
                             // peak load (fridge + fan + lights typical —
                             // not every selected device runs at once
                             // through an outage). Drives both battery
                             // sizing and the reported backup_hrs, so the
                             // two can never show inconsistent numbers.

  // ── Battery Chemistry Classes ───────────────────────────────────
  // Product-strategy pivot (2026-08): brand-agnostic technical RANGES,
  // researched from public 2026 manufacturer/technical sources (Renogy,
  // LiTime, EcoFlow LiFePO4 guides; SolaX/PVEducation/NAZ Solar Electric
  // lead-acid & GEL guides) — never one vendor's exact datasheet. Values
  // are the midpoint of each researched range, used for sizing math; the
  // full range is kept alongside for the report/CRM to display honestly
  // as "typical for this chemistry," not a promised number.
  //   Lithium (LiFePO4): 80–90% DoD, 95–98% round-trip efficiency.
  //   Lead-Acid (flooded): ≤50% DoD, ~80–85% round-trip efficiency.
  //   GEL (VRLA): 50–70% DoD (80% max, not used routinely), ~80–85% eff.
  // customerSelectable: true on every chemistry here — the customer
  // picks one explicitly in Step 7 (see PANEL_CLASSES' same pattern);
  // BATTERY_CHEMISTRY_DEFAULT is only the picker's pre-selected radio,
  // never an auto-decision the customer wasn't shown.
  BATTERY_CHEMISTRY: {
    LITHIUM: {
      id: 'LITHIUM', cellVoltage: 3.2,
      dod: 0.85, dodRange: [0.80, 0.90],
      efficiency: 0.965, efficiencyRange: [0.95, 0.98],
      cycleLifeRange: [2000, 6000],
      customerSelectable: true,
    },
    LEAD_ACID: {
      id: 'LEAD_ACID', cellVoltage: 2.0,
      dod: 0.50, dodRange: [0.40, 0.50],
      efficiency: 0.825, efficiencyRange: [0.80, 0.85],
      cycleLifeRange: [500, 1000],
      customerSelectable: true,
    },
    GEL: {
      id: 'GEL', cellVoltage: 2.0,
      dod: 0.60, dodRange: [0.50, 0.70],
      efficiency: 0.825, efficiencyRange: [0.80, 0.85],
      cycleLifeRange: [1200, 2000],
      customerSelectable: true,
    },
  },
  BATTERY_CHEMISTRY_DEFAULT: 'LITHIUM',

  // ── Solar Panel Wattage Classes ─────────────────────────────────
  // Researched ranges (2026-08 refresh), each range built from multiple
  // manufacturers' public datasheets, not one vendor's exact numbers:
  //   310W (added 2026-08-26, older/budget tier still common in Sudan
  //     stock): Canadian Solar CS3K-310MS, REC310TP2M TwinPeak2 (mono),
  //     KF310P-24 (poly) public datasheets — this class spans both mono
  //     and poly cell technology, hence the wider efficiency range.
  //   400W (added 2026-08-26): Trina Vertex 400W, a generic 66-cell
  //     mono datasheet (20.12% eff.), Rich Solar MEGA 400 public
  //     datasheets — also spans a few distinct cell-count designs.
  //   550W/585W: Canadian Solar CS7L / Trina Vertex N public technical
  //     guides — kept as smaller/legacy tiers.
  //   590W (added 2026-08-21, customer-reported new Sudan-market
  //     availability): JA Solar 590W Bifacial, Waaree Bi-53-590,
  //     JinkoSolar JKM590-610N-78HL4-BDV, Phono Solar PS590M8GF-24
  //     public datasheets.
  //   625W: Qcells Q.TRON XL-G2.3/BFG 625, JA Solar JAM66D45-625/LB,
  //     Jinko Solar 625W public datasheets.
  //   715W: Trina Solar Vertex N TSM-NEG21C.20 (705-725W bin) public
  //     datasheet, efficiency cross-checked against a second 710W-class
  //     module (Waaree BiN-03-710, 23.05%). One scraped Isc figure that
  //     was physically inconsistent with its own Imp was discarded
  //     rather than encoded.
  // The calculator sizes on rated Wp; Voc/Vmp/Isc/Imp/efficiency ranges
  // are shown as "typical for this class," never promised as exact.
  // 585W is a legacy/compatibility tier — still selectable, never the
  // default. All seven classes below are customer-choosable (see
  // customerSelectable) — the customer picks one explicitly in Step 7;
  // nothing here is auto-decided for them.
  PANEL_CLASSES: [
    { id: 'W310', watts: 310, vocRange: [39.7, 45.2], vmpRange: [32.9, 37.1], iscRange: [9.0, 10.0], impRange: [8.4, 9.4], efficiencyRange: [17.0, 19.0], legacy: true, customerSelectable: true },
    { id: 'W400', watts: 400, vocRange: [37.1, 50.0], vmpRange: [31.0, 41.0], iscRange: [10.5, 13.7], impRange: [9.8, 12.9], efficiencyRange: [20.0, 21.1], customerSelectable: true },
    { id: 'W550', watts: 550, vocRange: [49.0, 50.0], vmpRange: [41.0, 42.0], iscRange: [13.9, 14.1], impRange: [13.2, 13.4], efficiencyRange: [21.0, 21.5], customerSelectable: true },
    { id: 'W585', watts: 585, vocRange: [51.9, 52.5], vmpRange: [43.6, 44.1], iscRange: [13.9, 14.2], impRange: [13.0, 13.3], efficiencyRange: [21.5, 22.3], legacy: true, customerSelectable: true },
    { id: 'W590', watts: 590, vocRange: [53.3, 54.8], vmpRange: [44.8, 45.4], iscRange: [13.7, 13.9], impRange: [13.0, 13.2], efficiencyRange: [20.9, 22.9], bifacialCommon: true, customerSelectable: true },
    { id: 'W625', watts: 625, vocRange: [48.7, 57.2], vmpRange: [40.4, 47.7], iscRange: [13.8, 16.2], impRange: [13.2, 15.5], efficiencyRange: [22.3, 22.5], technology: 'TOPCON', bifacialCommon: true, customerSelectable: true },
    { id: 'W715', watts: 715, vocRange: [45.0, 49.5], vmpRange: [38.0, 41.5], iscRange: [20.0, 21.5], impRange: [17.4, 18.8], efficiencyRange: [22.6, 23.5], technology: 'TOPCON', bifacialCommon: true, customerSelectable: true },
  ],
  PANEL_CLASS_DEFAULT: 'W625', // pre-selected in the Step 7 picker until the customer changes it — a starting point, not an auto-decision

  // ── Inverter Types ───────────────────────────────────────────────
  // OFF_GRID/HYBRID both require a battery bank, which this advisor
  // always sizes for backup power — so both are technically suitable
  // and CalcEngine.resolveInverterType() exposes both as suitableTypes,
  // with HYBRID as the default recommendation (flexes with Sudan's
  // present-but-unreliable grid). ON_GRID (no battery) exists in the
  // schema for completeness but is never suitable for this calculator's
  // battery-backed sizing.
  INVERTER_TYPES: {
    OFF_GRID: { id: 'OFF_GRID', requiresBattery: true },
    HYBRID:   { id: 'HYBRID', requiresBattery: true },
    ON_GRID:  { id: 'ON_GRID', requiresBattery: false },
  },
  INVERTER_SINGLE_PHASE_MAX_W: 10000, // above this, recommend three-phase

  // ── Charging Architecture ─────────────────────────────────────────
  // Customer-facing charging preference (revised 2026-08-27). Three
  // real, technically honest configurations — not three invented ones:
  //   SOLAR_GRID — solar is the main charge source, hybrid inverter can
  //     also draw from the grid when needed. hasSolar: true.
  //   SOLAR_ONLY — battery charged from solar alone, off-grid inverter,
  //     no grid connection. hasSolar: true.
  //   GRID_ONLY  — battery charged from the public grid, NO solar array
  //     at all. This is a completely standard hybrid-inverter
  //     configuration run with its PV input simply unconnected — not an
  //     invented capability. Because there is no array, panel sizing
  //     (array_w/array_w_exact/panel_count/panel_alternatives/mppt_a) is
  //     skipped entirely by CalcEngine.run() whenever hasSolar is false;
  //     see the `has_solar` flag on its return value and the panel-
  //     picker visibility logic in app.js's buildPanelBatteryPicker().
  // inverterType maps to CalcEngine.resolveInverterType()'s output —
  // SOLAR_GRID and GRID_ONLY both need a HYBRID inverter (the only type
  // in this schema with a grid-charging input); SOLAR_ONLY needs OFF_GRID.
  CHARGING_MODES: {
    SOLAR_GRID: { id: 'SOLAR_GRID', inverterType: 'HYBRID', hasSolar: true, customerSelectable: true },
    SOLAR_ONLY: { id: 'SOLAR_ONLY', inverterType: 'OFF_GRID', hasSolar: true, customerSelectable: true },
    GRID_ONLY:  { id: 'GRID_ONLY', inverterType: 'HYBRID', hasSolar: false, customerSelectable: true },
  },
  CHARGING_MODE_DEFAULT: 'SOLAR_GRID',

  // ── Panel Sizing ───────────────────────────────────────────────
  MPPT_SAFETY_FACTOR:  1.25, // MPPT current safety multiplier

  // ── Inverter Standard Sizes (W) ───────────────────────────────
  INVERTER_SIZES: [1000, 1500, 2000, 3000, 3500, 5000, 6000, 8000, 10000],

  // ── MPPT Standard Sizes (A) ───────────────────────────────────
  MPPT_SIZES: [20, 30, 40, 50, 60, 80, 100],

  // ── Diesel Fuel Savings (2026-08-20) ─────────────────────────────
  // Diesel price: ANDORIA-provided business figure — $6.50 per US
  // gallon (2026-08-20) — NOT a scraped market price, and NOT a
  // per-liter figure. This supersedes an earlier per-liter estimate
  // that was sourced externally (GlobalPetrolPrices.com); the business
  // figure is authoritative and must not be silently replaced again.
  // The per-liter price is DERIVED here (never hand-typed as a second
  // number) so the gallon price and the liter price can never drift
  // apart from each other.
  DIESEL_PRICE_USD_PER_GALLON: 6.50,
  LITERS_PER_US_GALLON: 3.785411784,
  DIESEL_PRICE_USD_PER_LITER: 6.50 / 3.785411784, // ≈ $1.7171/L
  DIESEL_PRICE_SOURCE: 'ANDORIA business-provided price: $6.50 per US gallon (2026-08-20)',

  // Generator fuel burn per kWh delivered: industry sources converge on
  // 0.2–0.3 L/kWh for diesel gensets at typical load (dieselgeneratortech.com,
  // waltpower.com, asogenset.com, generatorsource.com); 0.25 is the
  // commonly-cited midpoint, used here as a disclosed assumption, not a
  // measured figure for any specific generator model.
  GENERATOR_FUEL_L_PER_KWH: 0.25,

  // A solar+battery system typically offsets most, not all, generator
  // use (cloudy days, maintenance windows, etc.) — this is why the
  // savings language must say "reduces fuel cost," never "eliminates
  // it entirely."
  SOLAR_COVERAGE_PCT: 0.88,

  // ── Marketing Campaign ────────────────────────────────────────────
  CAMPAIGN_ID: 'first_100_install', // matches the id row in Supabase public.campaign_slots

  // ── Trust Indicator (DEMO ONLY) ───────────────────────────────────
  // NOT real analytics — there is no backend event stream counting
  // concurrent users. This exists only so a developer/demo build can
  // show a plausible-looking "live activity" number without it EVER
  // being wired to production as if it were real. Production customer
  // UI must use the honest, non-numeric readiness copy instead (see
  // i18n trust.* keys) — do not import DEMO_ACTIVITY_* into any
  // customer-facing render path.
  DEMO_ACTIVITY_MIN: 933,
  DEMO_ACTIVITY_MAX: 1023,

  // ── UI ─────────────────────────────────────────────────────────
  TOTAL_STEPS:     11,  // Wizard steps (excluding welcome = step 1)
  MAX_LOAD_WH:   20000, // Max Wh shown on live meter (100% fill)
  ANIMATE_COUNT_MS: 800, // Duration for number count-up animations

  // Company contact/brand data lives in brand-config.json / BrandConfig —
  // never here. See assets/js/brand-config.js.
  //
  // Every display label (property types, shop types, customer types, free
  // services) lives in i18n/ar.json + i18n/en.json — see assets/js/i18n.js.
  // Nothing bilingual belongs in this file.

});

// Export for module usage (ES5 compatible global)
if (typeof module !== 'undefined') module.exports = CONSTANTS;
