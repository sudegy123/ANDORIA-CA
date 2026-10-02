/**
 * ANDORIA CRM — TOAST
 * toast.js
 *
 * Replaces blocking alert()-for-errors calls with a non-blocking,
 * auto-dismissing notification — the "error state" a polished product
 * needs, without a browser dialog stopping the whole page. Native
 * confirm() stays as-is for actual are-you-sure gates (a destructive
 * action deserves an explicit blocking choice; this is only for
 * one-way notifications).
 */

'use strict';

const Toast = (() => {

  const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  function root() {
    let el = document.getElementById('crm-toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'crm-toast-root';
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type]
   * @param {number} [duration] - ms before auto-dismiss
   */
  function show(message, type = 'info', duration = 4000) {
    const el = document.createElement('div');
    el.className = `crm-toast ${type}`;
    el.innerHTML = `<span class="crm-toast-icon">${ICONS[type] || ICONS.info}</span><span>${message}</span>`;
    root().appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));

    const dismiss = () => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 250);
    };
    setTimeout(dismiss, duration);
    el.addEventListener('click', dismiss);
  }

  return {
    show,
    success: (msg, duration) => show(msg, 'success', duration),
    error:   (msg, duration) => show(msg, 'error', duration),
    warning: (msg, duration) => show(msg, 'warning', duration),
    info:    (msg, duration) => show(msg, 'info', duration),
  };

})();

if (typeof window !== 'undefined') window.Toast = Toast;
if (typeof module !== 'undefined') module.exports = Toast;
