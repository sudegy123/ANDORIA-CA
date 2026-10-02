/**
 * ANDORIA CRM — PACKAGE LIST PAGE
 * pages/package-list.js
 *
 * Every staff-built package, with its live computed price (via
 * PackagesStore.listPriced() → get_priced_packages()) and a quick specs
 * summary. Same toolbar/table pattern as the Inventory product list.
 */

'use strict';

let _pkgStatusFilter = 'ACTIVE';

async function renderPackageListPage(root) {
  if (!root) return;
  const pt = (k) => I18n.t('crm.packageList.' + k);
  const ct = (k) => I18n.t('crm.common.' + k);

  root.innerHTML = `
    <div class="crm-skel crm-skel-line" style="width:180px;height:11px;margin-bottom:10px"></div>
    <div class="crm-skel crm-skel-line" style="width:280px;height:26px;margin-bottom:24px"></div>
    <div class="crm-skel-grid">${[0, 1, 2].map(() => '<div class="crm-skel crm-skel-card"></div>').join('')}</div>
  `;
  const all = await PackagesStore.listPriced();
  const lang = I18n.getLang();
  const filtered = _pkgStatusFilter === 'all' ? all : all.filter((p) => p.status === _pkgStatusFilter);

  const statusLabel = (s) => ({
    DRAFT: pt('statusDraft'), ACTIVE: pt('statusActive'), ARCHIVED: pt('statusArchived'),
  }[s] || s);
  const statusTone = (s) => ({ DRAFT: 'tone-neutral', ACTIVE: 'tone-success', ARCHIVED: 'tone-neutral' }[s] || 'tone-neutral');

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${pt('title')}</span>
    </div>
    <div class="crm-page-header flex items-center justify-between" style="flex-wrap:wrap;gap:12px">
      <div>
        <div class="crm-page-title">${pt('title')}</div>
        <div class="crm-page-subtitle">${pt('subtitle')}</div>
      </div>
      <a href="#/packages/new" class="btn btn-primary" style="width:auto;padding:12px 24px" id="btn-add-package">+ ${pt('addPackage')}</a>
    </div>

    <div class="crm-toolbar">
      <div class="crm-filter-tabs">
        ${['ACTIVE', 'DRAFT', 'ARCHIVED', 'all'].map((s) => `
          <button class="crm-filter-tab ${_pkgStatusFilter === s ? 'active' : ''}" data-pkg-status-tab="${s}">
            ${s === 'all' ? ct('filterAll') : statusLabel(s)}
          </button>
        `).join('')}
      </div>
    </div>

    ${filtered.length === 0 ? `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🧩</div>
        <div class="crm-empty-title">${pt('emptyTitle')}</div>
        <div class="crm-empty-text">${pt('emptyText')}</div>
      </div>
    ` : `
      <div class="crm-table-wrap">
        <table class="crm-table">
          <thead>
            <tr>
              <th>${pt('colName')}</th>
              <th>${pt('colSpecs')}</th>
              <th>${pt('colPrice')}</th>
              <th>${pt('colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p) => `
              <tr class="clickable" onclick="CRMRouter.navigate('/packages/${p.id}/edit')">
                <td data-label="${pt('colName')}">
                  <div class="crm-row-name">${lang === 'ar' ? p.nameAr : p.nameEn}</div>
                  <div class="crm-row-sub">${p.components.length} ${pt('componentsCount')}</div>
                </td>
                <td data-label="${pt('colSpecs')}">
                  ${p.totalPanelWatts ? `<span class="status-pill tone-neutral">☀️ ${(p.totalPanelWatts / 1000).toFixed(1)}kW</span>` : ''}
                  ${p.totalBatteryKwh ? `<span class="status-pill tone-neutral">🔋 ${p.totalBatteryKwh}kWh</span>` : ''}
                  ${p.totalInverterWatts ? `<span class="status-pill tone-neutral">⚡ ${p.totalInverterWatts}W</span>` : ''}
                </td>
                <td data-label="${pt('colPrice')}">${Utils.fmtUSD(p.price)}</td>
                <td data-label="${pt('colStatus')}"><span class="status-pill ${statusTone(p.status)}">${statusLabel(p.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  Utils.qsa('[data-pkg-status-tab]', root).forEach((btn) => {
    btn.addEventListener('click', () => { _pkgStatusFilter = btn.dataset.pkgStatusTab; renderPackageListPage(root); });
  });
}
