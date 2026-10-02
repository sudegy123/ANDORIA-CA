/**
 * ANDORIA CRM — APP ORCHESTRATOR
 * crm-app.js
 *
 * Bootstraps the CRM shell: mounts brand + language switcher, seeds demo
 * data on first run, registers routes, and starts the router. Also holds
 * small formatting helpers shared by every page (dashboard/requests/
 * customer-detail) so date/label formatting stays consistent everywhere.
 */

'use strict';

// ── Shared formatting helpers ─────────────────────────────────────────

/**
 * Format an ISO timestamp as a short date, Western digits regardless of
 * language (matches Utils.fmt's numeral policy elsewhere in the app).
 * @param {string} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—';
  const lang = I18n.getLang();
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/** Same as fmtDate but with a time component, for the timeline. */
function fmtDateTime(iso) {
  if (!iso) return '—';
  const lang = I18n.getLang();
  return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Package name in the CRM's CURRENT display language, not frozen at checkout time. */
function packageDisplayName(record) {
  const id = record.system && record.system.packageId;
  if (id) return I18n.t('steps.packages.tiers.' + id + '.name');
  return (record.system && record.system.packageName) || '—';
}

function propertyTypeLabel(record) {
  const type = record.property && record.property.propertyType;
  return type ? I18n.t('steps.property.types.' + type) : '—';
}

function customerTypeLabel(record) {
  const type = record.customer && record.customer.customerType;
  return type ? I18n.t('steps.profile.customerTypes.' + type) : '—';
}

function customerLocationLabel(record) {
  const country = CountryManager.getCountry(record.customer.location);
  if (country) return I18n.getLang() === 'en' ? country.name_en : country.name_ar;
  return record.customer.location || '—';
}

function customerStateLabel(record) {
  return LocationManager.getStateName(record.customer.stateId) || '—';
}

/** Free-text city (Phase 2 edit) takes precedence over the wizard's Sudan-city lookup. */
function customerCityLabel(record) {
  if (record.customer.city) return record.customer.city;
  return LocationManager.getCityName(record.customer.stateId, record.customer.cityId) || '—';
}

function customerPhoneDisplay(record) {
  return CountryManager.display(record.customer.mobileCountry, record.customer.mobile);
}

/** <span class="status-pill tone-X">icon label</span> */
function statusPillHTML(status) {
  return `<span class="status-pill tone-${Status.tone(status)}">${Status.icon(status)} ${Status.label(status)}</span>`;
}

const PRIORITY_TONE = { low: 'neutral', medium: 'gold', high: 'warning', urgent: 'danger' };
const PRIORITY_ICON = { low: '▽', medium: '◇', high: '△', urgent: '🔥' };

/** <span class="status-pill tone-X">icon label</span> — same visual language as statusPillHTML. */
function priorityBadgeHTML(priority) {
  const p = priority || 'medium';
  return `<span class="status-pill tone-${PRIORITY_TONE[p] || 'neutral'}">${PRIORITY_ICON[p] || '•'} ${I18n.t('crm.priority.' + p)}</span>`;
}

// ── Bootstrap ──────────────────────────────────────────────────────────

let _currentProfile = null; // { id, name, role, active } — the signed-in staff member

/** The signed-in staff member's role, or null before the profile loads. Pages use this for permission-aware rendering. */
function currentStaffRole() { return _currentProfile ? _currentProfile.role : null; }

/** Whether the signed-in staff member can manage Administration (Company/Branches/Users). */
function canManageAdmin() { return currentStaffRole() === 'OWNER' || currentStaffRole() === 'ADMIN'; }

async function mountCRMChrome() {
  const brandSlot = Utils.id('crm-brand-slot');
  if (brandSlot) brandSlot.innerHTML = BrandComponents.badge(24);

  const footerSlot = Utils.id('crm-footer-slot');
  if (footerSlot) footerSlot.innerHTML = BrandComponents.footer();

  const actorSlot = Utils.id('crm-actor-slot');
  if (actorSlot) {
    if (!_currentProfile) _currentProfile = await CRMAuth.getProfile();
    const label = _currentProfile
      ? `${_currentProfile.name} · ${I18n.t('crm.roles.' + _currentProfile.role)}`
      : I18n.t('crm.actor.unknown');
    actorSlot.textContent = '👤 ' + label;
  }

  const settingsLink = Utils.id('nav-settings-link');
  if (settingsLink) settingsLink.style.display = canManageAdmin() ? '' : 'none';

  document.title = I18n.t('crm.meta.title');
}

/** Click handler for the sidebar actor control — signs the current staff member out. */
async function signOutOfCRM() {
  if (!confirm(I18n.t('crm.actor.signOutConfirm'))) return;
  await CRMAuth.signOut();
  window.location.href = 'login.html';
}

function setTopbarTitle(title) {
  Utils.text(Utils.id('crm-topbar-title'), title);
}

async function initCRM() {
  const session = await CRMAuth.requireSession();
  if (!session) return; // requireSession already redirected to login.html

  _currentProfile = await CRMAuth.getProfile();
  if (!_currentProfile || !_currentProfile.active) {
    alert(I18n.t('crm.actor.inactiveAccount'));
    await CRMAuth.signOut();
    window.location.href = 'login.html';
    return;
  }

  I18n.init();
  await mountCRMChrome();

  // Re-mount chrome + re-render the current page whenever the language
  // switches, so nothing is left showing the old language mid-screen.
  I18n.onChange(() => {
    mountCRMChrome();
    CRMRouter.refresh();
  });

  CRMRouter.register('/dashboard', () => {
    setTopbarTitle(I18n.t('crm.nav.dashboard'));
    renderDashboardPage(Utils.id('page-root'));
  });
  CRMRouter.register('/requests', () => {
    setTopbarTitle(I18n.t('crm.nav.requests'));
    renderRequestsPage(Utils.id('page-root'));
  });
  CRMRouter.register('/requests/:id', (params) => {
    renderCustomerDetailPage(Utils.id('page-root'), params.id);
  });
  CRMRouter.register('/requests/:id/edit', (params) => {
    setTopbarTitle(I18n.t('crm.edit.title'));
    renderEditRequestPage(Utils.id('page-root'), params.id);
  });

  CRMRouter.register('/inventory', () => {
    setTopbarTitle(I18n.t('crm.nav.inventory'));
    renderInventoryDashboardPage(Utils.id('page-root'));
  });
  // Static routes before the parametric one — /products/new must not be
  // captured by /products/:id (the router picks the first match).
  CRMRouter.register('/inventory/products/new', () => {
    setTopbarTitle(I18n.t('crm.inventoryForm.addTitle'));
    renderInventoryFormPage(Utils.id('page-root'), null);
  });
  CRMRouter.register('/inventory/products/:id/edit', (params) => {
    renderInventoryFormPage(Utils.id('page-root'), params);
  });
  CRMRouter.register('/inventory/products/:id', (params) => {
    renderInventoryDetailPage(Utils.id('page-root'), params);
  });
  CRMRouter.register('/inventory/products', (params, query) => {
    setTopbarTitle(I18n.t('crm.inventoryList.title'));
    renderInventoryListPage(Utils.id('page-root'), params, query);
  });

  CRMRouter.register('/packages/new', () => {
    setTopbarTitle(I18n.t('crm.packageForm.addTitle'));
    renderPackageFormPage(Utils.id('page-root'), null);
  });
  CRMRouter.register('/packages/:id/edit', (params) => {
    renderPackageFormPage(Utils.id('page-root'), params);
  });
  CRMRouter.register('/packages', () => {
    setTopbarTitle(I18n.t('crm.nav.packages'));
    renderPackageListPage(Utils.id('page-root'));
  });

  CRMRouter.register('/projects/:id', (params) => {
    renderProjectDetailPage(Utils.id('page-root'), params);
  });
  CRMRouter.register('/projects', () => {
    setTopbarTitle(I18n.t('crm.nav.projects'));
    renderProjectListPage(Utils.id('page-root'));
  });

  CRMRouter.register('/settings/:tab', (params) => {
    setTopbarTitle(I18n.t('crm.nav.settings'));
    renderSettingsPage(Utils.id('page-root'), params.tab);
  });
  CRMRouter.register('/settings', () => {
    setTopbarTitle(I18n.t('crm.nav.settings'));
    renderSettingsPage(Utils.id('page-root'), 'company');
  });

  CRMRouter.notFound(() => {
    CRMRouter.navigate('/dashboard');
  });

  // Keep the page in sync with writes this tab makes (updateStatus/
  // addNote/updateRequest all notify once their write lands). Cross-tab/
  // cross-device realtime sync via Supabase Realtime is a later
  // enhancement, not wired yet.
  CRMStore.subscribe(() => CRMRouter.refresh());

  // Branches.label()/whatsappDigits() are read synchronously all over
  // the CRM (dashboard cards, sales report text) — populate the cache
  // before the router renders anything, not lazily on first use.
  await Branches.refresh();

  CRMRouter.start();
}

document.addEventListener('DOMContentLoaded', initCRM);
