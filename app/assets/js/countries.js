/**
 * SOLAR SMART ADVISOR — COUNTRIES
 * countries.js
 *
 * International phone-country data for the diaspora customer base —
 * Sudanese buyers living abroad who are purchasing for family back home.
 * Each entry carries a validation pattern for its national mobile number
 * format, so we never force the Sudan-only shape onto an Egyptian or
 * Canadian number again.
 */

'use strict';

const CountryManager = (() => {

  const COUNTRIES = [
    { id: 'sudan',   dial: '249', flag: '🇸🇩', name_ar: 'السودان',   name_en: 'Sudan',                pattern: /^9\d{8}$/,     example: '9XXXXXXXX' },
    { id: 'egypt',   dial: '20',  flag: '🇪🇬', name_ar: 'مصر',       name_en: 'Egypt',                pattern: /^1\d{9}$/,     example: '1XXXXXXXXX' },
    { id: 'saudi',   dial: '966', flag: '🇸🇦', name_ar: 'السعودية',  name_en: 'Saudi Arabia',         pattern: /^5\d{8}$/,     example: '5XXXXXXXX' },
    { id: 'uae',     dial: '971', flag: '🇦🇪', name_ar: 'الإمارات',  name_en: 'United Arab Emirates', pattern: /^5\d{8}$/,     example: '5XXXXXXXX' },
    { id: 'qatar',   dial: '974', flag: '🇶🇦', name_ar: 'قطر',       name_en: 'Qatar',                pattern: /^[3567]\d{7}$/, example: '3XXXXXXX' },
    { id: 'kuwait',  dial: '965', flag: '🇰🇼', name_ar: 'الكويت',    name_en: 'Kuwait',               pattern: /^[569]\d{7}$/,  example: '5XXXXXXX' },
    { id: 'bahrain', dial: '973', flag: '🇧🇭', name_ar: 'البحرين',   name_en: 'Bahrain',              pattern: /^[36]\d{7}$/,   example: '3XXXXXXX' },
    { id: 'oman',    dial: '968', flag: '🇴🇲', name_ar: 'عُمان',     name_en: 'Oman',                 pattern: /^[79]\d{7}$/,   example: '9XXXXXXX' },
    { id: 'canada',  dial: '1',   flag: '🇨🇦', name_ar: 'كندا',      name_en: 'Canada',               pattern: /^\d{10}$/,      example: 'XXXXXXXXXX' },
  ];

  const _byId = {};
  COUNTRIES.forEach(c => { _byId[c.id] = c; });

  /** All supported countries, in display order. */
  function getCountries() {
    return COUNTRIES;
  }

  /** A single country record by id. */
  function getCountry(id) {
    return _byId[id] || null;
  }

  /**
   * Strip a raw phone string down to the national number: drop everything
   * non-digit, drop a duplicated dial code if the user typed it, drop a
   * leading trunk 0.
   * @param {string} countryId
   * @param {string} raw
   * @returns {string}
   */
  function localDigits(countryId, raw) {
    const c = _byId[countryId];
    if (!c) return '';
    let digits = (raw || '').replace(/\D/g, '');
    if (digits.startsWith(c.dial)) digits = digits.slice(c.dial.length);
    digits = digits.replace(/^0+/, '');
    return digits;
  }

  /**
   * Validate a mobile number against the selected country's pattern.
   * @param {string} countryId
   * @param {string} raw
   * @returns {boolean}
   */
  function isValid(countryId, raw) {
    const c = _byId[countryId];
    if (!c) return false;
    return c.pattern.test(localDigits(countryId, raw));
  }

  /**
   * Full E.164-style digit string (dial code + national number, no "+",
   * no leading 0) — what wa.me links and outgoing messages want.
   * @param {string} countryId
   * @param {string} raw
   * @returns {string}
   */
  function toE164(countryId, raw) {
    const c = _byId[countryId];
    if (!c) return (raw || '').replace(/\D/g, '');
    return c.dial + localDigits(countryId, raw);
  }

  /**
   * Human-readable "+<dial> <number>" for display in messages/PDF.
   * @param {string} countryId
   * @param {string} raw
   * @returns {string}
   */
  function display(countryId, raw) {
    const c = _byId[countryId];
    if (!c) return raw || '—';
    return `+${c.dial} ${localDigits(countryId, raw)}`;
  }

  return { getCountries, getCountry, localDigits, isValid, toE164, display };

})();

if (typeof window !== 'undefined') window.CountryManager = CountryManager;
if (typeof module !== 'undefined') module.exports = CountryManager;
