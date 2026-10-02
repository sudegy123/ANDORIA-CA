/**
 * SOLAR SMART ADVISOR — BRAND CONFIG
 * brand-config.js
 *
 * Mirrors data/brand-config.json (same embedded-data pattern as
 * devices.js/devices.json — zero build step, works offline).
 *
 * This is the ONLY place phone numbers, WhatsApp links, email, and
 * website should ever be written literally. Every component that needs
 * to show or link to a contact channel reads it from here — never a
 * string in a template, never a fallback placeholder baked into markup.
 */

'use strict';

const BrandConfig = (() => {

  const CONFIG = {
    company: {
      name:         'Andoria Diesel Engines & Solar Solutions',
      nameAr:       'أندوريا لمحركات الديزل وحلول الطاقة الشمسية',
      // The legal/heritage entity ANDORIA's solar business operates
      // under — a distinct fact from the ANDORIA brand itself, shown as
      // a small trust signal near the logo and the final CTA, never
      // larger than the main ANDORIA wordmark.
      legalName:    'Lotfy Hassan Mousa Business',
      legalNameAr:  'أعمال لطفي حسن موسى',
      heritageYear: 1978,
      phone:        '+249123679129',
      whatsapp:     '+249123679129',
      whatsappLink: 'https://wa.me/249123679129',
      email:        'info@andoriasudan.com',
      website:      'https://andoriasudan.com',
      // Official ANDORIA Facebook page — the exact URL the client
      // provided. Never invent a different one, never point elsewhere.
      facebook:     'https://www.facebook.com/andoria.sudan/?locale=ar_AR',
    },
    poweredBy: {
      company:      'Sudegy Digital Marketing Agency',
      whatsapp:     '+13439883711',
      whatsappLink: 'https://wa.me/13439883711',
    },
  };

  return {
    /** Andoria's own contact/brand data. */
    company() {
      return CONFIG.company;
    },

    /** The Sudegy credit line — company name + WhatsApp link. */
    poweredBy() {
      return CONFIG.poweredBy;
    },
  };

})();

if (typeof window !== 'undefined') window.BrandConfig = BrandConfig;
if (typeof module !== 'undefined') module.exports = BrandConfig;
