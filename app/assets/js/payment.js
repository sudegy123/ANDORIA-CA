/**
 * SOLAR SMART ADVISOR — PAYMENT
 * payment.js
 *
 * Mirrors data/payment-config.json (same embedded-data pattern as
 * devices.js/devices.json). Owns Stripe configuration state and the
 * currency-formatting architecture — it does NOT process any card data
 * itself. Real card entry must go through Stripe Checkout or the Stripe
 * Payment Element once a publishable key is configured; this file never
 * touches raw card numbers and never talks to a secret key (secret keys
 * belong on a server, never in this static, zero-build-step frontend).
 */

'use strict';

const PaymentManager = (() => {

  const CONFIG = {
    provider: 'stripe',
    publishableKey: '', // intentionally empty — see data/payment-config.json
    currency: 'USD',
    country: 'US',
    paymentMethods: ['card', 'apple_pay', 'google_pay'],
    supportedCurrencies: {
      USD: { symbol: '$',    name: 'US Dollar' },
      SDG: { symbol: 'ج.س',  name: 'Sudanese Pound' },
      SAR: { symbol: 'ر.س',  name: 'Saudi Riyal' },
      EGP: { symbol: 'ج.م',  name: 'Egyptian Pound' },
      CAD: { symbol: '$',    name: 'Canadian Dollar' },
    },
  };

  /** Raw config object. */
  function getConfig() {
    return CONFIG;
  }

  /** True once a real Stripe publishable key has been dropped into config. */
  function isConfigured() {
    return !!CONFIG.publishableKey;
  }

  /**
   * Format a USD amount for display in a given currency. Today every
   * price in the app is computed and stored in USD; this only re-labels
   * it — no FX conversion table exists yet, so non-USD output is not
   * yet numerically accurate. The signature is deliberately currency-
   * aware now so wiring in real conversion rates later touches this one
   * function, not every call site across the codebase.
   * @param {number} amountUSD
   * @param {string} [currencyCode] - defaults to CONFIG.currency
   * @returns {string}
   */
  function formatPrice(amountUSD, currencyCode) {
    const code = currencyCode || CONFIG.currency;
    const c = CONFIG.supportedCurrencies[code] || CONFIG.supportedCurrencies.USD;
    return `${c.symbol}${Math.round(amountUSD).toLocaleString()}`;
  }

  /**
   * A human-readable order reference for the (currently dormant) payment
   * success screen. Not a database id — just a display-friendly stamp.
   * @returns {string}
   */
  function generateOrderNumber() {
    const stamp = Date.now().toString(36).toUpperCase().slice(-6);
    return `AND-${stamp}`;
  }

  /**
   * Initializes the payment gateway (Stripe or PayMob).
   * Note: The actual transaction must happen server-side via Supabase Edge Functions.
   * This function mounts the UI frame or redirects to the PayMob iframe.
   */
  async function mountPaymentElement(amount, orderId, email, phone) {
    if (CONFIG.provider === 'paymob') {
      // Future PayMob Integration:
      // 1. Call Supabase Edge Function to get PayMob payment key
      // 2. Redirect to PayMob iframe: https://accept.paymob.com/api/acceptance/iframes/{{iframe_id}}?payment_token={{token}}
      console.log('Redirecting to PayMob gateway for order:', orderId);
      return { status: 'pending_redirect' };
    } else {
      if (!isConfigured()) {
        console.warn('Payment gateway is not configured. Falling back to cash/whatsapp flow.');
        return { status: 'cash_fallback' };
      }
      throw new Error('PaymentManager.mountPaymentElement() requires a server-side Edge Function to mint PaymentIntents.');
    }
  }

  return { getConfig, isConfigured, formatPrice, generateOrderNumber, mountPaymentElement };

})();

if (typeof window !== 'undefined') window.PaymentManager = PaymentManager;
if (typeof module !== 'undefined') module.exports = PaymentManager;
