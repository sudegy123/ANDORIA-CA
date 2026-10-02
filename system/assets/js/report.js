/**
 * ANDORIA CRM — SALES REPORT
 * report.js
 *
 * Builds the formatted WhatsApp handoff text (Feature 5) from a request
 * record. Used by both the "Send to <branch> Sales" buttons (opens
 * wa.me with this as the pre-filled message) and "Copy Report" (writes
 * it to the clipboard). Labels come from I18n so the report follows
 * whatever language the CRM is currently in; the customer's own data
 * (name, notes, etc.) is never translated.
 */

'use strict';

const SalesReport = (() => {

  const DIVIDER = '━━━━━━━━━━━━━━';

  /**
   * @param {Object} record - a CRMStore request record
   * @returns {string} the formatted report text
   */
  function build(record) {
    const rt = (k) => I18n.t('crm.report.' + k);

    const maps  = (record.customer.mapsLink || '').trim() || rt('locationNotProvided');
    const notes = (record.notes || '').trim() || rt('noNotes');
    const city  = customerCityLabel(record);
    const whatsappDisplay = record.customer.whatsapp
      ? CountryManager.display(record.customer.mobileCountry, record.customer.whatsapp)
      : '—';

    const lines = [
      '🔋 ' + rt('newSolarRequest'),
      '',
      rt('requestId'),
      record.id,
      '',
      DIVIDER,
      '',
      '👤 ' + rt('customer'),
      '',
      record.customer.name || '—',
      '',
      '📞 ' + rt('phone'),
      '',
      customerPhoneDisplay(record),
      '',
      '💬 ' + rt('whatsapp'),
      '',
      whatsappDisplay,
      '',
      '📧 ' + rt('email'),
      '',
      record.customer.email || '—',
      '',
      DIVIDER,
      '',
      '📍 ' + rt('country'),
      '',
      customerLocationLabel(record),
      '',
      '🏙 ' + rt('city'),
      '',
      city,
      '',
      '🏠 ' + rt('address'),
      '',
      record.customer.address || '—',
      '',
      '📌 ' + rt('googleMaps'),
      '',
      maps,
      '',
      DIVIDER,
      '',
      '⚡ ' + rt('propertyType'),
      '',
      propertyTypeLabel(record),
      '',
      '⚡ ' + rt('monthlyConsumption'),
      '',
      (record.system.monthlyConsumptionKwh || 0) + ' kWh',
      '',
      '☀ ' + rt('recommendedPackage'),
      '',
      packageDisplayName(record),
      '',
      '☀ ' + rt('systemSize'),
      '',
      record.system.systemSize || '—',
      '',
      '🔋 ' + rt('battery'),
      '',
      (record.system.batteryKwh || '—') + ' kWh',
      '',
      '⚙ ' + rt('inverter'),
      '',
      (record.system.inverterW || '—') + ' W',
      '',
      DIVIDER,
      '',
      '💰 ' + rt('estimatedPrice'),
      '',
      Utils.fmtUSD(record.system.packagePrice || 0),
      '',
      DIVIDER,
      '',
      '📝 ' + rt('customerNotes'),
      '',
      notes,
      '',
      DIVIDER,
      '',
      '📅 ' + rt('created'),
      '',
      fmtDate(record.createdAt),
      '',
      DIVIDER,
      '',
      rt('generatedBy'),
    ];

    return lines.join('\n');
  }

  return { build };

})();

if (typeof window !== 'undefined') window.SalesReport = SalesReport;
if (typeof module !== 'undefined') module.exports = SalesReport;
