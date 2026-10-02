/**
 * SOLAR SMART ADVISOR — PERSONALIZATION
 * personalization.js
 *
 * From the customer profile step onward, the advisor should speak to the
 * customer directly ("أستاذ محمد، بناءً على استهلاك منزلك..." / "Ahmed,
 * this is the right system for your farm") instead of generic copy. This
 * module owns the two pieces that combine into that, in both languages:
 *   - an honorific chosen from customerType (المهندس/Eng. — الدكتور/Dr. — الأستاذ/Mr.)
 *   - a possessive noun for whatever they're wiring up (منزلك/house — مزرعتك/farm — ...)
 * Pure functions only — no DOM, no state reads. Callers pass in the values.
 * Templates themselves live in i18n/*.json, not here — this module only
 * resolves the two variables a template plugs in.
 */

'use strict';

const PersonalizationEngine = (() => {

  const TITLES = {
    ar: {
      home_owner: 'الأستاذ', business_owner: 'الأستاذ', farmer: 'الأستاذ',
      clinic_owner: 'الدكتور', engineer: 'المهندس', other: 'الأستاذ',
    },
    en: {
      home_owner: 'Mr.', business_owner: 'Mr.', farmer: 'Mr.',
      clinic_owner: 'Dr.', engineer: 'Eng.', other: 'Mr.',
    },
  };

  // Arabic values already carry the "your" possessive suffix (منزلك = "your
  // house"); English values are bare nouns because every template that
  // uses {place} supplies "your" itself ("...right system for your {place}").
  const POSSESSIVE = {
    ar: {
      house: 'منزلك', apartment: 'شقتك', shop: 'محلك', office: 'مكتبك',
      farm: 'مزرعتك', clinic: 'عيادتك', school: 'مدرستك', mosque: 'مسجدكم', workshop: 'ورشتك',
    },
    en: {
      house: 'house', apartment: 'apartment', shop: 'shop', office: 'office',
      farm: 'farm', clinic: 'clinic', school: 'school', mosque: 'mosque', workshop: 'workshop',
    },
  };

  function lang() {
    return (typeof I18n !== 'undefined') ? I18n.getLang() : 'ar';
  }

  /**
   * First name only — salutations use "title + first name", not the
   * full name, in both languages.
   * @param {string} fullName
   * @returns {string}
   */
  function firstName(fullName) {
    if (!fullName) return '';
    return fullName.trim().split(/\s+/)[0];
  }

  /**
   * "الدكتور أحمد" / "Dr. Ahmed" — honorific + first name.
   * @param {string} customerType
   * @param {string} fullName
   * @returns {string}
   */
  function salutation(customerType, fullName) {
    const titles = TITLES[lang()] || TITLES.ar;
    const title = titles[customerType] || titles.other;
    const name = firstName(fullName);
    return name ? `${title} ${name}` : title;
  }

  /**
   * "منزلك" / "farm" — the possessive noun for their property, in the
   * current language's convention (see POSSESSIVE comment above).
   * @param {string} propertyType
   * @returns {string}
   */
  function possessive(propertyType) {
    const map = POSSESSIVE[lang()] || POSSESSIVE.ar;
    return map[propertyType] || (lang() === 'en' ? 'place' : 'مكانك');
  }

  /**
   * Fill a "{name}"/"{place}" template with the resolved salutation and
   * possessive noun.
   * @param {Object} ctx
   * @param {string} ctx.customerType
   * @param {string} ctx.fullName
   * @param {string} ctx.propertyType
   * @param {string} template
   * @returns {string}
   */
  function greet(ctx, template) {
    return template
      .replace('{name}', salutation(ctx.customerType, ctx.fullName))
      .replace('{place}', possessive(ctx.propertyType));
  }

  return { firstName, salutation, possessive, greet };

})();

if (typeof window !== 'undefined') window.PersonalizationEngine = PersonalizationEngine;
if (typeof module !== 'undefined') module.exports = PersonalizationEngine;
