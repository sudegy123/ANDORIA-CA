/**
 * SOLAR ERP — CRM STORE (Repository layer)
 * crm-store.js
 *
 * Phase A: this is now a thin Supabase repository instead of a
 * localStorage store — same public method names the CRM pages and the
 * wizard already call (list/get/createRequest/updateStatus/addNote/
 * updateRequest/subscribe/seedIfEmpty), so no UI code changes, only how
 * each method gets its answer. The one unavoidable difference: every
 * method is now async (a real database is a network call, localStorage
 * never was) — callers use `await`/`.then()` instead of reading a return
 * value synchronously.
 *
 * Writes (createRequest/updateStatus/addNote/updateRequest) go through
 * Postgres RPC functions (supabase/migrations/20260101000006_crm_functions.sql),
 * not direct table writes — that's where the append-only timeline and
 * per-field audit rules are actually enforced, so a bug here can't bypass
 * them. `actor` parameters some call sites still pass are accepted but
 * ignored: the database derives "who did this" from the authenticated
 * session (auth.uid()) server-side, which can't be spoofed the way a
 * client-supplied name string could.
 */

'use strict';

const CRMStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  const _subscribers = [];

  function _notify(requests) {
    _subscribers.forEach((fn) => {
      try { fn(requests); } catch (e) { console.error('[CRMStore] subscriber failed:', e); }
    });
  }

  function mapTimelineEvent(ev) {
    return {
      at: ev.at,
      type: ev.type,
      status: ev.status,
      from: ev.from_status,
      text: ev.note_text,
      action: ev.action,
      field: ev.field,
      before: ev.before_val,
      after: ev.after_val,
      user: ev.event_user,
    };
  }

  function mapRow(row) {
    return {
      id: row.id,
      status: row.status,
      lang: row.lang,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: row.customer,
      recipient: row.recipient,
      property: row.property,
      system: row.system,
      notes: row.notes,
      assignedSales: row.assigned_sales,
      branch: row.branch,
      priority: row.priority,
      leadScore: row.lead_score || 0,
      utmSource: row.utm_source || '',
      utmMedium: row.utm_medium || '',
      utmCampaign: row.utm_campaign || '',
      timeline: (row.timeline_events || [])
        .map(mapTimelineEvent)
        .sort((a, b) => a.at.localeCompare(b.at)),
    };
  }

  const SELECT_WITH_TIMELINE = '*, timeline_events(*)';

  return {

    /**
     * Phase 1/2 used this to load demo data into localStorage on first
     * run. Seeding now happens server-side (supabase/seed.sql) — kept as
     * a no-op so nothing that still calls it breaks.
     */
    async seedIfEmpty() {
      /* no-op — see supabase/seed.sql */
    },

    /** All requests, newest first. */
    async list() {
      const { data, error } = await client()
        .from('requests')
        .select(SELECT_WITH_TIMELINE)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[CRMStore] list failed:', error);
        return [];
      }
      return data.map(mapRow);
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async get(id) {
      const { data, error } = await client()
        .from('requests')
        .select(SELECT_WITH_TIMELINE)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('[CRMStore] get failed:', error);
        return null;
      }
      return data ? mapRow(data) : null;
    },

    /**
     * Build and persist a new Request from a completed wizard session, via
     * the create_request() RPC (public — the anonymous wizard calls this
     * with no staff session).
     * @param {Object} state - StateManager.getState() from the wizard
     * @param {Object} calc - the calculation result
     * @returns {Promise<Object>} the created request record
     */
    async createRequest(state, calc) {
      calc = calc || {};
      const customer = {
        name: state.customerName || '',
        mobileCountry: state.mobileCountry || 'sudan',
        mobile: state.customerMobile || '',
        whatsapp: state.customerWhatsappSame ? state.customerMobile : state.customerWhatsapp,
        location: state.customerLocation || '',
        beneficiary: state.beneficiary || 'myself',
        stateId: state.customerStateId || '',
        cityId: state.customerCityId || '',
        customerType: state.customerType || null,
        email: state.customerEmail || '',
        city: '',
        address: '',
        mapsLink: '',
      };
      const recipient = state.beneficiary === 'family' ? {
        name: state.recipientName || '',
        mobile: state.recipientMobile || '',
        stateId: state.recipientStateId || '',
        cityId: state.recipientCityId || '',
      } : null;
      const property = {
        propertyType: state.propertyType || null,
        shopType: state.shopType || null,
      };
      const system = {
        dailyWh: calc.raw_wh || 0,
        peakW: calc.peak_w || 0,
        // false for the GRID_ONLY charging mode (battery charged from the
        // grid, no PV array at all) — a real, staff-facing distinction so
        // panelCount:0 reads as "no solar in this system," not as a bug.
        hasSolar: !!calc.has_solar,
        panelCount: calc.panel_count || 0,
        panelWatts: (calc.has_solar && calc.panel_class) ? calc.panel_class.watts : null,
        // Real panel class, never a fabricated wattage — create_request()
        // falls back to "{count} panels" (no assumed watts) if this is
        // ever omitted, specifically so the CRM record can never claim a
        // wrong panel size the way it silently did before this field existed.
        systemSize: (calc.panel_count && calc.panel_class)
          ? `${calc.panel_count} × ${calc.panel_class.watts}W`
          : '',
        batteryKwh: calc.battery_kwh || 0,
        batteryChemistry: calc.battery_chemistry || null,
        // true only if the customer actually touched the Step 7 picker;
        // false means panelWatts/batteryChemistry above are still just
        // the picker's unconfirmed starting default — staff should treat
        // that as "not yet reviewed by the customer," not a real choice.
        panelBatteryUserChosen: !!state.panelBatteryUserChosen,
        chargingMode: calc.charging_mode || null,
        outageHours: calc.outage_hours || null,
        inverterW: calc.inverter_w || 0,
        inverterType: calc.inverter_type || null,
        mpptA: calc.mppt_a || 0,
        backupHrs: calc.backup_hrs || 0,
        packageId: state.selectedPackage || null,
        packageName: state.pkgName || '',
        packagePrice: state.pkgPrice || 0,
        leadScore: (typeof Utils !== 'undefined' && Utils.calcLeadScore) ? Utils.calcLeadScore(calc, state) : 0,
        utm: (typeof Utils !== 'undefined' && Utils.getUTMParams) ? Utils.getUTMParams() : {},
      };

      const { data, error } = await client().rpc('create_request', {
        p_lang: (typeof I18n !== 'undefined' && I18n.getLang()) || 'ar',
        p_customer: customer,
        p_recipient: recipient,
        p_property: property,
        p_system: system,
      });
      if (error) {
        console.error('[CRMStore] createRequest failed:', error);
        throw error;
      }
      // Map the RPC's own return value directly — do NOT re-fetch via
      // this.get(): the caller here is the anonymous wizard, which has no
      // SELECT access to `requests` (only the RPC can create; reading is
      // staff-only, see RLS policy requests_select_staff). The RPC already
      // returns the full created row, just without a nested timeline
      // array — fine, since the wizard only ever needs the new id.
      return mapRow(data);
    },

    /**
     * Move a request to a new status via the update_request_status() RPC.
     * @param {string} id
     * @param {string} newStatus
     * @returns {Promise<Object|null>} the updated request
     */
    async updateStatus(id, newStatus) {
      const { error } = await client().rpc('update_request_status', { p_request_id: id, p_new_status: newStatus });
      if (error) {
        console.error('[CRMStore] updateStatus failed:', error);
        return null;
      }
      const record = await this.get(id);
      _notify(await this.list());
      return record;
    },

    /**
     * Append a free-text note to a request's timeline via add_request_note().
     * @param {string} id
     * @param {string} text
     * @returns {Promise<Object|null>} the updated request
     */
    async addNote(id, text) {
      const { error } = await client().rpc('add_request_note', { p_request_id: id, p_text: text });
      if (error) {
        console.error('[CRMStore] addNote failed:', error);
        return null;
      }
      const record = await this.get(id);
      _notify(await this.list());
      return record;
    },

    /**
     * Apply an edit to any tracked field via update_request_fields() — the
     * database diffs and writes one timeline entry per changed field.
     * @param {string} id
     * @param {Object} patch - partial record, e.g. { customer: { name: 'X' }, system: { packagePrice: 1200 } }
     * @returns {Promise<Object|null>} the updated request
     */
    async updateRequest(id, patch) {
      const { error } = await client().rpc('update_request_fields', { p_request_id: id, p_patch: patch });
      if (error) {
        console.error('[CRMStore] updateRequest failed:', error);
        return null;
      }
      const record = await this.get(id);
      _notify(await this.list());
      return record;
    },

    /**
     * Subscribe to store changes. Unlike the Phase 1/2 localStorage
     * version, this only fires after a write THIS tab made (updateStatus/
     * addNote/updateRequest) — cross-tab/cross-device realtime sync is a
     * later enhancement (Supabase Realtime), not wired yet.
     * @param {Function} fn - called with the full requests array
     * @returns {Function} unsubscribe
     */
    subscribe(fn) {
      _subscribers.push(fn);
      return () => {
        const idx = _subscribers.indexOf(fn);
        if (idx > -1) _subscribers.splice(idx, 1);
      };
    },

  };

})();

if (typeof window !== 'undefined') window.CRMStore = CRMStore;
if (typeof module !== 'undefined') module.exports = CRMStore;
