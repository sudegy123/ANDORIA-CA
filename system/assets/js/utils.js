/**
 * SOLAR SMART ADVISOR — UTILITIES
 * utils.js
 *
 * Pure helper functions with no dependencies.
 * DOM helpers, formatters, animators.
 */

'use strict';

const Utils = (() => {

  return {

    // ── DOM Helpers ────────────────────────────────────────────────

    /** Get element by id */
    id(id) { return document.getElementById(id); },

    /** Query selector */
    qs(selector, parent = document) { return parent.querySelector(selector); },

    /** Query selector all */
    qsa(selector, parent = document) { return Array.from(parent.querySelectorAll(selector)); },

    /** Set innerHTML safely */
    html(el, html) { if (el) el.innerHTML = html; },

    /** Set text content */
    text(el, txt) { if (el) el.textContent = txt; },

    /**
     * Build the markup for a card's visual — a real Cloudinary photo
     * when one has been confirmed and matched for this category, the
     * existing emoji/icon otherwise. Never used directly with a raw
     * public_id: callers pass through CloudinaryImages.property()/
     * .appliance()/.system() so a missing match always means "render
     * the icon exactly as before," not a guess or a broken image.
     *
     * The <img> carries its own onerror fallback (handleImageFallback
     * below) so a failed load — bad network, deleted asset, wrong
     * id — can never leave a broken-image glyph or blank space; it
     * swaps back to the same emoji icon a null publicId would have
     * rendered in the first place.
     *
     * @param {string} fallbackEmoji - the current emoji/icon glyph
     * @param {string|null} publicId - CloudinaryImages.*() lookup result
     * @param {string} altText - localized alt text for the photo
     * @param {{width?: number, height?: number, wrapClass?: string, iconClass?: string}} [opts]
     * @returns {string} HTML for either an <img> wrap or the plain icon div
     */
    iconOrImage(fallbackEmoji, publicId, altText, opts = {}) {
      const iconClass = opts.iconClass || 'property-icon';
      const iconHtml = `<div class="${iconClass}">${fallbackEmoji}</div>`;
      if (!publicId || typeof CloudinaryImages === 'undefined') return iconHtml;
      const src = CloudinaryImages.url(publicId, opts);
      if (!src) return iconHtml;
      const wrapClass = opts.wrapClass || 'card-image-wrap';
      const safeAlt = String(altText || '').replace(/"/g, '&quot;');
      const safeEmoji = String(fallbackEmoji || '').replace(/'/g, '&#39;');
      return `<div class="${wrapClass}"><img src="${src}" alt="${safeAlt}" loading="lazy" decoding="async" onerror="Utils.handleImageFallback(this, '${safeEmoji}', '${iconClass}')"></div>`;
    },

    /**
     * onerror handler referenced inline by iconOrImage()'s <img> tags.
     * Replaces the failed image's wrapper with the plain icon div, so a
     * broken Cloudinary asset degrades to exactly what a null publicId
     * would have rendered — never a broken-image glyph, never empty
     * space, never a thrown error.
     */
    handleImageFallback(imgEl, fallbackEmoji, iconClass) {
      const wrap = imgEl.closest('.card-image-wrap, .property-image-wrap, .device-image-wrap, .system-image-wrap');
      const target = wrap || imgEl;
      target.outerHTML = `<div class="${iconClass}">${fallbackEmoji}</div>`;
    },

    /** Add class(es) */
    addClass(el, ...classes) { if (el) el.classList.add(...classes); },

    /** Remove class(es) */
    removeClass(el, ...classes) { if (el) el.classList.remove(...classes); },

    /** Toggle class */
    toggleClass(el, cls, force) { if (el) el.classList.toggle(cls, force); },

    /** Has class */
    hasClass(el, cls) { return el ? el.classList.contains(cls) : false; },

    /** Show element (removes 'hidden' class) */
    show(el) { if (el) el.classList.remove('hidden'); },

    /** Hide element (adds 'hidden' class) */
    hide(el) { if (el) el.classList.add('hidden'); },

    /** Toggle visible/hidden */
    toggle(el, condition) { if (el) el.classList.toggle('hidden', !condition); },

    // ── Formatters ─────────────────────────────────────────────────

    /**
     * Format a number with commas (Arabic-friendly).
     * @param {number} n
     * @returns {string}
     */
    fmt(n) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      // Western digits in both languages — every other number in the UI
      // (template literals elsewhere) is Western too, so this keeps the
      // whole app numerically consistent rather than mixing digit systems.
      return Math.round(n).toLocaleString('en-US');
    },

    /**
     * Format Wh: show as kWh if >= 1000.
     * @param {number} wh
     * @returns {string}
     */
    fmtWh(wh) {
      if (wh >= 1000) return (wh / 1000).toFixed(1) + ' kWh';
      return Math.round(wh) + ' Wh';
    },

    /**
     * Format watts.
     * @param {number} w
     * @returns {string}
     */
    fmtW(w) {
      if (w >= 1000) return (w / 1000).toFixed(1) + ' kW';
      return Math.round(w) + ' W';
    },

    /**
     * Format currency.
     * @param {number} usd
     * @returns {string}
     */
    fmtUSD(usd) {
      return '$' + Math.round(usd).toLocaleString();
    },

    /**
     * Format hours for display.
     * @param {number} h
     * @returns {string}
     */
    fmtHours(h) {
      if (h < 1) return Math.round(h * 60) + ' ' + I18n.t('units.minute');
      if (h === 24) return I18n.t('units.allDay');
      return h + ' ' + I18n.t('units.hour');
    },

    // ── Animation ──────────────────────────────────────────────────

    /**
     * Animate a number counting up in an element.
     * @param {string|Element} elOrId - element or its id
     * @param {number} from
     * @param {number} to
     * @param {string} prefix - e.g. '$'
     * @param {string} suffix - e.g. ' kWh'
     * @param {number} durationMs
     */
    countUp(elOrId, from, to, prefix = '', suffix = '', durationMs = 800) {
      const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
      if (!el) return;
      const fps    = 30;
      const frames = Math.max(1, Math.floor(durationMs / (1000 / fps)));
      const step   = (to - from) / frames;
      let   i      = 0;
      const tick = setInterval(() => {
        i++;
        const val = Math.round(from + step * i);
        el.textContent = prefix + val.toLocaleString() + suffix;
        if (i >= frames) {
          el.textContent = prefix + Math.round(to).toLocaleString() + suffix;
          clearInterval(tick);
        }
      }, 1000 / fps);
    },

    /**
     * Animate a progress/fill bar to a target width%.
     * @param {Element} el
     * @param {number} pct - 0-100
     * @param {number} delayMs
     */
    animateBar(el, pct, delayMs = 100) {
      if (!el) return;
      setTimeout(() => { el.style.width = Math.min(100, pct) + '%'; }, delayMs);
    },

    /**
     * Animate SVG arc (stroke-dashoffset).
     * @param {Element} pathEl
     * @param {number} totalLength - stroke-dasharray value
     * @param {number} pct - 0-1 fill fraction
     * @param {number} delayMs
     */
    animateArc(pathEl, totalLength, pct, delayMs = 100) {
      if (!pathEl) return;
      const offset = totalLength * (1 - Math.min(1, pct));
      setTimeout(() => { pathEl.style.strokeDashoffset = offset; }, delayMs);
    },

    // ── Events ─────────────────────────────────────────────────────

    /**
     * Delegate event listener (attach to parent, fire on matching children).
     * @param {Element} parent
     * @param {string} selector
     * @param {string} event
     * @param {Function} handler
     */
    delegate(parent, selector, event, handler) {
      parent.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target && parent.contains(target)) {
          handler(e, target);
        }
      });
    },

    // ── Validation ─────────────────────────────────────────────────

    /**
     * Sudan mobile numbers: 9 digits starting with 9, optionally prefixed
     * with a leading 0 (local dialing) or the 249 country code.
     * @param {string} mobile
     * @returns {boolean}
     */
    isValidSudanMobile(mobile) {
      const digits = (mobile || '').replace(/\D/g, '');
      const local  = digits.replace(/^249/, '').replace(/^0/, '');
      return /^9\d{8}$/.test(local);
    },

    /**
     * Normalize a Sudan mobile number to the bare digits wa.me expects
     * (249 country code, no leading 0, no +).
     * @param {string} mobile
     * @returns {string}
     */
    normalizeSudanMobile(mobile) {
      const digits = (mobile || '').replace(/\D/g, '');
      const local  = digits.replace(/^249/, '').replace(/^0/, '');
      return '249' + local;
    },

    // ── WhatsApp ───────────────────────────────────────────────────

    /**
     * The business WhatsApp number. Prefers the live Company Settings
     * value (get_public_company_info — a narrow anon-safe RPC, since
     * `settings` RLS is staff-only) so staff can update it from the CRM
     * without a code deploy; falls back to BrandConfig's number — the
     * same real, verified ANDORIA number, not a placeholder — if
     * Settings is unreachable. Either path always resolves to a real
     * number, so callers never need a "not configured" state.
     * @returns {Promise<{whatsapp: string, phone: string, name: string}>}
     */
    async getWhatsAppTarget() {
      const fallback = () => {
        const c = BrandConfig.company();
        return { whatsapp: c.whatsapp.replace(/\D/g, ''), phone: c.phone.replace(/\D/g, ''), name: c.name };
      };
      try {
        if (!SupabaseClient.isConfigured) return fallback();
        const { data, error } = await SupabaseClient.get().rpc('get_public_company_info');
        if (error || !data || !data.companyWhatsapp) return fallback();
        return { whatsapp: data.companyWhatsapp, phone: data.companyPhone || data.companyWhatsapp, name: data.companyName || BrandConfig.company().name };
      } catch (e) {
        console.error('[Utils] getWhatsAppTarget RPC failed, using verified fallback number:', e);
        return fallback();
      }
    },

    /**
     * Build a pre-filled WhatsApp URL.
     * @param {string} phone - without +
     * @param {string} message
     * @returns {string}
     */
    buildWhatsAppURL(phone, message) {
      return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    },

    // ── Campaign (limited-slot offer) ───────────────────────────────

    /**
     * Read-only: how many "first N customers" slots remain. Anon-safe
     * RPC — the underlying table has no direct SELECT policy, this is
     * the only way the customer wizard can see the count. Never
     * decrements anything by itself.
     * @param {string} campaignId
     * @returns {Promise<{slotsTotal:number, slotsUsed:number, remaining:number}|null>}
     */
    async getCampaignStatus(campaignId) {
      try {
        if (!SupabaseClient.isConfigured) return null;
        const { data, error } = await SupabaseClient.get().rpc('get_campaign_status', { p_campaign_id: campaignId });
        if (error || !data) return null;
        return data;
      } catch (e) {
        console.error('[Utils] getCampaignStatus failed:', e);
        return null;
      }
    },

    /**
     * Consume exactly one campaign slot for this customer — call ONLY
     * after a real CRM lead was successfully created (never on a bare
     * WhatsApp click or page view). Server-side dedup keys on the
     * customer's phone number, so repeated calls for the same customer
     * (re-navigating, resubmitting, opening WhatsApp again) never
     * consume more than one slot — that's enforced by a unique
     * constraint in Postgres, not client-side state.
     * @param {string} campaignId
     * @param {string} phone - raw phone string, digits extracted server-side
     * @param {string} requestId - the CRM request this claim is tied to
     * @returns {Promise<{claimed:boolean, remaining:number}|null>}
     */
    async claimCampaignSlot(campaignId, phone, requestId) {
      try {
        if (!SupabaseClient.isConfigured) return null;
        const { data, error } = await SupabaseClient.get().rpc('claim_campaign_slot', {
          p_campaign_id: campaignId, p_phone: phone, p_request_id: requestId || null,
        });
        if (error || !data) return null;
        return data;
      } catch (e) {
        console.error('[Utils] claimCampaignSlot failed:', e);
        return null;
      }
    },

    /**
     * Build the structured WhatsApp handoff message — buyer info,
     * recipient info (when buying for family in Sudan), assessment
     * summary, and recommended system, so the Andoria sales team always
     * knows who is paying and who will actually receive the install.
     * @param {Object} state - app state
     * @param {Object} calc - calculation result
     * @param {string} intent - 'engineer' (discuss system, default) or
     *   'invoice' (request quote) — only changes the opening line; every
     *   other section (buyer info, real calculated system, assumptions)
     *   is identical, so sales sees the same real data either way.
     * @returns {string}
     */
    buildWhatsAppMessage(state, calc, intent = 'engineer') {
      calc = calc || {};
      const wa = (k, vars) => I18n.t('whatsapp.' + k, vars);
      const propLabel = I18n.t('steps.property.types.' + state.propertyType) || state.propertyType || '—';
      const shopLabel = state.shopType ? I18n.t('steps.property.shopTypes.' + state.shopType) : '';
      const isFamily  = state.beneficiary === 'family';
      const lang      = I18n.getLang();

      const buyerCountry  = CountryManager.getCountry(state.mobileCountry);
      const buyerLocation = CountryManager.getCountry(state.customerLocation);
      const buyerCountryName = buyerCountry ? (lang === 'en' ? buyerCountry.name_en : buyerCountry.name_ar) : '';
      const buyerLocationName = buyerLocation
        ? (lang === 'en' ? buyerLocation.name_en : buyerLocation.name_ar)
        : (state.customerLocation === 'other' ? I18n.t('steps.profile.locationOther').replace('🌍 ', '') : '—');
      const buyerMobileDisplay = CountryManager.display(state.mobileCountry, state.customerMobile);

      const lines = [
        wa(intent === 'invoice' ? 'greetingInvoice' : 'greetingEngineer'),
        '',
        wa('buyerTitle'),
        `• ${wa('name')}: ${state.customerName || '—'}`,
        `• ${wa('phone')}: ${buyerMobileDisplay}${buyerCountry ? ' (' + buyerCountry.flag + ' ' + buyerCountryName + ')' : ''}`,
        `• ${wa('residence')}: ${buyerLocationName}`,
        `• ${wa('systemFor')}: ${isFamily ? wa('systemForFamily') : wa('systemForMyself')}`,
      ];

      if (isFamily) {
        const recStateName = LocationManager.getStateName(state.recipientStateId) || '—';
        const recCityName  = LocationManager.getCityName(state.recipientStateId, state.recipientCityId) || '—';
        lines.push(
          '',
          wa('recipientTitle'),
          `• ${wa('name')}: ${state.recipientName || '—'}`,
          `• ${wa('phone')}: ${CountryManager.display('sudan', state.recipientMobile)}`,
          `• ${wa('state')}: ${recStateName}`,
          `• ${wa('city')}: ${recCityName}`,
        );
      } else {
        const stateName = LocationManager.getStateName(state.customerStateId) || '—';
        const cityName  = LocationManager.getCityName(state.customerStateId, state.customerCityId) || '—';
        lines.push(
          `• ${wa('state')}: ${stateName}`,
          `• ${wa('city')}: ${cityName}`,
        );
      }

      const appliances = Object.values(state.selectedDevices || {})
        .map(d => `${lang === 'en' ? d.name_en : d.name_ar} ×${d.qty}`)
        .join('، ');
      const chemistryLabel = calc.battery_chemistry ? I18n.t('batteryChemistry.' + calc.battery_chemistry) : '—';
      const inverterTypeLabel = calc.inverter_type ? I18n.t('inverterType.' + calc.inverter_type) : '—';
      const panelWatts = calc.panel_class ? calc.panel_class.watts : '—';
      const chargingModeLabel = calc.charging_mode
        ? I18n.t('steps.recommendation.picker.chargingOptions.' + calc.charging_mode + '.label')
        : '—';
      const panelsLine = calc.has_solar
        ? `${calc.panel_count || '—'} × ${panelWatts}W`
        : wa('noSolarPanels');

      lines.push(
        `• ${wa('propertyType')}: ${propLabel}${shopLabel ? ' — ' + shopLabel : ''}`,
        '',
        wa('summaryTitle'),
        `• ${wa('dailyConsumption')}: ${this.fmtWh(calc.raw_wh || 0)}`,
        `• ${wa('peakLoad')}: ${this.fmtW(calc.peak_w || 0)}`,
        `• ${wa('appliances')}: ${appliances || '—'}`,
        '',
        wa('systemTitle'),
        `• ${wa('panels')}: ${panelsLine}`,
        `• ${wa('battery')}: ${calc.battery_kwh || '—'} kWh (${chemistryLabel})`,
        `• ${wa('chargingMode')}: ${chargingModeLabel}`,
        `• ${wa('inverter')}: ${calc.inverter_w || '—'}W (${inverterTypeLabel})`,
        `• ${wa('backupPeriod')}: ${calc.outage_hours || '—'} ${wa('hours')}`,
        '',
        wa('assumptionsNote'),
        '',
        `${wa('reportLink')}: ${state.pdfLink || wa('reportLinkPending')}`,
        '',
        wa('closing'),
        '',
        '—',
        wa('preparedBy'),
        wa('appName'),
        `${wa('poweredBy')} ${BrandConfig.poweredBy().company}`,
      );
      return lines.join('\n');
    },

    // ── Share ──────────────────────────────────────────────────────

    /**
     * Share result via Web Share API or clipboard fallback.
     * @param {Object} calc
     */
    // ── UTM Capture ────────────────────────────────────────────────
    /**
     * Extract UTM parameters from the current URL query string.
     * Called once on app init and stored in StateManager.
     * @returns {Object} utm parameters
     */
    getUTMParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        utm_term: params.get('utm_term') || '',
        referrer: document.referrer || '',
        landing_page: window.location.pathname || '',
      };
    },

    /**
     * Calculate a lead score (0-100) based on system size and customer type.
     * Higher score = higher priority for sales team.
     * @param {Object} calc - calculation result
     * @param {Object} state - app state
     * @returns {number} score 0-100
     */
    calcLeadScore(calc, state) {
      let score = 0;
      const wh = (calc && calc.raw_wh) || 0;
      // System size scoring (bigger system = higher value customer)
      if (wh > 10000) score += 40;      // >10kWh = large system
      else if (wh > 5000) score += 30;   // 5-10kWh = medium
      else if (wh > 2000) score += 20;   // 2-5kWh = small
      else score += 10;                   // <2kWh = mini
      // Customer type scoring
      const typeScores = { business_owner: 20, farmer: 15, clinic_owner: 25, engineer: 10, home_owner: 10, other: 5 };
      score += typeScores[state.customerType] || 5;
      // Beneficiary scoring (diaspora buying for family = higher intent)
      if (state.beneficiary === 'family') score += 15;
      // Has email = more serious
      if (state.customerEmail) score += 5;
      // Expansion planned = bigger future deal
      if (state.wantsExpansion) score += 5;
      // Package selected = ready to buy
      if (state.selectedPackage) score += 10;
      return Math.min(score, 100);
    },

    shareResult(calc) {
      const s = (k, vars) => I18n.t('share.' + k, vars);
      const panelWatts = calc.panel_class ? calc.panel_class.watts : '—';
      const text = [
        s('resultIntro'),
        `• ${s('consumption')}: ${this.fmtWh(calc.raw_wh)} ${s('perDay')}`,
        `• ${calc.panel_count} ${s('panels', { watts: panelWatts })}`,
        `• ${s('battery')} ${calc.battery_kwh} kWh`,
        `• ${s('backup')} ${calc.backup_hrs} ${s('backupUnit')}`,
      ].join('\n');

      if (navigator.share) {
        navigator.share({ title: s('title'), text })
          .catch(() => {});
      } else {
        navigator.clipboard.writeText(text)
          .then(() => alert(s('copied')))
          .catch(() => alert(text));
      }
    },

    // ── Misc ───────────────────────────────────────────────────────

    /**
     * Debounce a function.
     * @param {Function} fn
     * @param {number} ms
     * @returns {Function}
     */
    debounce(fn, ms = 200) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
      };
    },

    /**
     * Scroll to top of page smoothly.
     */
    scrollTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

})();

if (typeof window !== 'undefined') window.Utils = Utils;
if (typeof module !== 'undefined') module.exports = Utils;
