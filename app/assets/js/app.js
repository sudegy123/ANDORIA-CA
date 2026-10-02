/**
 * SOLAR SMART ADVISOR — MAIN APPLICATION
 * app.js
 *
 * Orchestrates all modules.
 * Owns the event handlers and step rendering functions.
 * Imports: StateManager, Router, CalcEngine, DeviceManager,
 *          RecommendationsEngine, Charts, Utils, CONSTANTS
 */

'use strict';

// ── App Init ───────────────────────────────────────────────────────

/**
 * Populate the two Sudan state <select>s (buyer + recipient) in the
 * current language, preserving whatever was already selected. Re-run on
 * every language change — <option> text doesn't update itself the way
 * [data-i18n] nodes do.
 */
function populateStateDropdowns() {
  const placeholderKey = {
    'cust-state-select':      'steps.profile.statePlaceholder',
    'recipient-state-select': 'steps.profile.recipientStatePlaceholder',
  };
  Object.keys(placeholderKey).forEach(id => {
    const sel = Utils.id(id);
    if (!sel) return;
    const prevValue = sel.value;
    sel.innerHTML = `<option value="">${I18n.t(placeholderKey[id])}</option>`;
    LocationManager.getStates().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = LocationManager.getStateName(s.id);
      sel.appendChild(opt);
    });
    sel.value = prevValue;
  });

  // If a state is already chosen, its city dropdown needs relabeling too —
  // fillCitySelect() rebuilds it in the current language.
  const custState = Utils.id('cust-state-select');
  if (custState && custState.value) {
    const prevCity = Utils.id('cust-city-select')?.value;
    fillCitySelect(Utils.id('cust-city-select'), custState.value);
    if (Utils.id('cust-city-select')) Utils.id('cust-city-select').value = prevCity || '';
  }
  const recState = Utils.id('recipient-state-select');
  if (recState && recState.value) {
    const prevCity = Utils.id('recipient-city-select')?.value;
    fillCitySelect(Utils.id('recipient-city-select'), recState.value);
    if (Utils.id('recipient-city-select')) Utils.id('recipient-city-select').value = prevCity || '';
  }
}

/**
 * Populate the mobile country-code select and "where do you live" select
 * in the current language. Re-run on every language change.
 */
function populateCountryDropdowns() {
  const mobileCountrySelect = Utils.id('cust-mobile-country');
  const locationSelect      = Utils.id('cust-location-select');
  const prevMobileCountry   = mobileCountrySelect ? mobileCountrySelect.value : null;
  const prevLocation        = locationSelect ? locationSelect.value : null;

  if (mobileCountrySelect) mobileCountrySelect.innerHTML = '';
  if (locationSelect) locationSelect.innerHTML = `<option value="">${I18n.t('steps.profile.locationPlaceholder')}</option>`;

  CountryManager.getCountries().forEach(c => {
    if (mobileCountrySelect) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.flag} +${c.dial}`;
      mobileCountrySelect.appendChild(opt);
    }
    if (locationSelect) {
      const opt2 = document.createElement('option');
      opt2.value = c.id;
      opt2.textContent = `${c.flag} ${I18n.getLang() === 'en' ? c.name_en : c.name_ar}`;
      locationSelect.appendChild(opt2);
    }
  });
  if (locationSelect) {
    const other = document.createElement('option');
    other.value = 'other';
    other.textContent = I18n.t('steps.profile.locationOther');
    locationSelect.appendChild(other);
  }

  if (mobileCountrySelect) mobileCountrySelect.value = prevMobileCountry || 'sudan';
  if (locationSelect) locationSelect.value = prevLocation || '';
}

/**
 * Every dynamically-built (JS template string) screen re-renders itself
 * here whenever the language changes — this is what makes the switch
 * instant everywhere, not just on static labels. Re-populating a
 * <select> that isn't currently relevant is harmless, so this doesn't
 * need to be clever about which step is active for the dropdowns; the
 * step-specific builders are re-run only for the step actually on screen.
 */
function rebuildForLanguageChange() {
  populateStateDropdowns();
  populateCountryDropdowns();

  // pkgName/pkgFeatures were frozen in whatever language was active when
  // the package was selected — re-derive them so Order Review/Payment/PDF/
  // WhatsApp on later steps show the new language even without revisiting
  // the Packages step.
  const selectedId = StateManager.get('selectedPackage');
  const calc = StateManager.get('calc');
  if (selectedId && calc) {
    // Re-derive display text (name/features) in the new language from
    // whichever source produced the original list — never re-match or
    // re-fetch, or the customer could see a different set of packages
    // than the one they actually chose from.
    //
    // Guarded: neither matchedPackages nor livePricing is ever written to
    // state anywhere in this codebase yet (both are always undefined), so
    // this always falls through to the CONSTANTS.PRICE/PACKAGE_MULTIPLIERS
    // fallback below — constants that don't exist in constants.js (its
    // "Pricing (mock)" block is missing; supabase/migrations/2026...
    // _live_pricing.sql's own comment confirms it used to be there). That
    // combination throws on every language switch once selectedId+calc are
    // both set (selectedPackage defaults to 'standard', so this is not an
    // edge case — it fires as soon as a customer reaches Step 7+ and taps
    // the language switcher). Never fabricate real $ pricing constants
    // here — fail closed instead: leave the previously-computed pkgName/
    // pkgPrice/pkgFeatures exactly as they were rather than crash. Once a
    // real catalog/live-pricing source is wired up to state, this starts
    // re-deriving correctly with no further change needed.
    try {
      const matched = StateManager.get('matchedPackages');
      let pkgs;
      if (matched) {
        pkgs = RecommendationsEngine.buildFromCatalog(matched);
      } else {
        const live = StateManager.get('livePricing') || { prices: CONSTANTS.PRICE, multipliers: CONSTANTS.PACKAGE_MULTIPLIERS };
        if (!live.prices || !live.multipliers) throw new Error('no pricing source available yet');
        pkgs = RecommendationsEngine.buildPackages(calc, StateManager.getState(), { PRICE: live.prices, PACKAGE_MULTIPLIERS: live.multipliers });
      }
      const pkg = pkgs.find(p => p.id === selectedId);
      if (pkg) {
        StateManager.setState({ packages: pkgs, pkgName: pkg.name_ar, pkgPrice: pkg.price, pkgFeatures: pkg.features });
      }
    } catch (err) {
      console.warn('[rebuildForLanguageChange] could not re-derive package pricing text, keeping previous values:', err.message);
    }
  }

  const step = StateManager.get('currentStep');
  switch (step) {
    case 5: {
      // Language change mid-step — re-render in place, don't yank the
      // customer back to the category picker if they're inside one.
      renderDeviceCategoryGrid();
      const activeTab = StateManager.get('activeTab');
      const inCategory = !Utils.id('device-list-view')?.classList.contains('hidden');
      if (inCategory && activeTab) renderDeviceGrid(activeTab);
      updateLoadMeter();
      break;
    }
    case 6: buildSummary(); break;
    case 7: buildRecommendation(); break;
    case 8: buildPackages(); break;
    case 9: buildSavings(); break;
    case 10: buildTrust(); break;
    case 11: buildOrderReview(); break;
    case 12: buildPayment(); break;
  }
}

/** The small "legal entity · since 1978" line under the ANDORIA wordmark on the welcome hero. */
function renderWelcomeHeritage() {
  const el = Utils.id('welcome-brand-heritage');
  if (!el || typeof BrandConfig === 'undefined') return;
  const c = BrandConfig.company();
  const legalName = I18n.getLang() === 'en' ? c.legalName : c.legalNameAr;
  el.textContent = `${legalName} · ${I18n.t('brand.since', { year: c.heritageYear })}`;
}

/**
 * Upgrade each Step 2 property-type card's emoji to a real Cloudinary
 * photo wherever CloudinaryImages.property() has a confirmed match —
 * every category without one keeps its current emoji untouched. Never
 * touches data-type/onclick/IDs, only the small icon node inside each
 * static card. Idempotent/safe to call repeatedly (page load AND every
 * language change, so alt text — read from the already-localized
 * .property-name text — stays in sync).
 *
 * Gated on propertyStepVisited: this is called unconditionally at
 * DOMContentLoaded and on every language change (I18n.onChange below),
 * neither of which means the customer has actually reached the
 * property-type step yet. Without this guard, all 9 property photos
 * (each several MB, no on-the-fly resizing on this CDN) would start
 * downloading the moment the welcome screen loads — competing for
 * bandwidth with the welcome hero/offer photos the customer is actually
 * looking at. onStepEnter's case 3 flips the flag the first time the
 * step is actually entered; every call before that is a harmless no-op.
 */
let propertyStepVisited = false;
function upgradePropertyCardImages() {
  if (!propertyStepVisited) return;
  if (typeof CloudinaryImages === 'undefined') return;
  Utils.qsa('#property-grid .property-card[data-type]').forEach((card) => {
    const nameEl = card.querySelector('.property-name');
    const altText = nameEl ? nameEl.textContent : '';
    const existingImg = card.querySelector('.property-image-wrap img');
    if (existingImg) {
      if (altText) existingImg.alt = altText; // keep alt text current on language change
      return;
    }
    const publicId = CloudinaryImages.property(card.dataset.type);
    if (!publicId) return; // no confirmed asset yet — keep the emoji as-is
    const iconEl = card.querySelector('.property-icon');
    if (!iconEl) return;
    iconEl.outerHTML = Utils.iconOrImage(iconEl.textContent, publicId, altText, {
      width: 220, height: 165, wrapClass: 'property-image-wrap', iconClass: 'property-icon',
    });
  });
}

/**
 * Same photo swap as upgradePropertyCardImages(), but for the shop-type
 * sub-grid (#shop-type-grid, only shown once "stores" is picked). These
 * are small local files under assets/images/shop-types/ rather than
 * Cloudinary uploads, so Utils.iconOrImage() is called with a plain
 * relative src instead of a Cloudinary publicId lookup.
 */
function upgradeShopTypeCardImages() {
  Utils.qsa('#shop-type-grid .property-card[data-shop]').forEach((card) => {
    const nameEl = card.querySelector('.property-name');
    const altText = nameEl ? nameEl.textContent : '';
    const existingImg = card.querySelector('.property-image-wrap img');
    if (existingImg) {
      if (altText) existingImg.alt = altText;
      return;
    }
    const iconEl = card.querySelector('.property-icon');
    if (!iconEl) return;
    const src = 'assets/images/shop-types/' + card.dataset.shop + '.jpg';
    const safeAlt = String(altText || '').replace(/"/g, '&quot;');
    const safeEmoji = String(iconEl.textContent || '').replace(/'/g, '&#39;');
    iconEl.outerHTML = `<div class="property-image-wrap"><img src="${src}?v=20260928a" alt="${safeAlt}" loading="lazy" decoding="async" onerror="Utils.handleImageFallback(this, '${safeEmoji}', 'property-icon')"></div>`;
  });
}

/**
 * Let each step's header (eyebrow + title + subtitle) collapse away as
 * the customer scrolls that step's own .step-body, reclaiming vertical
 * space for the actual cards/products on mobile. One listener per
 * .step-shell, attached once at load — .step-header/.step-body are
 * static per-step containers (never re-created), so this can never
 * double-attach or leak. Purely a CSS class toggle; no navigation, IDs,
 * or onclick contracts are touched.
 */
function initStepHeaderCollapse() {
  Utils.qsa('.step-shell').forEach((shell) => {
    const body = shell.querySelector('.step-body');
    if (!body) return;
    body.addEventListener('scroll', () => {
      shell.classList.toggle('scrolled', body.scrollTop > 16);
    }, { passive: true });
  });
}

/** The $30 "Saver Package" CTA on the welcome hero — standalone lead-gen link, never touches StateManager. */
async function renderMiniPackageLink() {
  const link = Utils.id('mini-package-cta');
  if (!link) return;
  const target = await Utils.getWhatsAppTarget();
  link.href = Utils.buildWhatsAppURL(target.whatsapp, I18n.t('miniPackage.waMessage'));
}

/**
 * Global floating action buttons (#fab-group) — fixed across every step,
 * mounted once in static HTML (never re-rendered per step, so they can
 * never be duplicated by navigation). Reuses the SAME WhatsApp
 * target/URL-builder and BrandConfig Facebook URL as everywhere else —
 * no parallel WhatsApp/Facebook logic. The WhatsApp message here is a
 * generic opener (not Utils.buildWhatsAppMessage(state, calc, ...),
 * which assumes a completed profile/calculation that may not exist yet
 * on, say, Step 1).
 */
async function renderFloatingActions() {
  const waLink = Utils.id('fab-whatsapp-link');
  if (waLink) {
    const target = await Utils.getWhatsAppTarget();
    waLink.href = Utils.buildWhatsAppURL(target.whatsapp, I18n.t('floatingActions.whatsappMessage'));
    const waLabel = I18n.t('floatingActions.whatsappLabel');
    waLink.setAttribute('aria-label', waLabel);
    waLink.title = waLabel;
  }

  const fbLink = Utils.id('fab-facebook-link');
  if (fbLink) {
    fbLink.href = BrandConfig.company().facebook;
    const fbLabel = I18n.t('floatingActions.facebookLabel');
    fbLink.setAttribute('aria-label', fbLabel);
    fbLink.title = fbLabel;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Capture UTM parameters on first load
  if (typeof Utils !== 'undefined' && Utils.getUTMParams && !StateManager.get('utm')) {
    StateManager.setState({ utm: Utils.getUTMParams() });
  }

  // Language must initialize before anything else touches the DOM —
  // every other module's first render depends on I18n.getLang().
  I18n.init();
  I18n.onChange(rebuildForLanguageChange);
  I18n.onChange(BrandComponents.mount);
  I18n.onChange(renderWelcomeHeritage);
  I18n.onChange(renderMiniPackageLink);
  I18n.onChange(() => renderOfferCard('welcome-offer-remaining'));
  I18n.onChange(renderFloatingActions);
  I18n.onChange(upgradePropertyCardImages);
  I18n.onChange(upgradeShopTypeCardImages);

  // Mount the reusable brand header badge + global footer (assets/js/brand.js)
  BrandComponents.mount();
  renderWelcomeHeritage();
  renderMiniPackageLink();
  renderOfferCard('welcome-offer-remaining');
  renderFloatingActions();
  upgradePropertyCardImages();
  upgradeShopTypeCardImages();
  initStepHeaderCollapse();

  populateStateDropdowns();
  populateCountryDropdowns();
  refreshProfileValidationUI();

  Utils.id('referral-gate-share-btn')?.addEventListener('click', handleReferralShare);
  Utils.id('referral-gate-close-btn')?.addEventListener('click', hideReferralGate);

  // Hide loading screen
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.classList.add('fade-out');
  }, 1300);
});


// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Navigate to a step.
 * Validates required state before advancing.
 * @param {number} toStep
 */
// ── Referral / Share Gate ────────────────────────────────────────────
// After ~2-3 calculator uses, ask the customer to share the calculator
// before seeing another recommendation. This app has no way to verify
// that a shared link was actually opened by 5 distinct people, so this
// is deliberately a transparent share-ACTION gate (unlocked the moment
// the customer taps Share) — never a fabricated "X/5 joined" counter.
// It never touches StateManager or navigates away, so an in-progress
// calculation is never lost: the gate only blocks entering step 7.
const REFERRAL_USE_COUNT_KEY = 'andoria_calc_use_count';
const REFERRAL_GATE_THRESHOLD = 3;
let _referralPendingStep = null;

function getCalcUseCount() {
  try { return parseInt(localStorage.getItem(REFERRAL_USE_COUNT_KEY), 10) || 0; }
  catch (e) { return 0; }
}

function setCalcUseCount(n) {
  try { localStorage.setItem(REFERRAL_USE_COUNT_KEY, String(n)); }
  catch (e) { /* private mode / storage unavailable — gate simply won't persist */ }
}

function referralGateDue() {
  return getCalcUseCount() + 1 >= REFERRAL_GATE_THRESHOLD;
}

function showReferralGate(pendingStep) {
  _referralPendingStep = pendingStep;
  Utils.id('referral-gate')?.classList.remove('hidden');
}

function hideReferralGate() {
  Utils.id('referral-gate')?.classList.add('hidden');
  _referralPendingStep = null;
}

async function handleReferralShare() {
  const message = I18n.t('referral.shareMessage');
  const url = window.location.href.split('?')[0].split('#')[0];
  const shareText = `${message}\n${url}`;
  try {
    if (navigator.share) {
      await navigator.share({ text: shareText, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
    }
  } catch (e) {
    // Share sheet cancelled/unsupported — still an honest attempt at the
    // gate's one required action, so don't re-trap the customer over it.
  }
  setCalcUseCount(0);
  const pendingStep = _referralPendingStep;
  hideReferralGate();
  if (pendingStep) goToStep(pendingStep);
}

function goToStep(toStep) {
  // ── GA4 Funnel Tracking ──────────────────────────────────────
  if (typeof gtag === 'function') {
    const state = StateManager.getState();
    gtag('event', 'funnel_step', {
      step_number: toStep,
      step_name: {
        1:'welcome',2:'profile',3:'property',4:'basic_info',5:'devices',
        6:'summary',7:'recommendation',8:'packages',9:'savings',
        10:'trust',11:'review',12:'payment'
      }[toStep] || 'unknown',
      property_type: state.propertyType || '',
      customer_type: state.customerType || '',
      beneficiary: state.beneficiary || '',
    });
    // Track key conversion events
    if (toStep === 12) gtag('event', 'generate_lead', { currency: 'USD', value: state.pkgPrice || 0 });
    if (toStep === 5) gtag('event', 'begin_checkout');
  }

  const from = StateManager.get('currentStep');
  if (toStep === from) return;

  // Validation on advance
  if (toStep > from) {
    // Step 2 — Customer Profile. getProfileFieldSpecs() is the single
    // source of truth for every rule, so this gate can never disagree
    // with the inline errors or the button's enabled state. On failure:
    // reveal every unmet field's reason (not just the first), and focus
    // the first invalid one — no alert() interruption.
    if (from === 2) {
      _profileSubmitAttempted = true;
      const { valid, firstInvalidId } = refreshProfileValidationUI();
      if (!valid) {
        if (firstInvalidId) focusFirstInvalidProfileField(firstInvalidId);
        return;
      }
    }

    if (from === 3) {
      const propertyType = StateManager.get('propertyType');
      if (!propertyType) {
        alert(I18n.t('validation.propertyRequired'));
        return;
      }
      if (DecisionEngine.requiresShopType(propertyType) && !StateManager.get('shopType')) {
        alert(I18n.t('validation.shopTypeRequired'));
        return;
      }
    }

    if (toStep === 7 && referralGateDue()) {
      showReferralGate(toStep);
      return;
    }
  }

  Router.goTo(toStep, from, (step) => {
    onStepEnter(step);
  });

  StateManager.setState({ currentStep: toStep });

  if (toStep === 7) {
    setCalcUseCount(getCalcUseCount() + 1);
  }
}

/**
 * Go back one step.
 */
function goBack() {
  const current = StateManager.get('currentStep');
  if (current > 2) goToStep(current - 1);
}

/**
 * Called when a new step is activated — runs step-specific rendering.
 * @param {number} step
 */
function onStepEnter(step) {
  Utils.scrollTop();

  switch (step) {
    case 3:
      propertyStepVisited = true;
      upgradePropertyCardImages();
      break;
    case 5: {
      // Fresh entry into the step (forward from step 4, or back from step
      // 6) always lands on the category picker, never mid-category —
      // selections made earlier are untouched, only the visible view resets.
      renderDeviceCategoryGrid();
      Utils.id('device-category-view')?.classList.remove('hidden');
      Utils.id('device-list-view')?.classList.add('hidden');
      updateLoadMeter();
      break;
    }
    case 6:
      buildSummary();
      break;
    case 7:
      buildRecommendation();
      break;
    case 8:
      buildPackages();
      break;
    case 9:
      buildSavings();
      break;
    case 10:
      buildTrust();
      break;
    case 11:
      buildOrderReview();
      break;
    case 12:
      buildPayment();
      break;
  }
}

/**
 * Restart the wizard from the beginning.
 */
function restartAdvisor() {
  StateManager.reset();
  Router.goTo(1, StateManager.get('currentStep'), null);
  StateManager.setState({ currentStep: 1 });
  Router.updateProgress(1);

  // Reset UI selections
  Utils.qsa('#property-grid .property-card, #shop-type-grid .property-card, #customer-type-grid .cust-type-btn, #beneficiary-grid .beneficiary-btn').forEach(c => c.classList.remove('selected'));
  Utils.id('shop-type-wrap')?.classList.add('hidden');
  Utils.qsa('.choice-btn, .outage-btn').forEach(b => b.classList.remove('selected'));
  Utils.id('expansion-toggle')?.classList.remove('on');

  ['cust-name', 'cust-mobile', 'cust-whatsapp', 'cust-email', 'recipient-name', 'recipient-mobile'].forEach(id => {
    const el = Utils.id(id);
    if (el) el.value = '';
  });
  const mobileCountrySel = Utils.id('cust-mobile-country');
  if (mobileCountrySel) mobileCountrySel.value = 'sudan';
  const locationSel = Utils.id('cust-location-select');
  if (locationSel) locationSel.value = '';

  ['cust-state-select', 'recipient-state-select'].forEach(id => {
    const sel = Utils.id(id);
    if (sel) sel.value = '';
  });
  ['cust-city-select', 'recipient-city-select'].forEach(id => {
    const sel = Utils.id(id);
    if (sel) { sel.innerHTML = `<option value="">${I18n.t('steps.profile.cityPlaceholderNoState')}</option>`; sel.disabled = true; }
  });
  Utils.id('whatsapp-same-toggle')?.classList.add('on');
  Utils.id('whatsapp-manual-wrap')?.classList.add('hidden');
  Utils.id('buyer-location-wrap')?.classList.remove('hidden');
  Utils.id('recipient-wrap')?.classList.add('hidden');

  // Clear inline validation state — a fresh run starts with no fields
  // marked touched and no errors shown, same as first load.
  _profileTouched.clear();
  _profileSubmitAttempted = false;
  Utils.qsa('.field-error.visible').forEach(el => el.classList.remove('visible'));
  Utils.qsa('.form-input.invalid, .form-select.invalid').forEach(el => el.classList.remove('invalid'));
  refreshProfileValidationUI();

  const btn2 = Utils.id('btn-step2');
  if (btn2) { btn2.style.opacity = '0.4'; btn2.style.pointerEvents = 'none'; }
}


// ═══════════════════════════════════════════════════════════════════
// STEP 2 — CUSTOMER PROFILE
// ═══════════════════════════════════════════════════════════════════

/**
 * Populate a Sudan city <select> from a state id, with a shared "pick a
 * state first" placeholder. Used for both the buyer's own and the
 * recipient's state/city pair.
 * @param {Element} citySelect
 * @param {string} stateId
 */
function fillCitySelect(citySelect, stateId) {
  if (!citySelect) return;
  if (!stateId) {
    citySelect.innerHTML = `<option value="">${I18n.t('steps.profile.cityPlaceholderNoState')}</option>`;
    citySelect.disabled = true;
    return;
  }
  const cities = LocationManager.getCities(stateId);
  citySelect.innerHTML = `<option value="">${I18n.t('steps.profile.cityPlaceholder')}</option>` +
    cities.map(c => `<option value="${c.id}">${LocationManager.getCityName(stateId, c.id)}</option>`).join('');
  citySelect.disabled = false;
}

/**
 * Field-level validity specs for step 2 — the single source of truth for
 * which fields are required (recipient fields only apply when
 * beneficiary === 'family'), whether each currently passes, and which
 * i18n key explains a failure. Every other validation entry point
 * (button enable state, inline errors, goToStep's hard gate, the
 * remaining-fields counter) is derived from this one list so they can
 * never disagree with each other.
 * @returns {Array<{id:string, valid:boolean, errorKey:string, errorVars?:Object}>}
 */
function getProfileFieldSpecs() {
  const beneficiary = StateManager.get('beneficiary');
  const specs = [
    {
      id: 'cust-name',
      valid: !!(StateManager.get('customerName') || '').trim(),
      errorKey: 'validation.nameRequired',
    },
    {
      id: 'cust-mobile',
      valid: CountryManager.isValid(StateManager.get('mobileCountry'), StateManager.get('customerMobile') || ''),
      errorKey: 'validation.mobileInvalid',
      errorVars: { example: (CountryManager.getCountry(StateManager.get('mobileCountry')) || {}).example || '9XXXXXXXX' },
    },
    {
      id: 'cust-location-select',
      valid: !!StateManager.get('customerLocation'),
      errorKey: 'validation.locationRequired',
    },
    {
      id: 'beneficiary-grid',
      valid: !!beneficiary,
      errorKey: 'validation.beneficiaryRequired',
    },
  ];

  if (beneficiary === 'myself') {
    specs.push({
      id: 'cust-state-select',
      valid: !!StateManager.get('customerStateId'),
      errorKey: 'validation.stateRequired',
    });
  } else if (beneficiary === 'family') {
    specs.push(
      { id: 'recipient-name', valid: !!(StateManager.get('recipientName') || '').trim(), errorKey: 'validation.recipientNameRequired' },
      { id: 'recipient-mobile', valid: CountryManager.isValid('sudan', StateManager.get('recipientMobile') || ''), errorKey: 'validation.recipientMobileInvalid' },
      { id: 'recipient-state-select', valid: !!StateManager.get('recipientStateId'), errorKey: 'validation.recipientStateRequired' },
    );
  }

  return specs;
}

// Which fields the user has already interacted with (blur/change) — an
// error only renders once its field has been touched, so the form
// doesn't greet a first-time visitor with a wall of red text.
const _profileTouched = new Set();
let _profileSubmitAttempted = false;

/** Mark a field as touched (called on blur for text inputs) and re-render. */
function touchProfileField(fieldId) {
  _profileTouched.add(fieldId);
  refreshProfileValidationUI();
}

/**
 * Re-evaluate every field spec, show/hide each inline error, update the
 * "remaining fields" counter, and enable/disable the Next button.
 * @returns {{valid: boolean, firstInvalidId: string|null}}
 */
function refreshProfileValidationUI() {
  const specs = getProfileFieldSpecs();
  let firstInvalidId = null;
  let invalidCount = 0;

  specs.forEach(spec => {
    if (!spec.valid) {
      invalidCount++;
      if (!firstInvalidId) firstInvalidId = spec.id;
    }
    const shouldShow = !spec.valid && (_profileTouched.has(spec.id) || _profileSubmitAttempted);
    const errEl = Utils.id('err-' + spec.id);
    if (errEl) {
      errEl.textContent = shouldShow ? I18n.t(spec.errorKey, spec.errorVars) : '';
      errEl.classList.toggle('visible', shouldShow);
    }
    const fieldEl = Utils.id(spec.id);
    if (fieldEl && (fieldEl.tagName === 'INPUT' || fieldEl.tagName === 'SELECT')) {
      fieldEl.classList.toggle('invalid', shouldShow);
    }
  });

  const remainEl = Utils.id('remaining-fields');
  if (remainEl) {
    const allDone = invalidCount === 0;
    const wasAllDone = remainEl.classList.contains('all-done');
    remainEl.textContent = allDone
      ? I18n.t('steps.profile.allFieldsComplete')
      : I18n.t('steps.profile.remainingFields', { count: invalidCount });
    remainEl.classList.toggle('all-done', allDone);
    if (allDone && !wasAllDone) {
      remainEl.classList.add('anim-success-pop');
      remainEl.addEventListener('animationend', () => remainEl.classList.remove('anim-success-pop'), { once: true });
    }
  }

  const btn = Utils.id('btn-step-profile');
  const valid = invalidCount === 0;
  if (btn) {
    btn.style.opacity = valid ? '1' : '0.4';
    btn.style.pointerEvents = valid ? 'auto' : 'none';
  }

  return { valid, firstInvalidId };
}

/** Scroll to and focus the first field that failed validation. */
function focusFirstInvalidProfileField(fieldId) {
  const el = Utils.id(fieldId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el.focus(), 250);
}

/** Generic text-field change handler (name / whatsapp-manual / email / recipient name+mobile). */
function onProfileFieldChange() {
  StateManager.setState({
    customerName:     Utils.id('cust-name')?.value  || '',
    customerWhatsapp: StateManager.get('customerWhatsappSame')
      ? StateManager.get('customerMobile')
      : (Utils.id('cust-whatsapp')?.value || ''),
    customerEmail:     Utils.id('cust-email')?.value || '',
    recipientName:     Utils.id('recipient-name')?.value   ?? StateManager.get('recipientName'),
    recipientMobile:   Utils.id('recipient-mobile')?.value ?? StateManager.get('recipientMobile'),
  });
  refreshProfileValidationUI();
}

/** Mobile number changed — also mirrors into WhatsApp when "same" is on. */
function onMobileChange() {
  const mobile = Utils.id('cust-mobile')?.value || '';
  const updates = { customerMobile: mobile };
  if (StateManager.get('customerWhatsappSame')) {
    updates.customerWhatsapp = mobile;
  }
  StateManager.setState(updates);
  refreshProfileValidationUI();
}

/** Mobile country code changed — re-validates against the new country's pattern. */
function onMobileCountryChange(countryId) {
  StateManager.setState({ mobileCountry: countryId });
  _profileTouched.add('cust-mobile');
  refreshProfileValidationUI();
}

/** "WhatsApp same as mobile" toggle. */
function toggleWhatsappSame() {
  const same = !StateManager.get('customerWhatsappSame');
  StateManager.setState({
    customerWhatsappSame: same,
    customerWhatsapp: same ? StateManager.get('customerMobile') : (Utils.id('cust-whatsapp')?.value || ''),
  });
  Utils.id('whatsapp-same-toggle')?.classList.toggle('on', same);
  Utils.toggle(Utils.id('whatsapp-manual-wrap'), !same);
}

/**
 * "Where do you currently live?" — also nudges the mobile country-code
 * selector to match, since most buyers' phone numbers match where they
 * live. The user can still override it manually afterward.
 */
function onCustomerLocationChange(locationId) {
  StateManager.setState({ customerLocation: locationId });
  _profileTouched.add('cust-location-select');

  const mobileCountrySelect = Utils.id('cust-mobile-country');
  if (mobileCountrySelect && CountryManager.getCountry(locationId)) {
    mobileCountrySelect.value = locationId;
    StateManager.setState({ mobileCountry: locationId });
  }
  refreshProfileValidationUI();
}

/**
 * Who the system is for — toggles between the buyer's own Sudan
 * address (myself) and a separate recipient's details (family).
 * @param {Element} el
 */
function selectBeneficiary(el) {
  Utils.qsa('#beneficiary-grid .beneficiary-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const beneficiary = el.dataset.beneficiary;
  StateManager.setState({ beneficiary });
  _profileTouched.add('beneficiary-grid');

  const isFamily = beneficiary === 'family';
  Utils.toggle(Utils.id('buyer-location-wrap'), !isFamily);
  Utils.toggle(Utils.id('recipient-wrap'), isFamily);

  // PSH must always come from wherever the system is actually being
  // installed — the recipient's state when buying for family, the
  // buyer's own state otherwise.
  const psh = isFamily
    ? LocationManager.getPSH(StateManager.get('recipientStateId'))
    : LocationManager.getPSH(StateManager.get('customerStateId'));
  StateManager.setState({ psh });

  refreshProfileValidationUI();
}

/** Buyer's own Sudan state — cascades the city dropdown and resolves PSH
 *  (only when the system is being installed at the buyer's own address). */
function onStateChange(stateId) {
  StateManager.setState({ customerStateId: stateId, customerCityId: '' });
  _profileTouched.add('cust-state-select');
  fillCitySelect(Utils.id('cust-city-select'), stateId);
  if (StateManager.get('beneficiary') !== 'family') {
    StateManager.setState({ psh: LocationManager.getPSH(stateId) });
  }
  refreshProfileValidationUI();
}

function onCityChange(cityId) {
  StateManager.setState({ customerCityId: cityId });
}

/** Recipient's Sudan state (beneficiary = family) — this is the real
 *  install location, so it drives PSH in that mode. */
function onRecipientStateChange(stateId) {
  StateManager.setState({ recipientStateId: stateId, recipientCityId: '' });
  _profileTouched.add('recipient-state-select');
  fillCitySelect(Utils.id('recipient-city-select'), stateId);
  if (StateManager.get('beneficiary') === 'family') {
    StateManager.setState({ psh: LocationManager.getPSH(stateId) });
  }
  refreshProfileValidationUI();
}

function onRecipientCityChange(cityId) {
  StateManager.setState({ recipientCityId: cityId });
}

/** Customer type — drives the honorific used in personalized copy later. */
function selectCustomerType(el) {
  Utils.qsa('#customer-type-grid .cust-type-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  StateManager.setState({ customerType: el.dataset.type });
}


// ═══════════════════════════════════════════════════════════════════
// STEP 3 — PROPERTY TYPE
// ═══════════════════════════════════════════════════════════════════

function selectProperty(el) {
  Utils.qsa('#property-grid .property-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const propertyType = el.dataset.type;
  // Changing property type invalidates any previously-chosen shop type
  // and the device tab the user had open — DecisionEngine recomputes both.
  StateManager.setState({ propertyType, shopType: null, activeTab: null });

  const shopWrap = Utils.id('shop-type-wrap');
  const btn      = Utils.id('btn-step2');

  if (DecisionEngine.requiresShopType(propertyType)) {
    shopWrap?.classList.remove('hidden');
    upgradeShopTypeCardImages();
    Utils.qsa('#shop-type-grid .property-card').forEach(c => c.classList.remove('selected'));
    // Block "next" until a shop type is also chosen
    if (btn) { btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; }
    // Tapping a card that opens the shop-type section should feel exactly
    // like pressing "next" on a real step — the new section is scrolled to
    // sit flush at the top of the step body, not just nudged partway into
    // view, so it reads as its own page rather than extra content below.
    if (shopWrap) {
      requestAnimationFrame(() => {
        shopWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  } else {
    shopWrap?.classList.add('hidden');
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
    // Property types that don't need a shop-type sub-choice are a
    // complete answer for this step on their own — tapping the card IS
    // the "next" action, same as pressing the step's own Next button
    // (goToStep(4)), not just a selection that still needs a separate
    // tap on Next. A short delay lets the .selected highlight actually
    // paint before the step transitions away.
    setTimeout(() => goToStep(4), 220);
  }
}

/**
 * Step 2b — shop vertical (only shown when propertyType === 'shop').
 * @param {Element} el
 */
function selectShopType(el) {
  Utils.qsa('#shop-type-grid .property-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  StateManager.setState({ shopType: el.dataset.shop, activeTab: null });

  const btn = Utils.id('btn-step2');
  if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  // Same as the property-type wheel: picking a shop type here is a
  // complete answer, so tapping it acts as "next" itself.
  setTimeout(() => goToStep(4), 220);
}


// ═══════════════════════════════════════════════════════════════════
// STEP 4 — BASIC INFO
// ═══════════════════════════════════════════════════════════════════
// (PSH now resolves from the customer's state — set in onStateChange()
// during step 2 — rather than a separate city picker here.)

function selectOutage(el) {
  Utils.qsa('.outage-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  StateManager.setState({ outageHours: parseInt(el.dataset.hours) });
}

function toggleExpansion() {
  const newVal = !StateManager.get('expansion');
  StateManager.setState({ expansion: newVal });
  const toggle = Utils.id('expansion-toggle');
  if (toggle) toggle.classList.toggle('on', newVal);
}


// ═══════════════════════════════════════════════════════════════════
// STEP 5 — DEVICES
// ═══════════════════════════════════════════════════════════════════

/**
 * Render the category picker — the landing view of step 5. Each card is
 * an actual category the customer taps into (DecisionEngine-derived for
 * the selected property/shop type), not a filter pill sitting above an
 * always-visible device grid. A small badge shows how many devices are
 * already selected in that category, so browsing between categories
 * doesn't lose track of prior choices.
 */
function renderDeviceCategoryGrid() {
  const propertyType = StateManager.get('propertyType');
  const shopType      = StateManager.get('shopType');
  const categories    = DecisionEngine.getCategories(propertyType, shopType);
  const grid          = Utils.id('device-category-grid');
  if (!grid || !categories.length) return;

  const lang     = I18n.getLang();
  const selected = StateManager.get('selectedDevices');

  Utils.html(grid, categories.map(c => {
    const count = DecisionEngine.getDevices(propertyType, shopType, c.id)
      .filter(d => selected[d.id]).length;
    const name = lang === 'en' ? c.name_en : c.name_ar;
    const safeAlt = String(name || '').replace(/"/g, '&quot;');
    const safeEmoji = String(c.emoji || '').replace(/'/g, '&#39;');
    const media = `<div class="device-image-wrap"><img src="assets/images/device-categories/${c.id}.jpg?v=20260929d" alt="${safeAlt}" loading="eager" decoding="async" fetchpriority="high" draggable="false" ondragstart="return false" onerror="Utils.handleImageFallback(this, '${safeEmoji}', 'device-emoji')"></div>`;
    return `
    <div class="device-card device-cat-card" data-cat="${c.id}" onclick="enterDeviceCategory('${c.id}')">
      <div class="device-card-media">
        ${media}
        ${count > 0 ? `<div class="device-added-badge">${count}</div>` : ''}
      </div>
      <div class="device-card-body">
        <div class="device-name">${name}</div>
      </div>
    </div>`;
  }).join(''));

  // #device-category-grid's innerHTML was just rebuilt, so any previous
  // dial loop is holding stale DOM references — re-init every time,
  // not just once (device-category-dial.js's own init() re-reads the
  // live DOM, so this is always safe to call again).
  if (window.initDeviceCategoryDial) window.initDeviceCategoryDial();
}

/**
 * Enter a category — swap the category picker for that category's real
 * device grid. Selections already made in OTHER categories are untouched;
 * this only changes which grid is visible.
 * @param {string} catId
 */
function enterDeviceCategory(catId) {
  const propertyType = StateManager.get('propertyType');
  const shopType      = StateManager.get('shopType');
  StateManager.setState({ activeTab: catId });

  Utils.id('device-category-view')?.classList.add('hidden');
  const listView = Utils.id('device-list-view');
  listView?.classList.remove('hidden');

  const cat = DecisionEngine.getCategories(propertyType, shopType).find(c => c.id === catId);
  const lang = I18n.getLang();
  const backLabel = Utils.id('device-back-label');
  if (backLabel && cat) backLabel.textContent = lang === 'en' ? cat.name_en : cat.name_ar;

  renderDeviceGrid(catId);

  // Same "lands like its own page" treatment used for the shop-type
  // sub-grid in step 3 — flush to the top of the step body, not a partial
  // nudge, so entering a category reads as a real navigation.
  if (listView) {
    requestAnimationFrame(() => {
      listView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

/** Leave the current category's device grid and return to the category picker. */
function exitDeviceCategory() {
  Utils.id('device-list-view')?.classList.add('hidden');
  const catView = Utils.id('device-category-view');
  catView?.classList.remove('hidden');
  renderDeviceCategoryGrid(); // refresh the per-category selected-count badges
  if (catView) {
    requestAnimationFrame(() => {
      catView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

/**
 * Render the device grid for a category, filtered to the current
 * propertyType/shopType by DecisionEngine — never the raw unfiltered
 * category list.
 * @param {string} cat
 */
function renderDeviceGrid(cat) {
  const grid          = Utils.id('device-grid');
  const propertyType   = StateManager.get('propertyType');
  const shopType       = StateManager.get('shopType');
  const devices        = DecisionEngine.getDevices(propertyType, shopType, cat);
  const quickIds       = DecisionEngine.getQuickSelection(propertyType, shopType);
  const selected       = StateManager.get('selectedDevices');

  if (!grid) return;

  const lang = I18n.getLang();
  const qtyLabel   = I18n.t('steps.devices.qtyLabel');
  const hoursLabel = I18n.t('steps.devices.hoursLabel');
  const addedBadge = I18n.t('steps.devices.addedBadge');

  if (devices.length === 0) {
    Utils.html(grid, `
      <div class="device-empty col-full">
        <div class="device-empty-icon">🔌</div>
        <div>${I18n.t('steps.devices.emptyState')}</div>
      </div>`);
  } else {
  Utils.html(grid, devices.map(d => {
    const isAdded = !!selected[d.id];
    const qty     = isAdded ? selected[d.id].qty   : 1;
    const hrs     = isAdded ? selected[d.id].hours : d.default_hours;
    const isQuick = quickIds.includes(d.id);
    const name    = lang === 'en' ? (d.name_en || d.name_ar) : d.name_ar;

    return `
    <div class="device-card ${isAdded ? 'added' : ''}" id="dcard-${d.id}" onclick="toggleDevice('${d.id}', '${cat}')">
      <div class="device-card-media">
        ${Utils.iconOrImage(d.emoji || '⚡', CloudinaryImages.appliance(d.id), name, { width: 220, height: 160, wrapClass: 'device-image-wrap', iconClass: 'device-emoji' })}
        <div class="device-added-badge">${addedBadge}</div>
      </div>
      <div class="device-card-body">
        <div class="device-name">${isQuick ? '⭐ ' : ''}${name}</div>
        <div class="device-watts">${d.watts} W</div>
      </div>
      <div class="device-controls" onclick="event.stopPropagation()">
        <div class="device-ctrl-row">
          <span class="device-ctrl-label">${qtyLabel}</span>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeQty('${d.id}', -1)">−</button>
            <span class="qty-val" id="qty-${d.id}">${qty}</span>
            <button class="qty-btn" onclick="changeQty('${d.id}', 1)">+</button>
          </div>
        </div>
        <div class="device-ctrl-row">
          <span class="device-ctrl-label">${hoursLabel}</span>
          <span class="hours-val" id="hval-${d.id}">${Utils.fmtHours(hrs)}</span>
        </div>
        <input type="range" class="hours-slider"
          min="0.25" max="24" step="0.25" value="${hrs}"
          oninput="changeHours('${d.id}', this.value)">
        <div class="device-daily-energy" id="dwh-${d.id}">${I18n.t('steps.devices.deviceDailyEnergy', { wh: Utils.fmtWh(d.watts * hrs * qty) })}</div>
        ${isAdded ? `<button type="button" class="device-remove-btn" onclick="toggleDevice('${d.id}', '${cat}')">✕ ${I18n.t('steps.devices.removeBtn')}</button>` : ''}
      </div>
    </div>`;
  }).join(''));
  }

  // Show motor warning if any motor loads selected
  const motorWarn = Utils.id('motor-warning');
  if (motorWarn) {
    const hasMotors = DeviceManager.hasMotorLoads(selected);
    motorWarn.classList.toggle('visible', hasMotors);
  }
}

/**
 * Toggle a device on/off.
 * @param {string} deviceId
 * @param {string} cat
 */
function toggleDevice(deviceId, cat) {
  const device = DeviceManager.getById(deviceId);
  if (!device) return;
  const wasAdded = !!StateManager.get('selectedDevices')[deviceId];
  StateManager.toggleDevice(device);
  renderDeviceGrid(cat);
  updateLoadMeter();

  if (!wasAdded) {
    const cardEl = Utils.id('dcard-' + deviceId);
    if (cardEl) {
      cardEl.classList.add('anim-success-pop');
      cardEl.addEventListener('animationend', () => cardEl.classList.remove('anim-success-pop'), { once: true });
    }
  }
}

/**
 * Change quantity for a device.
 * @param {string} deviceId
 * @param {number} delta
 */
function changeQty(deviceId, delta) {
  const sel = StateManager.get('selectedDevices');
  if (!sel[deviceId]) return;
  const newQty = Math.max(1, sel[deviceId].qty + delta);
  StateManager.updateDevice(deviceId, { qty: newQty });
  const el = Utils.id('qty-' + deviceId);
  if (el) el.textContent = newQty;
  updateDeviceDailyEnergyDisplay(deviceId);
  updateLoadMeter();
}

/**
 * Change usage hours for a device.
 * @param {string} deviceId
 * @param {number|string} val
 */
function changeHours(deviceId, val) {
  const hours = parseFloat(val);
  StateManager.updateDevice(deviceId, { hours });
  const el = Utils.id('hval-' + deviceId);
  if (el) el.textContent = Utils.fmtHours(hours);
  updateDeviceDailyEnergyDisplay(deviceId);
  updateLoadMeter();
}

/**
 * Recompute and redraw one device card's "≈ X daily" line — so the
 * customer sees the effect of a qty/hours change immediately, without
 * ever having to multiply watts × hours × qty themselves.
 * @param {string} deviceId
 */
function updateDeviceDailyEnergyDisplay(deviceId) {
  const device = StateManager.get('selectedDevices')[deviceId];
  const el = Utils.id('dwh-' + deviceId);
  if (!device || !el) return;
  el.textContent = I18n.t('steps.devices.deviceDailyEnergy', { wh: Utils.fmtWh(device.watts * device.hours * device.qty) });
}

/**
 * Every CalcEngine.run() call site must pass the customer's real answers
 * (psh from their location, outageHours from Step 4, and — since
 * 2026-08-21 — their own explicit panel-class/battery-chemistry choice
 * from Step 7) — a single helper so no call site can silently fall back
 * to defaults instead of what the customer actually selected. If the
 * customer hasn't opened the picker yet, this resolves to CONSTANTS'
 * defaults purely as a starting point for the picker UI to render — not
 * a decision made on the customer's behalf.
 * @returns {{psh: number, outageHours: number, panelClassId: string, batteryChemistryId: string}}
 */
function calcOptions() {
  return {
    psh:                StateManager.get('psh') || 5.5,
    outageHours:        StateManager.get('outageHours') || 8,
    panelClassId:       StateManager.get('selectedPanelClassId') || CONSTANTS.PANEL_CLASS_DEFAULT,
    batteryChemistryId: StateManager.get('selectedBatteryChemistryId') || CONSTANTS.BATTERY_CHEMISTRY_DEFAULT,
    chargingModeId:     StateManager.get('selectedChargingModeId') || CONSTANTS.CHARGING_MODE_DEFAULT,
  };
}

/**
 * Update the live load meter bar.
 */
function updateLoadMeter() {
  const devices = StateManager.getSelectedDevices();
  const calc    = CalcEngine.run(devices, calcOptions());
  Charts.updateLoadMeter(calc.raw_wh);
  Utils.text(Utils.id('load-peak-val'), Utils.fmtW(calc.peak_w));

  // Update button label
  const btnTxt = Utils.id('btn-devices-txt');
  const count  = StateManager.getDeviceCount();
  if (btnTxt) {
    btnTxt.textContent = count > 0 ? I18n.t('steps.devices.calcButtonCount', { count }) : I18n.t('steps.devices.calcButton');
  }
}


// ═══════════════════════════════════════════════════════════════════
// STEP 6 — CONSUMPTION SUMMARY
// ═══════════════════════════════════════════════════════════════════

function buildSummary() {
  const devices = StateManager.getSelectedDevices();
  const calc    = CalcEngine.run(devices, calcOptions());
  StateManager.setState({ calc });

  // Personalized subtitle — "يا أستاذ محمد، بناءً على استهلاك منزلك"
  Utils.text(Utils.id('sum-subtitle'), PersonalizationEngine.greet(
    { customerType: StateManager.get('customerType'), fullName: StateManager.get('customerName'), propertyType: StateManager.get('propertyType') },
    I18n.t('steps.summary.subtitleGreeting')
  ));

  // Arc chart
  Charts.updateArc(calc.raw_wh);

  // KPI cards
  Utils.html(Utils.id('kpi-daily'),   `${Utils.fmtWh(calc.raw_wh)}`);
  Utils.html(Utils.id('kpi-peak'),    `${Utils.fmtW(calc.peak_w)}`);
  Utils.html(Utils.id('kpi-surge'),   `${Utils.fmt(calc.surge_va)} VA`);
  Utils.html(Utils.id('kpi-monthly'), `${calc.monthly_kwh} kWh`);

  // Device breakdown
  Utils.html(
    Utils.id('breakdown-list'),
    Charts.renderBreakdown(calc.devices, calc.raw_wh)
  );
}


// ═══════════════════════════════════════════════════════════════════
// STEP 7 — TECHNICAL RECOMMENDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * The four core system components (panels/battery/inverter/MPPT) with
 * their specs — shared by the on-screen recommendation step and the
 * PDF report so the two never drift apart.
 * @param {Object} calc
 * @returns {Array}
 */
function getSystemComponents(calc) {
  const psh = StateManager.get('psh') || 5.5;
  const components = [];

  // GRID_ONLY has no PV array — an honest "no solar panels" card replaces
  // the panel spec (never "0 × 625W", which would read as a bug), and the
  // MPPT controller card is skipped entirely (nothing to control).
  if (calc.has_solar) {
    components.push({
      key:   'panel',
      icon:  '☀️',
      title: I18n.t('steps.recommendation.panels.title'),
      spec:  I18n.t('steps.recommendation.panels.spec', { count: calc.panel_count, watts: (calc.panel_class && calc.panel_class.watts) || '' }),
      why:   I18n.t('steps.recommendation.panels.why', { arrayW: calc.array_w, psh }),
    });
  } else {
    components.push({
      key:   'noSolar',
      icon:  '🔌',
      title: I18n.t('steps.recommendation.noSolar.title'),
      spec:  I18n.t('steps.recommendation.noSolar.spec'),
      why:   I18n.t('steps.recommendation.noSolar.why'),
    });
  }

  components.push({
    key:   'battery',
    icon:  '🔋',
    title: I18n.t('steps.recommendation.battery.title', { chemistry: I18n.t('batteryChemistry.' + calc.battery_chemistry) }),
    spec:  I18n.t('steps.recommendation.battery.spec', { kwh: calc.battery_kwh, ah: calc.battery_ah }),
    why:   I18n.t('steps.recommendation.battery.why', { backupHrs: calc.backup_hrs }),
  });
  components.push({
    key:   'inverter',
    icon:  '⚡',
    title: I18n.t('steps.recommendation.inverter.title', { type: I18n.t('inverterType.' + calc.inverter_type) }),
    spec:  I18n.t('steps.recommendation.inverter.spec', { watts: calc.inverter_w }),
    why:   I18n.t('steps.recommendation.inverter.why', { peakW: calc.peak_w, surgeVA: calc.surge_va }),
  });

  if (calc.has_solar) {
    components.push({
      key:   'controller',
      icon:  '🔌',
      title: I18n.t('steps.recommendation.mppt.title'),
      spec:  I18n.t('steps.recommendation.mppt.spec', { amps: calc.mppt_a }),
      why:   I18n.t('steps.recommendation.mppt.why'),
    });
  }

  return components;
}

/**
 * How much weight to give this recommendation, based on how many devices
 * the customer actually specified — more devices analyzed means the load
 * profile (and therefore the sizing) is more representative of real usage.
 * @param {Object} calc
 * @returns {'high'|'good'|'fair'}
 */
function getConfidenceLevel(calc) {
  const n = calc.device_count || 0;
  if (n >= 6) return 'high';
  if (n >= 3) return 'good';
  return 'fair';
}

/**
 * Customer picks the panel class explicitly — this calculator never
 * decides it for them (2026-08-21 product change). Recomputes and
 * re-renders the whole step live; the customer's appliance selections
 * are untouched, since only the panel/battery pickers write to state
 * here.
 * @param {string} id - a CONSTANTS.PANEL_CLASSES id, e.g. 'W625'
 */
function selectPanelClass(id) {
  StateManager.setState({ selectedPanelClassId: id, panelBatteryUserChosen: true });
  buildRecommendation();
}

/**
 * Customer picks the battery chemistry explicitly — same reasoning as
 * selectPanelClass().
 * @param {string} id - a CONSTANTS.BATTERY_CHEMISTRY key, e.g. 'LITHIUM'
 */
function selectBatteryChemistry(id) {
  StateManager.setState({ selectedBatteryChemistryId: id, panelBatteryUserChosen: true });
  buildRecommendation();
}

/**
 * Customer picks the charging architecture (solar+grid vs. solar-only)
 * — resolves to the only two real inverter topologies this schema
 * distinguishes (see CalcEngine.resolveInverterType()'s doc comment).
 * @param {string} id - a CONSTANTS.CHARGING_MODES id
 */
function selectChargingMode(id) {
  StateManager.setState({ selectedChargingModeId: id, panelBatteryUserChosen: true });
  buildRecommendation();
}

/** Scrolls back up to the picker — the "Change selection" affordance. */
function scrollToPicker() {
  const el = Utils.id('panel-picker-list');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Render the panel-class and battery-chemistry pickers — a stacked
 * radio list per CONSTANTS entry flagged customerSelectable, so a
 * future class/chemistry only needs that flag to appear here, no code
 * change. Always shows the CURRENT calc.panel_class/battery_chemistry
 * as selected, whether that's the customer's own pick or still the
 * unconfirmed starting default.
 * @param {Object} calc
 */
function buildPanelBatteryPicker(calc) {
  const panelListEl = Utils.id('panel-picker-list');
  const battListEl  = Utils.id('battery-picker-list');
  const chargeListEl = Utils.id('charging-picker-list');
  if (!panelListEl || !battListEl) return;

  const pt = (k, vars) => I18n.t('steps.recommendation.picker.' + k, vars);

  // GRID_ONLY has no PV array — the panel picker doesn't apply, so it's
  // replaced with a short honest note instead of a meaningless choice.
  const panelSectionEl = Utils.id('panel-picker-section');
  const noSolarNoteEl  = Utils.id('no-solar-note');
  if (panelSectionEl) panelSectionEl.classList.toggle('hidden', !calc.has_solar);
  if (noSolarNoteEl)  noSolarNoteEl.classList.toggle('hidden', !!calc.has_solar);

  const panelClasses = (CONSTANTS.PANEL_CLASSES || []).filter(c => c.customerSelectable);
  Utils.html(panelListEl, panelClasses.map(pc => {
    const isSelected = calc.panel_class && calc.panel_class.id === pc.id;
    const opt = pt('panelOptions.' + pc.id + '.label');
    const desc = pt('panelOptions.' + pc.id + '.desc');
    return `
      <div class="option-card ${isSelected ? 'selected' : ''}" onclick="selectPanelClass('${pc.id}')">
        <div class="option-card-radio"></div>
        <div class="option-card-body">
          <div class="option-card-title">${opt}</div>
          <div class="option-card-desc">${desc}</div>
        </div>
      </div>`;
  }).join(''));

  const chemistries = Object.values(CONSTANTS.BATTERY_CHEMISTRY || {}).filter(c => c.customerSelectable);
  Utils.html(battListEl, chemistries.map(ch => {
    const isSelected = calc.battery_chemistry === ch.id;
    const opt = pt('batteryOptions.' + ch.id + '.label');
    const desc = pt('batteryOptions.' + ch.id + '.desc');
    return `
      <div class="option-card ${isSelected ? 'selected' : ''}" onclick="selectBatteryChemistry('${ch.id}')">
        <div class="option-card-radio"></div>
        <div class="option-card-body">
          <div class="option-card-title">${opt}</div>
          <div class="option-card-desc">${desc}</div>
        </div>
      </div>`;
  }).join(''));

  if (chargeListEl) {
    const modes = Object.values(CONSTANTS.CHARGING_MODES || {}).filter(m => m.customerSelectable);
    Utils.html(chargeListEl, modes.map(m => {
      const isSelected = calc.charging_mode === m.id;
      const opt = pt('chargingOptions.' + m.id + '.label');
      const desc = pt('chargingOptions.' + m.id + '.desc');
      return `
        <div class="option-card ${isSelected ? 'selected' : ''}" onclick="selectChargingMode('${m.id}')">
          <div class="option-card-radio"></div>
          <div class="option-card-body">
            <div class="option-card-title">${opt}</div>
            <div class="option-card-desc">${desc}</div>
          </div>
        </div>`;
    }).join(''));
  }
}

/**
 * "Your Choice" recap strip — panel/battery/backup target, plus a link
 * back up to the picker. Reinforces "based on YOUR selection," never
 * "we chose this for you."
 * @param {Object} calc
 */
function buildYourChoiceCard(calc) {
  const el = Utils.id('your-choice-card');
  if (!el) return;
  const pt = (k, vars) => I18n.t('steps.recommendation.picker.' + k, vars);
  const panelLabel = calc.has_solar ? pt('panelOptions.' + calc.panel_class.id + '.label') : pt('noSolarShortLabel');
  const batteryLabel = pt('batteryOptions.' + calc.battery_chemistry + '.label');
  const chargingLabel = pt('chargingOptions.' + calc.charging_mode + '.label');

  Utils.html(el, `
    <div class="your-choice-title">${pt('yourChoiceTitle')}</div>
    <div class="your-choice-row"><span>${pt('yourChoicePanel')}</span><span>${panelLabel}</span></div>
    <div class="your-choice-row"><span>${pt('yourChoiceBattery')}</span><span>${batteryLabel}</span></div>
    <div class="your-choice-row"><span>${pt('yourChoiceCharging')}</span><span>${chargingLabel}</span></div>
    <div class="your-choice-row"><span>${pt('yourChoiceBackup')}</span><span>${pt('yourChoiceHours', { hours: calc.outage_hours })}</span></div>
    <button type="button" class="change-selection-link" onclick="scrollToPicker()">${pt('changeSelection')}</button>
  `);
}

function buildRecommendation() {
  // Always recompute fresh here (never trust a possibly-stale cached
  // calc) — this is the one step where panel class/battery chemistry
  // can change live from the customer's own picker, so the calc must
  // track calcOptions() on every render, not just the first one. The
  // fresh result is cached back into state.calc so every downstream
  // step (8, review, PDF, WhatsApp, CRM) sees the same, current choice.
  const calc = CalcEngine.run(StateManager.getSelectedDevices(), calcOptions());
  StateManager.setState({ calc });

  buildPanelBatteryPicker(calc);
  buildYourChoiceCard(calc);

  // Personalized subtitle — "يا باشمهندس أحمد، هذا هو النظام المناسب لمزرعتك"
  Utils.text(Utils.id('rec-subtitle'), PersonalizationEngine.greet(
    { customerType: StateManager.get('customerType'), fullName: StateManager.get('customerName'), propertyType: StateManager.get('propertyType') },
    I18n.t('steps.recommendation.subtitleGreeting')
  ));

  // Confidence indicator — tells the customer how much weight to give this
  // sizing based on how many of their real devices were analyzed.
  const confLevel = getConfidenceLevel(calc);
  const confIcon  = { high: '✓', good: '◐', fair: '!' }[confLevel];
  const confNoteKey = confLevel === 'fair' ? 'steps.recommendation.confidence.fairNote' : 'steps.recommendation.confidence.note';
  Utils.html(Utils.id('rec-confidence'), `
    <div class="rec-confidence-badge conf-${confLevel}">
      <div class="rec-confidence-icon">${confIcon}</div>
      <div>
        <div class="rec-confidence-level">${I18n.t('steps.recommendation.confidence.' + confLevel + 'Label')}</div>
        <div class="rec-confidence-note">${I18n.t(confNoteKey, { count: calc.device_count })}</div>
      </div>
    </div>
  `);

  const components = getSystemComponents(calc);

  // Step 7 only: swap the emoji for a real Cloudinary photo wherever
  // CloudinaryImages.system() has a confirmed match for this component's
  // key — Step 11's review list and the PDF keep using c.icon exactly as
  // before (getSystemComponents() itself is untouched), so neither can
  // drift from this visual-only enhancement.
  Utils.html(
    Utils.id('rec-components'),
    components.map(c => {
      // Battery is looked up by chemistry (two real photos were
      // supplied, one per chemistry group — see cloudinary-config.js),
      // every other component by its fixed key.
      const publicId = c.key === 'battery'
        ? CloudinaryImages.battery(calc.battery_chemistry)
        : CloudinaryImages.system(c.key);
      return `
      <div class="rec-component anim-fade-in">
        ${Utils.iconOrImage(c.icon, publicId, c.title, { width: 136, height: 136, wrapClass: 'system-image-wrap', iconClass: 'rec-comp-icon' })}
        <div>
          <div class="rec-comp-title">${c.title}</div>
          <div class="rec-comp-spec">${c.spec}</div>
          <div class="rec-comp-why">${c.why}</div>
        </div>
      </div>
    `;
    }).join('')
  );

  // Battery timeline — DoD must match whichever chemistry this system was
  // actually sized against, not a fixed lithium constant, since Lead-Acid/
  // GEL have real, much lower usable-depth values.
  const chemistryInfo = (CONSTANTS.BATTERY_CHEMISTRY && CONSTANTS.BATTERY_CHEMISTRY[calc.battery_chemistry]) || { dod: 0.85, efficiency: 0.965 };
  const timeline = RecommendationsEngine.buildBatteryTimeline(
    calc.battery_kwh,
    chemistryInfo.dod,
    calc.night_load_w,
    0.90,
    chemistryInfo.efficiency
  );
  Utils.html(Utils.id('battery-timeline'), Charts.renderBatteryTimeline(timeline));

  // Future expansion — surfaces the "planning to expand?" answer collected
  // earlier in the wizard, translated into what it means for this system.
  const wantsExpansion = !!StateManager.get('expansion');
  const expPrefix = wantsExpansion ? 'active' : 'suggest';
  Utils.html(Utils.id('rec-expansion'), `
    <div class="rec-expansion-card ${wantsExpansion ? 'active' : ''}">
      <div class="rec-expansion-icon">${wantsExpansion ? '📈' : '💡'}</div>
      <div>
        <div class="rec-expansion-title">${I18n.t('steps.recommendation.expansion.' + expPrefix + 'Title')}</div>
        <div class="rec-expansion-text">${I18n.t('steps.recommendation.expansion.' + expPrefix + 'Text', { mppt: calc.mppt_a, inverter: calc.inverter_w })}</div>
      </div>
    </div>
  `);

  // Generator vs. solar — a qualitative educational comparison, no
  // dollar figures (no fixed system price exists to run that math
  // against, and running-cost numbers read as a commercial claim).
  const ct = (k) => I18n.t('steps.recommendation.compare.' + k);
  Utils.html(Utils.id('rec-gen-compare'), `
    <div class="compare-title">${ct('title')}</div>
    <div class="compare-grid">
      <div class="compare-col compare-gen">
        <div class="compare-col-label">${ct('genLabel')}</div>
        <div class="compare-row"><span>${ct('runningCost')}</span><b>${ct('genRunningCostVal')}</b></div>
        <div class="compare-row"><span>${ct('noise')}</span><b>${ct('noisy')}</b></div>
        <div class="compare-row"><span>${ct('fuel')}</span><b>${ct('fuelDependent')}</b></div>
      </div>
      <div class="compare-col compare-solar">
        <div class="compare-col-label">${ct('solarLabel')}</div>
        <div class="compare-row"><span>${ct('runningCost')}</span><b>${ct('solarRunningCostVal')}</b></div>
        <div class="compare-row"><span>${ct('noise')}</span><b>${ct('silent')}</b></div>
        <div class="compare-row"><span>${ct('fuel')}</span><b>${ct('fuelFree')}</b></div>
      </div>
    </div>
  `);

  buildEconomicOptions(calc);
  buildRecAlternatives(calc);
  buildEducationCards();
}

/**
 * "Other technically suitable options" — a compact, honest callout below
 * the technical recommendation. The engine picks ONE concrete panel
 * class/chemistry/inverter type to size the system against (a reliable
 * baseline, not a guess), but doesn't invent certainty about which is
 * the only valid choice: panel-class alternatives are real computed
 * numbers (same array size, different tiling), while chemistry/inverter
 * alternatives are honest qualitative notes — final equipment is always
 * confirmed with the customer after technical review.
 * @param {Object} calc
 */
function buildRecAlternatives(calc) {
  const el = Utils.id('rec-alternatives');
  if (!el) return;
  const at = (k, vars) => I18n.t('steps.recommendation.alternatives.' + k, vars);

  const panelLine = calc.has_solar
    ? (calc.panel_alternatives || []).map(pc => at('panelItem', { watts: pc.watts, count: pc.panel_count })).join(' · ')
    : '';

  const otherInverterType = (calc.inverter_suitable_types || []).find(t => t !== calc.inverter_type);

  Utils.html(el, `
    <div class="rec-expansion-card">
      <div class="rec-expansion-icon">🔀</div>
      <div>
        <div class="rec-expansion-title">${at('title')}</div>
        ${calc.has_solar ? `<div class="rec-expansion-text">${at('panelsExplanation')}</div>` : ''}
        ${panelLine ? `<div class="rec-expansion-text">${at('panelsLabel')}: ${panelLine}</div>` : ''}
        ${otherInverterType ? `<div class="rec-expansion-text">${at('inverterNote', { type: I18n.t('inverterType.' + otherInverterType) })}</div>` : ''}
        <div class="rec-expansion-text">${at('batteryNote')}</div>
      </div>
    </div>
  `);
}

/**
 * Economic comparison — up to THREE real, calculated configurations,
 * never priced:
 *   اختيارك          — whatever the picker currently shows (default or
 *                       customer-picked)
 *   اقتراح أندوريا    — the same PV requirement tiled with our standard
 *                       default panel class, shown only when it's
 *                       actually a different config from "your choice"
 *                       (never a redundant duplicate card)
 *   بديل اقتصادي      — the alternative furthest from the above in real
 *                       panel count, framed only as "fewer/larger panels"
 *                       vs. "more/smaller panels" — never a fabricated
 *                       price comparison
 * No PV array exists in GRID_ONLY mode (calc.has_solar === false), so
 * this section doesn't apply there and renders nothing.
 * @param {Object} calc
 */
function buildEconomicOptions(calc) {
  const el = Utils.id('rec-economic-options');
  if (!el) return;
  const et = (k, vars) => I18n.t('steps.recommendation.economic.' + k, vars);

  if (!calc.has_solar) { Utils.html(el, ''); return; }

  const alts = calc.panel_alternatives || [];
  if (alts.length < 2) { Utils.html(el, ''); return; }

  const yourChoice = alts.find(a => a.id === calc.panel_class.id)
    || { id: calc.panel_class.id, watts: calc.panel_class.watts, panel_count: calc.panel_count };

  const defaultPanelId = CONSTANTS.PANEL_CLASS_DEFAULT;
  const andoriaChoice = defaultPanelId !== yourChoice.id
    ? alts.find(a => a.id === defaultPanelId)
    : null;

  // Furthest-in-panel-count alternative from whichever of the above is
  // the current anchor — always a genuinely distinct third option, never
  // a near-duplicate of the first two cards.
  const anchor = andoriaChoice || yourChoice;
  const econAlt = alts.reduce((best, a) => {
    if (a.id === yourChoice.id || (andoriaChoice && a.id === andoriaChoice.id)) return best;
    const diff = Math.abs(a.panel_count - anchor.panel_count);
    const bestDiff = best ? Math.abs(best.panel_count - anchor.panel_count) : -1;
    return diff > bestDiff ? a : best;
  }, null);

  const card = (badge, isPrimary, item, descKey) => `
    <div class="econ-option-card ${isPrimary ? 'recommended' : ''}">
      <div class="econ-option-badge ${isPrimary ? '' : 'alt'}">${badge}</div>
      <div class="econ-option-title">${et('panelsAt', { watts: item.watts, count: item.panel_count })}</div>
      <div class="econ-option-desc">${et(descKey)}</div>
    </div>`;

  let cards = card(et('yourChoiceBadge'), true, yourChoice, 'yourChoiceDesc');
  if (andoriaChoice) {
    cards += card(et('andoriaBadge'), false, andoriaChoice, andoriaChoice.panel_count < yourChoice.panel_count ? 'fewerPanelsDesc' : 'morePanelsDesc');
  }
  if (econAlt) {
    cards += card(et('economicAltBadge'), false, econAlt, econAlt.panel_count < anchor.panel_count ? 'fewerPanelsDesc' : 'morePanelsDesc');
  }

  Utils.html(el, `
    <div class="section-title mt-2">${et('sectionTitle')}</div>
    <div class="econ-options-grid">${cards}</div>
  `);
}

/**
 * "Know the Difference" — a compact educational section (expandable
 * cards) explaining panels/batteries/inverters in plain language. This
 * is deliberately NOT a product catalog: no brands, no prices, no
 * purchase actions — just "what's the difference," so the customer
 * reaches the WhatsApp handoff informed, not sold to.
 */
function buildEducationCards() {
  const el = Utils.id('edu-cards');
  if (!el) return;
  const et = (k, vars) => I18n.t('education.' + k, vars);
  const priorityClasses = (CONSTANTS.PANEL_CLASSES || [])
    .filter(c => !c.legacy)
    .map(c => c.watts + 'W')
    .join(' / ');

  // Each item answers exactly 4 questions — what/advantage/disadvantage/
  // who it suits — so a non-technical customer can understand a choice
  // in under a minute, per the explicit product requirement.
  const qa = (what, pro, con, who) => `
    <div class="edu-qa-row"><b>${et('whatLabel')}:</b> ${what}</div>
    <div class="edu-qa-row"><b>${et('proLabel')}:</b> ${pro}</div>
    <div class="edu-qa-row"><b>${et('conLabel')}:</b> ${con}</div>
    <div class="edu-qa-row"><b>${et('whoLabel')}:</b> ${who}</div>
  `;

  const panelBody = qa(et('panels.what'), et('panels.pro'), et('panels.con'), et('panels.who'));
  const chemistryRows = (I18n.tRaw('education.battery.chemistries') || [])
    .map(c => `<div class="edu-subrow"><div class="edu-subrow-name">${c.name}</div>${qa(c.what, c.pro, c.con, c.who)}</div>`).join('');
  const inverterRows = (I18n.tRaw('education.inverter.types') || [])
    .map(t => `<div class="edu-subrow"><div class="edu-subrow-name">${t.name}</div>${qa(t.what, t.pro, t.con, t.who)}</div>`).join('');

  Utils.html(el, `
    <details class="edu-card">
      <summary class="edu-card-summary">
        <div class="edu-card-icon">${et('panels.icon')}</div>
        <div class="edu-card-head">
          <div class="edu-card-title">${et('panels.title')}</div>
          <div class="edu-card-hint">${et('panels.teaser')}</div>
          <div class="edu-card-tap-hint">👆 ${et('tapHint')}</div>
        </div>
        <div class="edu-card-chevron">⌄</div>
      </summary>
      <div class="edu-card-body">
        ${panelBody}
        <div class="edu-classes-note">${et('panels.classesLabel')} ${priorityClasses}</div>
      </div>
    </details>
    <details class="edu-card">
      <summary class="edu-card-summary">
        <div class="edu-card-icon">${et('battery.icon')}</div>
        <div class="edu-card-head">
          <div class="edu-card-title">${et('battery.title')}</div>
          <div class="edu-card-hint">${et('battery.teaser')}</div>
          <div class="edu-card-tap-hint">👆 ${et('tapHint')}</div>
        </div>
        <div class="edu-card-chevron">⌄</div>
      </summary>
      <div class="edu-card-body">${chemistryRows}</div>
    </details>
    <details class="edu-card">
      <summary class="edu-card-summary">
        <div class="edu-card-icon">${et('inverter.icon')}</div>
        <div class="edu-card-head">
          <div class="edu-card-title">${et('inverter.title')}</div>
          <div class="edu-card-hint">${et('inverter.teaser')}</div>
          <div class="edu-card-tap-hint">👆 ${et('tapHint')}</div>
        </div>
        <div class="edu-card-chevron">⌄</div>
      </summary>
      <div class="edu-card-body">${inverterRows}</div>
    </details>
    <div class="edu-disclaimer">${et('disclaimer')}</div>
  `);
}


// ═══════════════════════════════════════════════════════════════════
// STEP 8 — PACKAGES
// ═══════════════════════════════════════════════════════════════════

/**
 * STEP 8 — RECOMMENDATION REPORT (2026 strategy pivot)
 *
 * Was a 3-tier priced package chooser (essential/standard/premium via
 * PricingEngine/PackageCatalog). ANDORIA no longer shows customer-facing
 * prices: the calculator is a lead-generation/qualification engine, not
 * an e-commerce checkout. This now renders ONE short, honest technical
 * recommendation — panel class/count, battery chemistry/capacity,
 * inverter type — built entirely from CalcEngine.run()'s output, no
 * network round-trip, no price. selectPackage()/PricingEngine/
 * PackageCatalog/RecommendationsEngine are left in place, unused by this
 * step, in case a future Quotation Engine needs them (see CLAUDE.md-style
 * note in pricing-engine.js) — never delete backend pricing infra.
 */
async function buildPackages() {
  const calc = StateManager.get('calc') || CalcEngine.run(StateManager.getSelectedDevices(), calcOptions());
  StateManager.setState({ calc });

  const listEl = Utils.id('packages-list');
  if (!listEl) return;

  const pt = (k, vars) => I18n.t('steps.packages.' + k, vars);
  const chemistryLabel = I18n.t('batteryChemistry.' + calc.battery_chemistry);
  const panelClassLabel = pt('panelClassLabel', { watts: calc.panel_class.watts });
  const inverterLabel = I18n.t('inverterType.' + calc.inverter_type) + ' · ' + I18n.t('inverterPhase.' + calc.inverter_phase);

  StateManager.setState({
    pkgName: panelClassLabel + ' — ' + chemistryLabel,
    pkgFeatures: [
      { icon: '☀️', text: pt('featPanels', { count: calc.panel_count, watts: calc.panel_class.watts }) },
      { icon: '🔋', text: pt('featBattery', { kwh: calc.battery_kwh, chemistry: chemistryLabel }) },
      { icon: '⚡', text: pt('featInverter', { w: calc.inverter_w, type: inverterLabel }) },
      { icon: '🌙', text: pt('featBackup', { hours: calc.backup_hrs }) },
    ],
  });

  // "YOUR REQUIREMENT" — four numbers derived directly from the
  // customer's own devices/answers, shown BEFORE any equipment
  // translation, so the page reads as "this is what YOU need" rather
  // than "here's our package." Reuses the same .kpi-card component as
  // Step 6's consumption summary — same visual language, same math.
  const reqKpis = `
    <div class="grid-2 mb-6">
      <div class="kpi-card"><div class="kpi-icon">⚡</div><div class="kpi-val">${Utils.fmtWh(calc.raw_wh)}</div><div class="kpi-label">${pt('reqDailyLabel')}</div><div class="kpi-desc">${pt('reqDailyDesc')}</div></div>
      <div class="kpi-card"><div class="kpi-icon">🔌</div><div class="kpi-val">${Utils.fmtW(calc.peak_w)}</div><div class="kpi-label">${pt('reqPeakLabel')}</div><div class="kpi-desc">${pt('reqPeakDesc')}</div></div>
      <div class="kpi-card"><div class="kpi-icon">☀️</div><div class="kpi-val">${(calc.array_w / 1000).toFixed(1)} kWp</div><div class="kpi-label">${pt('reqSolarLabel')}</div><div class="kpi-desc">${pt('reqSolarDesc')}</div></div>
      <div class="kpi-card"><div class="kpi-icon">🔋</div><div class="kpi-val">${calc.battery_kwh} kWh</div><div class="kpi-label">${pt('reqBatteryLabel')}</div><div class="kpi-desc">${pt('reqBatteryDesc')}</div></div>
    </div>
  `;

  // "Calculation basis" — makes the inputs behind the numbers above
  // explicit, so the customer can see this was computed from THEIR
  // devices and THEIR selected backup period, not a generic formula.
  const cb = (k, vars) => I18n.t('calcBasis.' + k, vars);
  const calcBasisHtml = `
    <div class="confidence-card">
      <div class="confidence-title">${cb('title')}</div>
      <div class="confidence-item">✓ ${cb('devices', { count: calc.device_count })}</div>
      <div class="confidence-item">✓ ${cb('hours')}</div>
      <div class="confidence-item">✓ ${cb('daily', { wh: Utils.fmtWh(calc.raw_wh) })}</div>
      <div class="confidence-item">✓ ${cb('peak', { peak: Utils.fmtW(calc.peak_w) })}</div>
      <div class="confidence-item">✓ ${cb('backup', { hours: calc.outage_hours })}</div>
      <div class="confidence-item">✓ ${cb('solar', { psh: calc.psh })}</div>
    </div>
  `;

  Utils.html(listEl, `
    ${reqKpis}
    <div class="section-title">${pt('equipmentSectionLabel')}</div>
    <div class="pkg-card recommended anim-fade-in" id="pkg-recommendation">
      <div class="pkg-recommended-badge">${pt('recommendedBadge')}</div>
      <div class="pkg-body">
        <div class="pkg-tier">${pt('systemSizeLabel', { kw: (calc.array_w / 1000).toFixed(1) })}</div>
        <div class="pkg-name">${panelClassLabel}</div>
        <div class="pkg-desc">${pt('assumptionsNote')}</div>
        <div class="pkg-features">
          <div class="pkg-feature"><div class="pkg-feat-icon">☀️</div><div class="pkg-feat-text">${pt('featPanels', { count: calc.panel_count, watts: calc.panel_class.watts })}</div></div>
          <div class="pkg-feature"><div class="pkg-feat-icon">🔋</div><div class="pkg-feat-text">${pt('featBattery', { kwh: calc.battery_kwh, chemistry: chemistryLabel })}</div></div>
          <div class="pkg-feature"><div class="pkg-feat-icon">⚡</div><div class="pkg-feat-text">${pt('featInverter', { w: calc.inverter_w, type: inverterLabel })}</div></div>
          <div class="pkg-feature"><div class="pkg-feat-icon">🌙</div><div class="pkg-feat-text">${pt('featBackup', { hours: calc.backup_hrs })}</div></div>
        </div>
      </div>
    </div>
    ${calcBasisHtml}
  `);
}

/**
 * Select a package and advance. Looks the full package object (features,
 * final price) up from the array buildPackages() just stored in state,
 * so the PDF/WhatsApp/CTA screens all reuse the exact numbers the
 * customer saw when choosing — nothing gets recalculated differently.
 * @param {string} id
 */
function selectPackage(id) {
  const pkgs = StateManager.get('packages') || [];
  const pkg  = pkgs.find(p => p.id === id);
  if (!pkg) return;

  StateManager.setState({
    selectedPackage: pkg.id,
    pkgName:     pkg.name_ar,
    pkgPrice:    pkg.price,
    pkgFeatures: pkg.features,
  });

  const cardEl = Utils.id('pkg-' + pkg.id);
  if (cardEl) {
    cardEl.classList.add('anim-success-pop');
    setTimeout(() => goToStep(9), 200);
  } else {
    goToStep(9);
  }
}


// ═══════════════════════════════════════════════════════════════════
// STEP 9 — SAVINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * STEP 9 — FREE INSTALLATION (2026 strategy pivot)
 *
 * Was the $-savings/ROI-vs-diesel step (CalcEngine.calcROI against
 * state.pkgPrice). No customer-facing price exists to run that math
 * against anymore, so this now renders the Free Installation hook —
 * a premium included benefit, not a discount banner. calcROI() is left
 * defined in calculations.js, unused here, for the same "don't delete
 * backend infra" reason buildPackages() keeps selectPackage() around.
 */
function buildSavings() {
  Utils.text(Utils.id('free-install-headline'), '🎁');
  const items = I18n.tRaw('steps.savings.items') || [];
  Utils.html(Utils.id('free-install-items'), items.map(item => `
    <div class="trust-item anim-fade-in">
      <div class="trust-icon">${item.icon}</div>
      <div>
        <div class="trust-title">${item.title}</div>
        <div class="trust-desc">${item.desc}</div>
      </div>
    </div>
  `).join(''));
}


// ═══════════════════════════════════════════════════════════════════
// STEP 10 — TRUST
// ═══════════════════════════════════════════════════════════════════

function buildTrust() {
  // Truthful trust signals (no fabricated warranty/delivery/pricing
  // guarantees — see steps.trust.items in i18n for what's actually said).
  const items = I18n.tRaw('steps.trust.items') || [];
  Utils.html(Utils.id('trust-items-list'), items.map(item => `
    <div class="trust-item">
      <div class="trust-icon">${item.icon}</div>
      <div>
        <div class="trust-title">${item.title}</div>
        <div class="trust-desc">${item.desc}</div>
      </div>
    </div>
  `).join(''));

  // Real testimonials only — steps.trust.testimonials is intentionally
  // empty until real customer feedback exists. Shows the honest
  // placeholder instead of ever inventing quotes.
  const testimonials = I18n.tRaw('steps.trust.testimonials') || [];
  const listEl = Utils.id('testimonials-list');
  const placeholderEl = Utils.id('testimonials-placeholder');
  if (testimonials.length) {
    Utils.toggle(placeholderEl, false);
    Utils.html(listEl, testimonials.map(t => `
      <div class="testimonial-card">
        <div class="testimonial-stars">★★★★★</div>
        <div class="testimonial-text">"${t.text}"</div>
        <div class="testimonial-author">${t.author}</div>
      </div>
    `).join(''));
  } else {
    Utils.toggle(placeholderEl, true);
    Utils.html(listEl, '');
  }
}


// ═══════════════════════════════════════════════════════════════════
// STEP 11 — ORDER REVIEW
// ═══════════════════════════════════════════════════════════════════

function buildOrderReview() {
  const calc  = StateManager.get('calc') || {};
  const state = StateManager.getState();
  const isFamily = state.beneficiary === 'family';

  const rt = (k) => I18n.t('steps.review.' + k);
  const rr = (k) => I18n.t('steps.review.rows.' + k);

  // Personalized subtitle — "يا أستاذ محمد، راجع طلب منزلك قبل الدفع"
  Utils.text(Utils.id('review-subtitle'), PersonalizationEngine.greet(
    { customerType: state.customerType, fullName: state.customerName, propertyType: state.propertyType },
    rt('subtitleGreeting')
  ));

  // Buyer information
  const buyerCountry = CountryManager.getCountry(state.customerLocation);
  const buyerLocationName = buyerCountry
    ? (I18n.getLang() === 'en' ? buyerCountry.name_en : buyerCountry.name_ar)
    : (state.customerLocation === 'other' ? I18n.t('steps.profile.locationOther').replace('🌍 ', '') : '—');
  const buyerRows = [
    [rr('name'), state.customerName || '—'],
    [rr('phone'), CountryManager.display(state.mobileCountry, state.customerMobile)],
    [rr('location'), buyerLocationName],
    [rr('systemFor'), isFamily ? rr('systemForFamily') : rr('systemForMyself')],
  ];
  Utils.html(Utils.id('review-buyer-list'), buyerRows.map(([k, v]) => `
    <div class="review-row"><span>${k}</span><b>${v}</b></div>
  `).join(''));

  // Recipient information (only when buying for family)
  if (isFamily) {
    const recStateName = LocationManager.getStateName(state.recipientStateId) || '—';
    const recRows = [
      [rr('name'), state.recipientName || '—'],
      [rr('phone'), CountryManager.display('sudan', state.recipientMobile)],
      [rr('state'), recStateName],
      [rr('city'), LocationManager.getCityName(state.recipientStateId, state.recipientCityId) || '—'],
    ];
    Utils.html(Utils.id('review-recipient-list'), recRows.map(([k, v]) => `
      <div class="review-row"><span>${k}</span><b>${v}</b></div>
    `).join(''));
    Utils.id('review-recipient-card')?.classList.remove('hidden');
  } else {
    Utils.id('review-recipient-card')?.classList.add('hidden');
  }

  // Selected recommendation — no price shown, see buildPackages()
  Utils.text(Utils.id('review-pkg-name'), state.pkgName || '—');

  // Products & services — panels/battery/inverter/MPPT (shared with the
  // Recommendation step) plus the two bundled, always-free line items.
  const components = getSystemComponents(calc);
  const serviceRows = [
    { icon: '🔧', title: rt('installation'), spec: rt('free') },
    { icon: '🚚', title: rt('delivery'), spec: rt('free') },
  ];
  Utils.html(Utils.id('review-products'), [...components, ...serviceRows].map(c => `
    <div class="rec-component">
      <div class="rec-comp-icon">${c.icon}</div>
      <div>
        <div class="rec-comp-title">${c.title}</div>
        <div class="rec-comp-spec">${c.spec}</div>
      </div>
    </div>
  `).join(''));

  Utils.text(Utils.id('review-install-time'), rt('installTimeValue'));

  // Confidence checklist
  const items = RecommendationsEngine.buildConfidenceItems(calc, state);
  Utils.html(
    Utils.id('confidence-list'),
    items.map(i => `<div class="confidence-item">${i}</div>`).join('')
  );
}


// ═══════════════════════════════════════════════════════════════════
// STEP 12 — PAYMENT
// ═══════════════════════════════════════════════════════════════════

async function buildPayment() {
  // Same defensive fallback every other step's build function uses —
  // if state.calc was somehow never cached (shouldn't happen in the
  // normal sequential wizard flow, but this is the final page: savings,
  // the CRM lead, and the WhatsApp message all depend on this being a
  // real calculation, never a silently-empty object).
  let calc = StateManager.get('calc');
  if (!calc) {
    calc = CalcEngine.run(StateManager.getSelectedDevices(), calcOptions());
    StateManager.setState({ calc });
  }
  const state = StateManager.getState();

  // Save this session to the CRM the moment the customer reaches this
  // final step — reaching it already means they finished the full
  // assessment. Guarded by crmRequestId so re-entering (back/forward)
  // never creates a second request for the same session.
  if (!state.crmRequestId && typeof CRMStore !== 'undefined') {
    try {
      const request = await CRMStore.createRequest(state, calc);
      StateManager.setState({ crmRequestId: request.id });

      // Consume exactly one "first 100 customers" slot — ONLY after a
      // real CRM lead was created, never on a bare page view or
      // WhatsApp click. campaignSlotClaimed guards this session from
      // attempting a second claim; the real anti-duplication guarantee
      // is server-side (unique phone-number constraint in Postgres —
      // see claim_campaign_slot()), so even a different session/device
      // for the same customer can't consume a second slot.
      if (!state.campaignSlotClaimed) {
        const country = CountryManager.getCountry(state.mobileCountry);
        const phone = (country ? country.dial : '') + (state.customerMobile || '');
        await Utils.claimCampaignSlot(CONSTANTS.CAMPAIGN_ID, phone, request.id);
        StateManager.setState({ campaignSlotClaimed: true });
      }
    } catch (e) {
      console.error('[buildPayment] Failed to save lead to CRM:', e);
    }
  }

  // No customer-facing payment/checkout in this flow — Stripe element
  // stays dormant infra for a future real checkout, never mounted here.
  Utils.toggle(Utils.id('stripe-payment-element'), false);

  renderSavingsCard(calc);
  await renderOfferCard();

  // WhatsApp — Utils.getWhatsAppTarget() always resolves to the real
  // ANDORIA number (Settings first, verified BrandConfig fallback),
  // so there's no "not configured" state to handle here anymore.
  const target = await Utils.getWhatsAppTarget();
  const engineerLink = Utils.id('wa-engineer-link');
  const invoiceLink  = Utils.id('wa-invoice-link');
  if (engineerLink) engineerLink.href = Utils.buildWhatsAppURL(target.whatsapp, Utils.buildWhatsAppMessage(state, calc, 'engineer'));
  if (invoiceLink)  invoiceLink.href  = Utils.buildWhatsAppURL(target.whatsapp, Utils.buildWhatsAppMessage(state, calc, 'invoice'));

  const callLink = Utils.id('cta-call-link');
  if (callLink) callLink.href = 'tel:' + (target.phone || target.whatsapp);

  const facebookLink = Utils.id('facebook-cta-link');
  if (facebookLink) {
    facebookLink.href = BrandConfig.company().facebook;
    facebookLink.setAttribute('aria-label', I18n.t('steps.payment.facebookCta'));
    // Restart the entrance reveal every time Step 12 is (re)entered —
    // remove-reflow-add so the CSS animation actually replays instead of
    // silently no-opping on a class that's already present.
    facebookLink.classList.remove('reveal-in');
    void facebookLink.offsetWidth;
    facebookLink.classList.add('reveal-in');
  }

  renderFinalTrustSignals();
  renderFinalHeritage();
}

/**
 * Real diesel fuel-cost + savings estimate, driven by the SAME calc
 * object as everything else on this page (calc.raw_wh) — never a
 * second/independent energy figure.
 * @param {Object} calc
 */
function renderSavingsCard(calc) {
  const el = Utils.id('savings-card');
  if (!el) return;
  const s = CalcEngine.calcDieselSavings(calc.raw_wh || 0);
  const st = (k, vars) => I18n.t('savings.' + k, vars);
  Utils.html(el, `
    <div class="savings-title">⛽ ${st('title')}</div>
    <div class="savings-fuel-row">
      <span class="savings-fuel-label">${st('dailyFuelCostLabel')}</span>
      <span class="savings-fuel-val">≈ $${s.daily_fuel_cost_usd}</span>
    </div>
    <div class="savings-framing">💰 ${st('framing')}</div>
    <div class="savings-grid">
      <div class="savings-item"><div class="savings-item-val">$${s.daily_savings_usd}</div><div class="savings-item-label">${st('dailySavingsLabel')}</div></div>
      <div class="savings-item"><div class="savings-item-val">$${s.monthly_savings_usd}</div><div class="savings-item-label">${st('monthlySavingsLabel')}</div></div>
      <div class="savings-item"><div class="savings-item-val">$${s.yearly_savings_usd}</div><div class="savings-item-label">${st('yearlySavingsLabel')}</div></div>
    </div>
    <div class="savings-disclaimer">${st('disclaimer', {
      dailyKwh:    ((calc.raw_wh || 0) / 1000).toFixed(1),
      gallonPrice: CONSTANTS.DIESEL_PRICE_USD_PER_GALLON,
      dieselPrice: s.diesel_price_usd_per_liter.toFixed(3),
      literPerKwh: s.generator_fuel_l_per_kwh,
      coveragePct: Math.round(s.coverage_pct * 100),
    })}</div>
  `);
}

/**
 * Remaining "first 100 customers" slot count — read live from Supabase
 * (get_campaign_status), never computed/guessed client-side. If the
 * read fails (offline, etc.), shows the offer without a specific
 * number rather than a broken/undefined value.
 */
async function renderOfferCard(elId = 'offer-remaining') {
  const el = Utils.id(elId);
  if (!el) return;
  const status = await Utils.getCampaignStatus(CONSTANTS.CAMPAIGN_ID);
  el.textContent = (status && typeof status.remaining === 'number')
    ? I18n.t('offer.remaining', { count: status.remaining })
    : I18n.t('offer.remainingUnavailable');
}

/** Truthful trust signals repeated near the final CTA (steps.trust.items — no fabricated claims). */
function renderFinalTrustSignals() {
  const el = Utils.id('final-trust-list');
  if (!el) return;
  const items = I18n.tRaw('steps.trust.items') || [];
  Utils.html(el, items.map(i => `<div class="confidence-item">${i.icon} ${i.title}</div>`).join(''));
}

/** Brand heritage block near the final CTA — ANDORIA + legal entity + "Since 1978". */
function renderFinalHeritage() {
  const el = Utils.id('final-heritage-block');
  if (!el) return;
  const c = BrandConfig.company();
  const legalName = I18n.getLang() === 'en' ? c.legalName : c.legalNameAr;
  Utils.html(el, `
    <div class="final-heritage-brand">ANDORIA</div>
    <div class="final-heritage-legal">${legalName}</div>
    <div class="final-heritage-since">${I18n.t('finalTrust.sinceLabel', { year: c.heritageYear })}</div>
  `);
}

/**
 * Populate and reveal the (currently unreachable from the UI) payment
 * success screen. Intended to be called from a real Stripe
 * confirmPayment() success handler once payment-config.json has a key —
 * never call this to simulate a result.
 * @param {string} orderNumber
 */
function showPaymentSuccess(orderNumber) {
  Utils.text(Utils.id('payment-order-number'), I18n.t('steps.payment.orderNumber', { orderNumber }));
  Utils.text(Utils.id('payment-contact-eta'), I18n.t('steps.payment.contactEta'));
  Utils.id('payment-success-block')?.classList.remove('hidden');
  Utils.id('payment-failure-block')?.classList.add('hidden');
}

/**
 * Populate and reveal the (currently unreachable from the UI) payment
 * failure screen — cancelled, declined, or a network error. Intended to
 * be called from a real Stripe error handler.
 * @param {string} reason
 */
function showPaymentFailure(reason) {
  Utils.text(Utils.id('payment-failure-reason'), reason || I18n.t('steps.payment.failureDefaultReason'));
  Utils.id('payment-failure-block')?.classList.remove('hidden');
  Utils.id('payment-success-block')?.classList.add('hidden');
}

/**
 * Populate the hidden #pdf-report template from current state/calc.
 * Zero-dependency PDF generation: the browser's own print dialog
 * ("Save as PDF") renders this, rather than pulling in a PDF library —
 * consistent with the project's zero-build-step, offline-first design.
 */
async function buildPDFReport() {
  const state = StateManager.getState();
  const calc  = state.calc || CalcEngine.run(StateManager.getSelectedDevices(), calcOptions());
  const isFamily = state.beneficiary === 'family';
  const lang = I18n.getLang();
  const pt = (k) => I18n.t('pdf.' + k);

  // The report itself follows whichever language is active when it's
  // generated — an Arabic PDF is RTL, an English PDF is LTR.
  const reportEl = Utils.id('pdf-report');
  if (reportEl) { reportEl.dir = lang === 'ar' ? 'rtl' : 'ltr'; reportEl.lang = lang; }

  const propLabel = I18n.t('steps.property.types.' + state.propertyType) || state.propertyType || '—';
  const shopLabel = state.shopType ? I18n.t('steps.property.shopTypes.' + state.shopType) : '';
  const today     = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const buyerLocation = CountryManager.getCountry(state.customerLocation);
  const buyerLocationName = buyerLocation
    ? (lang === 'en' ? buyerLocation.name_en : buyerLocation.name_ar)
    : (state.customerLocation === 'other' ? I18n.t('steps.profile.locationOther').replace('🌍 ', '') : '—');

  // Section titles + field labels
  Utils.text(Utils.id('pdf-report-title'),      pt('reportTitle'));
  Utils.text(Utils.id('pdf-buyer-info-title'),  pt('buyerInfoTitle'));
  Utils.text(Utils.id('pdf-label-name'),        pt('name'));
  Utils.text(Utils.id('pdf-label-phone'),       pt('phone'));
  Utils.text(Utils.id('pdf-label-residence'),   pt('residence'));
  Utils.text(Utils.id('pdf-label-state'),       pt('state'));
  Utils.text(Utils.id('pdf-label-city'),        pt('city'));
  Utils.text(Utils.id('pdf-label-date'),        pt('date'));
  Utils.text(Utils.id('pdf-label-property'),    pt('propertyType'));
  Utils.text(Utils.id('pdf-recipient-info-title'), pt('recipientInfoTitle'));
  Utils.text(Utils.id('pdf-label-rname'),       pt('name'));
  Utils.text(Utils.id('pdf-label-rphone'),      pt('phone'));
  Utils.text(Utils.id('pdf-label-rstate'),      pt('state'));
  Utils.text(Utils.id('pdf-label-rcity'),       pt('city'));
  Utils.text(Utils.id('pdf-consumption-title'), pt('consumptionTitle'));
  Utils.text(Utils.id('pdf-system-title'),      pt('systemTitle'));
  Utils.text(Utils.id('pdf-calc-basis-title'),  I18n.t('calcBasis.title'));
  Utils.text(Utils.id('pdf-products-title'),    pt('productsTitle'));
  Utils.text(Utils.id('pdf-savings-title'),     pt('savingsTitle'));
  Utils.text(Utils.id('pdf-badge-install'),     pt('freeInstall'));
  Utils.text(Utils.id('pdf-badge-delivery'),    pt('freeDelivery'));
  Utils.text(Utils.id('pdf-badge-support'),     pt('support'));
  Utils.text(Utils.id('pdf-powered-label'),     pt('poweredBy'));

  Utils.text(Utils.id('pdf-name'),          state.customerName || '—');
  Utils.text(Utils.id('pdf-phone'),         CountryManager.display(state.mobileCountry, state.customerMobile));
  Utils.text(Utils.id('pdf-buyer-location'), buyerLocationName);
  Utils.text(Utils.id('pdf-date'),          today);
  Utils.text(Utils.id('pdf-property'),      propLabel + (shopLabel ? ' — ' + shopLabel : ''));

  if (isFamily) {
    // Buyer's own Sudan state/city don't apply — the recipient's do (below)
    Utils.text(Utils.id('pdf-state'), '—');
    Utils.text(Utils.id('pdf-city'),  '—');

    Utils.text(Utils.id('pdf-recipient-name'),  state.recipientName || '—');
    Utils.text(Utils.id('pdf-recipient-phone'), CountryManager.display('sudan', state.recipientMobile));
    Utils.text(Utils.id('pdf-recipient-state'), LocationManager.getStateName(state.recipientStateId) || '—');
    Utils.text(Utils.id('pdf-recipient-city'),  LocationManager.getCityName(state.recipientStateId, state.recipientCityId) || '—');
    Utils.id('pdf-recipient-section')?.classList.remove('hidden');
  } else {
    Utils.text(Utils.id('pdf-state'), LocationManager.getStateName(state.customerStateId) || '—');
    Utils.text(Utils.id('pdf-city'),  LocationManager.getCityName(state.customerStateId, state.customerCityId) || '—');
    Utils.id('pdf-recipient-section')?.classList.add('hidden');
  }

  // Consumption summary
  const consumptionRows = [
    [pt('dailyConsumption'), Utils.fmtWh(calc.raw_wh || 0)],
    [pt('peakLoad'),         Utils.fmtW(calc.peak_w || 0)],
    [pt('surgeLoad'),        Utils.fmt(calc.surge_va || 0) + ' VA'],
    [pt('monthlyConsumption'), (calc.monthly_kwh || 0) + ' kWh'],
  ];
  Utils.html(Utils.id('pdf-consumption'), consumptionRows.map(([label, val]) => `
    <div><span>${label}</span><strong>${val}</strong></div>
  `).join(''));

  // Recommended system (shared with the on-screen recommendation step)
  const components = getSystemComponents(calc);
  Utils.html(Utils.id('pdf-system'), components.map(c => `
    <div class="pdf-list-row"><span>${c.icon} ${c.title}</span><b>${c.spec}</b></div>
  `).join(''));

  // Calculation basis — same transparency block as the Step 7 requirement
  // cards, so the PDF a customer downloads makes the same "this was
  // computed from your devices and your selected backup period" claim.
  const cb = (k, vars) => I18n.t('calcBasis.' + k, vars);
  Utils.html(Utils.id('pdf-calc-basis'), [
    cb('devices', { count: calc.device_count }),
    cb('hours'),
    cb('daily', { wh: Utils.fmtWh(calc.raw_wh || 0) }),
    cb('peak', { peak: Utils.fmtW(calc.peak_w || 0) }),
    cb('backup', { hours: calc.outage_hours }),
    cb('solar', { psh: calc.psh }),
  ].map(line => `<div class="pdf-list-row"><span>✓ ${line}</span></div>`).join(''));

  // Products — the package the customer selected
  const features = state.pkgFeatures && state.pkgFeatures.length
    ? state.pkgFeatures
    : [{ icon: 'ℹ️', text: pt('noPackage') }];
  Utils.html(Utils.id('pdf-products'), `
    <div class="pdf-list-row"><span>${pt('package')}</span><b>${state.pkgName || '—'}</b></div>
    <div class="pdf-list-row"><span>${pt('assumptionsNote')}</span></div>
  ` + features.map(f => `
    <div class="pdf-list-row"><span>${f.icon} ${f.text}</span></div>
  `).join(''));

  // Free Installation — no customer-facing price/savings math anymore
  // (see buildSavings()'s doc comment for why); this section reuses the
  // same #pdf-savings/#pdf-savings-title slots for the same benefit list
  // the on-screen Free Installation step shows.
  const freeInstallItems = I18n.tRaw('steps.savings.items') || [];
  Utils.html(Utils.id('pdf-savings'), freeInstallItems.map(item => `
    <div><span>${item.icon} ${item.title}</span></div>
  `).join(''));

  // Contact + branding. Company name/phone still read from BrandConfig
  // (fixed brand facts); WhatsApp comes live from Company Settings via
  // the same anon-safe RPC the wizard's WhatsApp step uses — never
  // hardcoded — with a verified BrandConfig fallback (the real ANDORIA
  // number, not a placeholder) if Settings is unreachable, so this
  // always resolves to a real number.
  const company = BrandConfig.company();
  const sudegy  = BrandConfig.poweredBy();
  const companyName = lang === 'en' ? company.name : company.nameAr;

  Utils.text(Utils.id('pdf-footer-company'), companyName);
  Utils.text(Utils.id('pdf-contact'),        `${companyName} — ${company.phone}`);

  const target = await Utils.getWhatsAppTarget();
  const pdfWa = Utils.id('pdf-whatsapp');
  if (pdfWa) {
    pdfWa.href = Utils.buildWhatsAppURL(target.whatsapp, '');
    pdfWa.textContent = pt('whatsappLabel') + ': ' + target.whatsapp;
    pdfWa.classList.remove('hidden');
  }

  Utils.text(Utils.id('pdf-powered-name'), sudegy.company);
}

/**
 * "Download PDF" — builds the printable report and hands off to the
 * browser's native print/Save-as-PDF dialog.
 */
async function downloadPDF() {
  await buildPDFReport();
  window.print();
}

/**
 * Share result via Web Share API.
 */
function shareResult() {
  const calc = StateManager.get('calc');
  if (calc) Utils.shareResult(calc);
}
