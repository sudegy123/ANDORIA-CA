/**
 * ANDORIA CRM — INVENTORY PRODUCT LIST PAGE
 * pages/inventory-list.js
 *
 * Every product, searchable by SKU/brand/model, filterable by category
 * and status. Same toolbar/table pattern as the Requests list page.
 */

'use strict';

let _invSearchQuery  = '';
let _invCategory     = 'all';
let _invStatus       = 'ACTIVE';

async function renderInventoryListPage(root, params, query) {
  if (!root) return;
  const dt = (k) => I18n.t('crm.inventoryList.' + k);
  const ct = (k) => I18n.t('crm.common.' + k);

  if (query && query.category) _invCategory = query.category;

  root.innerHTML = `
    <div class="crm-skel crm-skel-line" style="width:180px;height:11px;margin-bottom:10px"></div>
    <div class="crm-skel crm-skel-line" style="width:280px;height:26px;margin-bottom:24px"></div>
    <div class="crm-skel-stack">${[0, 1, 2, 3, 4, 5].map(() => '<div class="crm-skel crm-skel-row"></div>').join('')}</div>
  `;
  const all = await InventoryStore.list({
    category: _invCategory !== 'all' ? _invCategory : undefined,
    status: _invStatus !== 'all' ? _invStatus : undefined,
    search: _invSearchQuery || undefined,
  });

  const categoryTabs = ['all'].concat(ProductCategories.all().map((c) => c.id));

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/inventory')">${I18n.t('crm.nav.inventory')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${dt('title')}</span>
    </div>
    <div class="crm-page-header flex items-center justify-between" style="flex-wrap:wrap;gap:12px">
      <div>
        <div class="crm-page-title">${dt('title')}</div>
        <div class="crm-page-subtitle">${dt('subtitle')}</div>
      </div>
      <a href="#/inventory/products/new" class="btn btn-primary" style="width:auto;padding:12px 24px" id="btn-add-product">+ ${dt('addProduct')}</a>
    </div>

    <div class="crm-toolbar">
      <input type="text" class="crm-search-input" id="inv-search" placeholder="${dt('searchPlaceholder')}" value="${_invSearchQuery}">
      <div class="crm-filter-tabs">
        <button class="crm-filter-tab ${_invStatus === 'ACTIVE' ? 'active' : ''}" data-status-tab="ACTIVE">${dt('statusActive')}</button>
        <button class="crm-filter-tab ${_invStatus === 'ARCHIVED' ? 'active' : ''}" data-status-tab="ARCHIVED">${dt('statusArchived')}</button>
        <button class="crm-filter-tab ${_invStatus === 'all' ? 'active' : ''}" data-status-tab="all">${ct('filterAll')}</button>
      </div>
    </div>
    <div class="crm-filter-tabs mb-4">
      ${categoryTabs.map((c) => `
        <button class="crm-filter-tab ${_invCategory === c ? 'active' : ''}" data-category-tab="${c}">
          ${c === 'all' ? ct('filterAll') : ProductCategories.icon(c) + ' ' + ProductCategories.label(c)}
        </button>
      `).join('')}
    </div>

    ${all.length === 0 ? `
      <div class="crm-empty card">
        <div class="crm-empty-icon">📦</div>
        <div class="crm-empty-title">${dt('emptyTitle')}</div>
        <div class="crm-empty-text">${dt('emptyText')}</div>
      </div>
    ` : `
      <div class="crm-table-wrap">
        <table class="crm-table">
          <thead>
            <tr>
              <th>${dt('colSku')}</th>
              <th>${dt('colProduct')}</th>
              <th>${dt('colCategory')}</th>
              <th>${dt('colStock')}</th>
              <th>${dt('colPrice')}</th>
              <th>${dt('colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            ${all.map((p) => `
              <tr class="clickable" onclick="CRMRouter.navigate('/inventory/products/${p.id}')">
                <td data-label="${dt('colSku')}"><span class="crm-row-id">${p.sku}</span></td>
                <td data-label="${dt('colProduct')}">
                  <div class="crm-row-name">${p.brand} ${p.model}</div>
                  <div class="crm-row-sub">${p.specification || ''}</div>
                </td>
                <td data-label="${dt('colCategory')}">${ProductCategories.icon(p.category)} ${ProductCategories.label(p.category)}</td>
                <td data-label="${dt('colStock')}">
                  <span class="${p.lowStock ? 'status-pill tone-danger' : 'status-pill tone-success'}">${p.lowStock ? '⚠' : '✓'} ${p.available} ${p.unit}</span>
                </td>
                <td data-label="${dt('colPrice')}">${Utils.fmtUSD(p.sellingPrice)}</td>
                <td data-label="${dt('colStatus')}">${p.status === 'ACTIVE' ? `<span class="status-pill tone-success">${dt('statusActive')}</span>` : `<span class="status-pill tone-neutral">${dt('statusArchived')}</span>`}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  const searchInput = Utils.id('inv-search');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce(async (e) => {
      _invSearchQuery = e.target.value;
      await renderInventoryListPage(root);
      const el = Utils.id('inv-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 250));
  }

  Utils.qsa('[data-status-tab]', root).forEach((btn) => {
    btn.addEventListener('click', () => { _invStatus = btn.dataset.statusTab; renderInventoryListPage(root); });
  });
  Utils.qsa('[data-category-tab]', root).forEach((btn) => {
    btn.addEventListener('click', () => { _invCategory = btn.dataset.categoryTab; renderInventoryListPage(root); });
  });
}
