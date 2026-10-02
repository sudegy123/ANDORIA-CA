/**
 * SOLAR ERP — SETTINGS STORE (Repository layer)
 * settings-store.js
 *
 * The single business-settings row (id=1). Read by any authenticated
 * staff (RLS); written by OWNER/ADMIN/ACCOUNTANT only. Shared location
 * (not crm/) in case a future customer-facing screen needs the company
 * name/logo/currency — same reasoning every other shared store follows.
 */

'use strict';

const SettingsStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  function mapRow(row) {
    return {
      currency: row.currency,
      taxPct: row.tax_pct,
      defaultMarginPct: row.default_margin_pct,
      installationBase: row.default_installation_cost,
      protectionBase: row.protection_base,
      mpptBase: row.mppt_base,
      companyName: row.company_name,
      companyLogoUrl: row.company_logo_url,
      companyAddress: row.company_address,
      companyEmail: row.company_email,
      companyPhone: row.company_phone,
      companyWhatsapp: row.company_whatsapp,
      timezone: row.timezone,
      quotationTemplate: row.quotation_template,
    };
  }

  return {

    /** @returns {Promise<Object|null>} */
    async get() {
      const { data, error } = await client().from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) { console.error('[SettingsStore] get failed:', error); return null; }
      return data ? mapRow(data) : null;
    },

    /**
     * @param {Object} patch - any of companyName/companyLogoUrl/companyAddress/companyEmail/companyPhone/companyWhatsapp/currency/taxPct/timezone/defaultMarginPct/installationBase/protectionBase/mpptBase/quotationTemplate
     * @returns {Promise<Object|null>}
     */
    async update(patch) {
      const data = {};
      if (patch.companyName !== undefined) data.company_name = patch.companyName;
      if (patch.companyLogoUrl !== undefined) data.company_logo_url = patch.companyLogoUrl;
      if (patch.companyAddress !== undefined) data.company_address = patch.companyAddress;
      if (patch.companyEmail !== undefined) data.company_email = patch.companyEmail;
      if (patch.companyPhone !== undefined) data.company_phone = patch.companyPhone;
      if (patch.companyWhatsapp !== undefined) data.company_whatsapp = patch.companyWhatsapp;
      if (patch.currency !== undefined) data.currency = patch.currency;
      if (patch.taxPct !== undefined) data.tax_pct = patch.taxPct;
      if (patch.timezone !== undefined) data.timezone = patch.timezone;
      if (patch.defaultMarginPct !== undefined) data.default_margin_pct = patch.defaultMarginPct;
      if (patch.installationBase !== undefined) data.default_installation_cost = patch.installationBase;
      if (patch.protectionBase !== undefined) data.protection_base = patch.protectionBase;
      if (patch.mpptBase !== undefined) data.mppt_base = patch.mpptBase;
      if (patch.quotationTemplate !== undefined) data.quotation_template = patch.quotationTemplate;

      const { data: row, error } = await client().from('settings').update(data).eq('id', 1).select('*').maybeSingle();
      if (error) { console.error('[SettingsStore] update failed:', error); throw error; }
      return row ? mapRow(row) : null;
    },

  };

})();

if (typeof window !== 'undefined') window.SettingsStore = SettingsStore;
if (typeof module !== 'undefined') module.exports = SettingsStore;
