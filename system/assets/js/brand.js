/**
 * SOLAR SMART ADVISOR — BRAND COMPONENTS
 * brand.js
 *
 * The single source of truth for the Andoria mark and the Sudegy credit
 * line. Four composable pieces, built once and reused everywhere instead
 * of copy-pasted per screen:
 *
 *   logo()   — raw tri-stripe SVG mark
 *   badge()  — logo + "ANDORIA" wordmark, compact lockup for tight chrome
 *   header() — what mounts into the persistent progress bar on every step
 *   footer() — "Powered by Sudegy" + WhatsApp, mounted into the global
 *              footer bar that's present on every screen, welcome included
 *
 * Nothing here reads state — pure markup generators plus one mount()
 * that wires them into the DOM slots app.html declares.
 */

'use strict';

const BrandComponents = (() => {

  /**
   * The Andoria diagonal tri-stripe mark alone (red/orange/gold).
   * @param {number} size - width/height in px
   * @returns {string} SVG markup
   */
  function logo(size = 32) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo-svg" aria-hidden="true">
        <g transform="skewX(-18)">
          <rect x="8"  y="55" width="15" height="28" rx="3" fill="#C1272D"/>
          <rect x="30" y="40" width="15" height="43" rx="3" fill="#E8862E"/>
          <rect x="52" y="18" width="15" height="65" rx="3" fill="#F2B632"/>
        </g>
      </svg>`;
  }

  /**
   * Logo + "ANDORIA" wordmark — the compact lockup used anywhere space
   * is tight (progress bar, PDF header). Always LTR, never mirrored.
   * @param {number} size - logo mark size in px
   * @returns {string}
   */
  function badge(size = 22) {
    return `
      <div class="brand-badge">
        ${logo(size)}
        <span class="brand-badge-word">ANDORIA</span>
      </div>`;
  }

  /**
   * What mounts into #brand-badge-slot inside the persistent progress
   * bar — present on every step except the welcome screen (which already
   * carries the full hero lockup).
   * @returns {string}
   */
  function header() {
    return badge(20);
  }

  /**
   * "Powered by Sudegy" — mounts into #brand-footer, the global fixed
   * footer present on every screen, welcome included. The whole bar is a
   * link straight to Sudegy's WhatsApp; the number itself is never shown
   * as text, only the brand name.
   * @returns {string}
   */
  function footer() {
    const sudegy = BrandConfig.poweredBy();
    const poweredByLabel = (typeof I18n !== 'undefined') ? I18n.t('brand.poweredBy') : 'Powered by';
    return `
      <a class="brand-footer-inner" href="${sudegy.whatsappLink}" target="_blank" rel="noopener" aria-label="${poweredByLabel} ${sudegy.company} — WhatsApp">
        <span class="brand-footer-powered">${poweredByLabel} <b>${sudegy.company}</b></span>
        <span class="brand-footer-icon" aria-hidden="true">💬</span>
      </a>`;
  }

  /** Mount the header badge and global footer into their DOM slots. */
  function mount() {
    const headerSlot = document.getElementById('brand-badge-slot');
    if (headerSlot) headerSlot.innerHTML = header();

    const footerSlot = document.getElementById('brand-footer');
    if (footerSlot) footerSlot.innerHTML = footer();
  }

  return { logo, badge, header, footer, mount };

})();

if (typeof window !== 'undefined') window.BrandComponents = BrandComponents;
if (typeof module !== 'undefined') module.exports = BrandComponents;
