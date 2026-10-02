/**
 * ANDORIA CRM — PROJECT LIST PAGE
 * pages/project-list.js
 *
 * Every project (a request that's been converted into a real fulfillment
 * job), filterable by pipeline stage. Same toolbar/table pattern as the
 * Requests and Inventory list pages.
 */

'use strict';

let _projectStatusFilter = 'all';

async function renderProjectListPage(root) {
  if (!root) return;
  const pt = (k) => I18n.t('crm.projectList.' + k);
  const ct = (k) => I18n.t('crm.common.' + k);

  root.innerHTML = `
    <div class="crm-skel crm-skel-line" style="width:180px;height:11px;margin-bottom:10px"></div>
    <div class="crm-skel crm-skel-line" style="width:280px;height:26px;margin-bottom:24px"></div>
    <div class="crm-skel-stack">${[0, 1, 2, 3].map(() => '<div class="crm-skel crm-skel-row"></div>').join('')}</div>
  `;
  const all = await ProjectsStore.list();
  const lang = I18n.getLang();
  const filtered = _projectStatusFilter === 'all' ? all : all.filter((p) => p.status === _projectStatusFilter);

  const statusTabs = ['all'].concat(ProjectStatus.all());

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${pt('title')}</span>
    </div>
    <div class="crm-page-header">
      <div class="crm-page-title">${pt('title')}</div>
      <div class="crm-page-subtitle">${pt('subtitle')}</div>
    </div>

    <div class="crm-filter-tabs mb-4">
      ${statusTabs.map((s) => `
        <button class="crm-filter-tab ${_projectStatusFilter === s ? 'active' : ''}" data-project-status-tab="${s}">
          ${s === 'all' ? ct('filterAll') : ProjectStatus.icon(s) + ' ' + ProjectStatus.label(s)}
        </button>
      `).join('')}
    </div>

    ${filtered.length === 0 ? `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🏗️</div>
        <div class="crm-empty-title">${pt('emptyTitle')}</div>
        <div class="crm-empty-text">${pt('emptyText')}</div>
      </div>
    ` : `
      <div class="crm-table-wrap">
        <table class="crm-table">
          <thead>
            <tr>
              <th>${pt('colRequest')}</th>
              <th>${pt('colPackage')}</th>
              <th>${pt('colPrice')}</th>
              <th>${pt('colStatus')}</th>
              <th>${pt('colUpdated')}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p) => `
              <tr class="clickable" onclick="CRMRouter.navigate('/projects/${p.id}')">
                <td data-label="${pt('colRequest')}"><span class="crm-row-id">${p.requestId}</span></td>
                <td data-label="${pt('colPackage')}">${p.package ? (lang === 'ar' ? p.package.nameAr : p.package.nameEn) : '—'}</td>
                <td data-label="${pt('colPrice')}">${Utils.fmtUSD(p.sellingPrice)}</td>
                <td data-label="${pt('colStatus')}"><span class="status-pill tone-${ProjectStatus.tone(p.status)}">${ProjectStatus.icon(p.status)} ${ProjectStatus.label(p.status)}</span></td>
                <td data-label="${pt('colUpdated')}">${fmtDate(p.updatedAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  Utils.qsa('[data-project-status-tab]', root).forEach((btn) => {
    btn.addEventListener('click', () => { _projectStatusFilter = btn.dataset.projectStatusTab; renderProjectListPage(root); });
  });
}
