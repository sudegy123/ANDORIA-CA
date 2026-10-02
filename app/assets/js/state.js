/**
 * SOLAR SMART ADVISOR — STATE MANAGEMENT
 * state.js
 *
 * Single source of truth for all application state.
 * No component reads from or writes to DOM for data storage.
 * All state changes go through setState().
 * State is read-only externally — use getState() and setState().
 */

'use strict';

const StateManager = (() => {

  // ── Initial State ──────────────────────────────────────────────
  const INITIAL_STATE = {
    // Navigation
    currentStep: 1,

    // Step 2 — Customer Profile (collected before the assessment starts;
    // reused throughout: PDF report, WhatsApp handoff, sales lead, personalization)
    customerName:        '',
    mobileCountry:        'sudan',  // country id — see countries.js — drives mobile validation format
    customerMobile:      '',
    customerWhatsapp:    '',
    customerWhatsappSame: true,   // WhatsApp auto-fills from mobile while true
    customerLocation:    '',      // country id (or 'other') — "where do you currently live"
    beneficiary:         null,    // 'myself' | 'family' — who the system is for
    customerStateId:     '',      // buyer's own Sudan state id — relevant when beneficiary === 'myself'
    customerCityId:      '',
    recipientName:       '',      // relevant when beneficiary === 'family'
    recipientMobile:     '',      // always Sudan format — recipient is always in Sudan
    recipientStateId:    '',
    recipientCityId:     '',
    customerType:        null,    // 'home_owner' | 'business_owner' | 'farmer' | 'clinic_owner' | 'engineer' | 'other'
    customerEmail:        '',     // optional

    // Step 3 — Property
    propertyType: null,   // 'house' | 'apartment' | 'shop' | etc.
    shopType:     null,   // 'grocery' | 'pharmacy' | ... — only when propertyType === 'shop'

    // Step 4 — Basic Info
    psh:          5.5,    // peak sun hours — resolved from customerStateId via LocationManager
    outageHours:  8,      // hours of daily outage
    expansion:    false,  // plans to expand (AC, pump, etc.)
    budget:       null,   // selected budget USD or null

    // Step 5 — Devices
    /**
     * selectedDevices: { [deviceId]: { ...deviceData, qty: number, hours: number } }
     */
    selectedDevices: {},
    activeTab: null,      // resolved by DecisionEngine.getDefaultCategory() on first entry to step 5

    // Step 7 — Customer's own panel/battery choice (2026-08-21 product
    // change: the calculator no longer silently decides these — the
    // customer picks explicitly). IDs default to CONSTANTS' pre-2026-08-21
    // defaults so the picker has a sensible starting selection, but
    // panelBatteryUserChosen stays false until the customer actually
    // touches either control — CRM/PDF/WhatsApp can tell "customer chose
    // this" from "this is just the unconfirmed starting default."
    selectedPanelClassId:       null,  // resolved to CONSTANTS.PANEL_CLASS_DEFAULT if still null when needed
    selectedBatteryChemistryId: null,  // resolved to CONSTANTS.BATTERY_CHEMISTRY_DEFAULT if still null when needed
    selectedChargingModeId:     null,  // resolved to CONSTANTS.CHARGING_MODE_DEFAULT if still null when needed
    panelBatteryUserChosen:     false,

    // Step 6-7 — Calculated
    calc: null,           // calculation result object (see calculations.js)

    // Step 8 — Package
    packages: [],          // last-built package array (see recommendations.js) — reused by PDF/CTA
    selectedPackage: 'standard',
    pkgName:     '',
    pkgPrice:    0,
    pkgFeatures: [],

    // Step 9 — Savings (computed in buildSavings)
    savings: null,

    // Step 12 — set once this session has been saved to the CRM (see
    // CRMStore.createRequest, called from buildPayment()) so re-entering
    // the Payment step never creates a duplicate request.
    crmRequestId: null,
  };

  // ── Internal state (not directly accessible) ───────────────────
  let _state = JSON.parse(JSON.stringify(INITIAL_STATE));

  // ── Subscribers (for reactive updates) ────────────────────────
  const _subscribers = [];

  // ── Private: notify subscribers ────────────────────────────────
  function _notify(changedKeys) {
    _subscribers.forEach(fn => fn(_state, changedKeys));
  }

  // ── Public API ─────────────────────────────────────────────────
  return {

    /**
     * Get the full current state (read-only shallow copy).
     * Do not mutate the returned object.
     */
    getState() {
      return Object.assign({}, _state);
    },

    /**
     * Get a single state key.
     * @param {string} key
     */
    get(key) {
      return _state[key];
    },

    /**
     * Update one or more state keys.
     * @param {Object} updates - partial state object
     */
    setState(updates) {
      const changedKeys = Object.keys(updates);
      Object.assign(_state, updates);
      _notify(changedKeys);
    },

    /**
     * Subscribe to state changes.
     * @param {Function} fn - called with (state, changedKeys) on each setState()
     * @returns {Function} unsubscribe function
     */
    subscribe(fn) {
      _subscribers.push(fn);
      return () => {
        const idx = _subscribers.indexOf(fn);
        if (idx > -1) _subscribers.splice(idx, 1);
      };
    },

    /**
     * Reset state to initial values (used by "restart" button).
     */
    reset() {
      _state = JSON.parse(JSON.stringify(INITIAL_STATE));
      _notify(Object.keys(INITIAL_STATE));
    },

    /**
     * Add or update a device in selectedDevices.
     * @param {Object} device - full device object from devices.json
     */
    addDevice(device) {
      const devices = Object.assign({}, _state.selectedDevices);
      devices[device.id] = {
        ...device,
        qty:   1,
        hours: device.default_hours,
      };
      this.setState({ selectedDevices: devices });
    },

    /**
     * Remove a device from selectedDevices.
     * @param {string} deviceId
     */
    removeDevice(deviceId) {
      const devices = Object.assign({}, _state.selectedDevices);
      delete devices[deviceId];
      this.setState({ selectedDevices: devices });
    },

    /**
     * Update quantity or hours for a selected device.
     * @param {string} deviceId
     * @param {Object} updates - { qty?, hours? }
     */
    updateDevice(deviceId, updates) {
      if (!_state.selectedDevices[deviceId]) return;
      const devices = Object.assign({}, _state.selectedDevices);
      devices[deviceId] = Object.assign({}, devices[deviceId], updates);
      // Clamp values
      if (devices[deviceId].qty < 1) devices[deviceId].qty = 1;
      if (devices[deviceId].hours < 0.25) devices[deviceId].hours = 0.25;
      if (devices[deviceId].hours > 24) devices[deviceId].hours = 24;
      this.setState({ selectedDevices: devices });
    },

    /**
     * Toggle a device on/off.
     * @param {Object} device
     */
    toggleDevice(device) {
      if (_state.selectedDevices[device.id]) {
        this.removeDevice(device.id);
      } else {
        this.addDevice(device);
      }
    },

    /**
     * Check if a device is selected.
     * @param {string} deviceId
     * @returns {boolean}
     */
    isDeviceSelected(deviceId) {
      return !!_state.selectedDevices[deviceId];
    },

    /**
     * Get list of selected devices as an array.
     * @returns {Array}
     */
    getSelectedDevices() {
      return Object.values(_state.selectedDevices);
    },

    /**
     * Get count of selected devices.
     * @returns {number}
     */
    getDeviceCount() {
      return Object.keys(_state.selectedDevices).length;
    },
  };

})();

// Global export
if (typeof window !== 'undefined') window.StateManager = StateManager;
if (typeof module !== 'undefined') module.exports = StateManager;
