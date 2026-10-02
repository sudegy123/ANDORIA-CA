/**
 * ANDORIA CRM — REQUESTS LIST PAGE
 * pages/requests.js
 *
 * Every request, searchable by name/phone/ID and filterable by status.
 * Filter/search state lives in module-local variables (not the URL) —
 * simple enough for Phase 1; re-visiting the page resets it.
 */

'use strict';

let _requestsFilterStatus = 'all';
let _requestsSearchQuery  = '';

async function renderRequestsPage(root) {
  if (!root) return;
  const rt = (k) => I18n.t('crm.requests.' + k);
  const ct = (k) => I18n.t('crm.common.' + k);

  root.innerHTML = `
    <div class="crm-skel crm-skel-line" style="width:180px;height:11px;margin-bottom:10px"></div>
    <div class="crm-skel crm-skel-line" style="width:280px;height:26px;margin-bottom:24px"></div>
    <div class="crm-skel-stack">${[0, 1, 2, 3, 4, 5].map(() => '<div class="crm-skel crm-skel-row"></div>').join('')}</div>
  `;
  const all = await CRMStore.list();
  const q = _requestsSearchQuery.trim().toLowerCase();

  const filtered = all.filter(r => {
    if (_requestsFilterStatus !== 'all' && r.status !== _requestsFilterStatus) return false;
    if (!q) return true;
    const haystack = [r.id, r.customer.name, r.customer.mobile, customerCityLabel(r)].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const statusTabs = ['all'].concat(Status.all());

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${rt('title')}</span>
    </div>
    <div class="crm-page-header">
      <div class="crm-page-title">${rt('title')}</div>
      <div class="crm-page-subtitle">${rt('subtitle')}</div>
    </div>

    <div class="crm-toolbar">
      <input type="text" class="crm-search-input" id="requests-search" placeholder="${ct('searchPlaceholder')}" value="${_requestsSearchQuery}">
    </div>
    <div class="crm-filter-tabs mb-4">
      ${statusTabs.map(s => `
        <button class="crm-filter-tab ${_requestsFilterStatus === s ? 'active' : ''}" data-status-tab="${s}">
          ${s === 'all' ? ct('filterAll') : Status.icon(s) + ' ' + Status.label(s)}
        </button>
      `).join('')}
    </div>

    ${filtered.length === 0 ? `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🔍</div>
        <div class="crm-empty-title">${all.length === 0 ? rt('emptyTitle') : ct('noResults')}</div>
        ${all.length === 0 ? `<div class="crm-empty-text">${rt('emptyText')}</div>` : ''}
      </div>
    ` : `
      <div class="crm-table-wrap">
        <table class="crm-table">
          <thead>
            <tr>
              <th>${rt('colId')}</th>
              <th>${rt('colCustomer')}</th>
              <th>التقييم / المصدر</th> <!-- New Column -->
              <th>${rt('colProperty')}</th>
              <th>${rt('colPackage')}</th>
              <th>${rt('colPrice')}</th>
              <th>${rt('colStatus')}</th>
              <th>${rt('colDate')}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.sort((a,b) => b.leadScore - a.leadScore || new Date(b.createdAt) - new Date(a.createdAt)).map(r => `
              <tr class="clickable" onclick="CRMRouter.navigate('/requests/${r.id}')">
                <td data-label="${rt('colId')}"><span class="crm-row-id">${r.id.split('-')[0]}</span></td>
                <td data-label="${rt('colCustomer')}">
                  <div class="crm-row-name">${r.customer.name || '—'}</div>
                  <div class="crm-row-sub">${customerPhoneDisplay(r)}${r.customer.city ? ' · ' + customerCityLabel(r) : ''}</div>
                </td>
                <td data-label="التقييم / المصدر">
                  <div style="display:flex;align-items:center;gap:4px;">
                     <span style="background:${r.leadScore >= 70 ? '#28a745' : r.leadScore >= 40 ? '#ffc107' : '#6c757d'};color:#fff;padding:2px 6px;border-radius:12px;font-size:11px;font-weight:bold;">
                       ${r.leadScore} نقطة
                     </span>
                  </div>
                  <div style="font-size:11px;color:#666;margin-top:4px;">
                     ${r.utmSource ? `🎯 ${r.utmSource}` : 'مباشر'}
                  </div>
                </td>
                <td data-label="${rt('colProperty')}">${propertyTypeLabel(r)}</td>
                <td data-label="${rt('colPackage')}">${packageDisplayName(r)}</td>
                <td data-label="${rt('colPrice')}">${Utils.fmtUSD(r.system.packagePrice || 0)}</td>
                <td data-label="${rt('colStatus')}">${statusPillHTML(r.status)}</td>
                <td data-label="${rt('colDate')}">${fmtDate(r.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  const searchInput = Utils.id('requests-search');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce(async (e) => {
      _requestsSearchQuery = e.target.value;
      await renderRequestsPage(root);
      // Restore focus + caret — the input was rebuilt from scratch.
      const el = Utils.id('requests-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 250));
  }

  Utils.qsa('[data-status-tab]', root).forEach(btn => {
    btn.addEventListener('click', () => {
      _requestsFilterStatus = btn.dataset.statusTab;
      renderRequestsPage(root);
    });
  });
}
