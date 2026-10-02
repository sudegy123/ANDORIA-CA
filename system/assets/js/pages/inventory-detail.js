/**
 * ANDORIA CRM — INVENTORY PRODUCT DETAIL PAGE
 * pages/inventory-detail.js
 *
 * Full product info, stock adjustment (in/out with a reason — goes
 * through InventoryStore.adjustStock, the atomic RPC), full stock
 * history, archive/restore.
 */

'use strict';

async function renderInventoryDetailPage(root, params) {
  if (!root) return;
  const dt = (k, vars) => I18n.t('crm.inventoryDetail.' + k, vars);

  root.innerHTML = '<div class="crm-empty"><div class="anim-spin" style="display:inline-block;font-size:24px">⏳</div></div>';
  const product = await InventoryStore.get(params.id);
  setTopbarTitle(product ? product.sku : dt('notFoundTitle'));

  if (!product) {
    root.innerHTML = `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🤷</div>
        <div class="crm-empty-title">${dt('notFoundTitle')}</div>
        <a href="#/inventory/products" class="btn btn-secondary mt-6" style="display:inline-flex">${dt('backToProducts')}</a>
      </div>
    `;
    return;
  }

  const history = await InventoryStore.stockHistory(product.id);

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/inventory/products')">${I18n.t('crm.inventoryList.title')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${product.sku}</span>
    </div>
    <div class="crm-detail-header">
      <div>
        <div class="crm-detail-id">${product.sku}</div>
        <div class="crm-detail-meta">${product.brand} ${product.model}</div>
      </div>
      <div class="flex items-center gap-2" style="flex-wrap:wrap">
        ${product.lowStock ? `<span class="status-pill tone-danger">⚠ ${dt('lowStock')}</span>` : ''}
        <span class="${product.status === 'ACTIVE' ? 'status-pill tone-success' : 'status-pill tone-neutral'}">${I18n.t('crm.inventoryList.status' + (product.status === 'ACTIVE' ? 'Active' : 'Archived'))}</span>
      </div>
    </div>

    <div class="crm-quick-actions-bar">
      <a href="#/inventory/products/${product.id}/edit" class="crm-quick-action">✏️ ${dt('editProduct')}</a>
      ${product.status === 'ACTIVE'
        ? `<button type="button" class="crm-quick-action" id="btn-archive">🗄 ${dt('archiveProduct')}</button>`
        : `<button type="button" class="crm-quick-action" id="btn-restore">↩ ${dt('restoreProduct')}</button>`}
    </div>

    <div class="crm-detail-grid">
      <div class="flex-col gap-4">

        <div class="card">
          <div class="crm-section-title">${dt('sectionInfo')}</div>
          <div class="crm-info-row"><span>${dt('category')}</span><b>${ProductCategories.icon(product.category)} ${ProductCategories.label(product.category)}</b></div>
          <div class="crm-info-row"><span>${dt('brand')}</span><b>${product.brand}</b></div>
          <div class="crm-info-row"><span>${dt('model')}</span><b>${product.model}</b></div>
          <div class="crm-info-row"><span>${dt('specification')}</span><b>${product.specification || '—'}</b></div>
          ${product.capacityWatts ? `<div class="crm-info-row"><span>${dt('capacityWatts')}</span><b>${product.capacityWatts} W</b></div>` : ''}
          ${product.capacityKwh ? `<div class="crm-info-row"><span>${dt('capacityKwh')}</span><b>${product.capacityKwh} kWh</b></div>` : ''}
          <div class="crm-info-row"><span>${dt('unit')}</span><b>${product.unit}</b></div>
          <div class="crm-info-row"><span>${dt('warranty')}</span><b>${product.warranty || '—'}</b></div>
          <div class="crm-info-row"><span>${dt('supplier')}</span><b>${product.supplier ? product.supplier.company : '—'}</b></div>
          ${product.notes ? `<div class="crm-info-row" style="flex-direction:column;align-items:flex-start;gap:4px"><span>${dt('notes')}</span><b style="text-align:start">${product.notes}</b></div>` : ''}
        </div>

        <div class="card">
          <div class="crm-section-title">${dt('sectionPricing')}</div>
          <div class="crm-info-row"><span>${dt('purchasePrice')}</span><b>${Utils.fmtUSD(product.purchasePrice)}</b></div>
          <div class="crm-info-row"><span>${dt('sellingPrice')}</span><b>${Utils.fmtUSD(product.sellingPrice)}</b></div>
          <div class="crm-info-row"><span>${dt('margin')}</span><b>${Utils.fmtUSD(product.sellingPrice - product.purchasePrice)}</b></div>
        </div>

      </div>

      <div class="flex-col gap-4">

        <div class="card">
          <div class="crm-section-title">${dt('sectionStock')}</div>
          <div class="crm-info-row"><span>${dt('currentStock')}</span><b>${product.quantity} ${product.unit}</b></div>
          <div class="crm-info-row"><span>${dt('reserved')}</span><b>${product.reservedQty} ${product.unit}</b></div>
          <div class="crm-info-row"><span>${dt('available')}</span><b>${product.available} ${product.unit}</b></div>
          <div class="crm-info-row"><span>${dt('minStock')}</span><b>${product.minStock} ${product.unit}</b></div>

          <form id="stock-adjust-form" class="mt-6">
            <div class="form-group">
              <label class="form-label">${dt('adjustStock')}</label>
              <div class="flex gap-2">
                <select class="form-select" id="adjust-type" style="flex:1">
                  <option value="MANUAL_IN">${dt('stockIn')}</option>
                  <option value="MANUAL_OUT">${dt('stockOut')}</option>
                </select>
                <input type="number" min="1" class="form-input" id="adjust-qty" placeholder="${dt('quantity')}" style="width:100px">
              </div>
              <div class="field-error" id="err-adjust"></div>
            </div>
            <div class="form-group">
              <input type="text" class="form-input" id="adjust-reason" placeholder="${dt('reasonPlaceholder')}">
            </div>
            <button type="submit" class="btn btn-secondary">${dt('applyAdjustment')}</button>
          </form>
        </div>

        <div class="card">
          <div class="crm-section-title">${dt('sectionHistory')}</div>
          ${history.length === 0 ? `<div class="crm-timeline-text" style="color:var(--color-text-dim)">${dt('noHistory')}</div>` : `
            <div class="crm-timeline">
              ${history.map((m) => `
                <div class="crm-timeline-item">
                  <div class="crm-timeline-dot">${['MANUAL_IN', 'PURCHASE_IN', 'RETURNED'].includes(m.type) ? '📥' : ['RESERVED'].includes(m.type) ? '🔒' : ['RELEASED'].includes(m.type) ? '🔓' : '📤'}</div>
                  <div class="crm-timeline-body">
                    <div class="crm-timeline-text">${I18n.t('crm.stockMovement.' + m.type)}: ${m.quantity} ${product.unit}${m.reason ? ' — ' + m.reason : ''}</div>
                    ${m.user ? `<div class="crm-timeline-user">${I18n.t('crm.timeline.by', { user: m.user.name })}</div>` : ''}
                    <div class="crm-timeline-time">${fmtDateTime(m.createdAt)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    </div>
  `;

  const archiveBtn = Utils.id('btn-archive');
  if (archiveBtn) archiveBtn.addEventListener('click', async () => {
    await InventoryStore.archive(product.id);
    renderInventoryDetailPage(root, params);
  });
  const restoreBtn = Utils.id('btn-restore');
  if (restoreBtn) restoreBtn.addEventListener('click', async () => {
    await InventoryStore.restore(product.id);
    renderInventoryDetailPage(root, params);
  });

  const adjustForm = Utils.id('stock-adjust-form');
  if (adjustForm) {
    adjustForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = Utils.id('adjust-type').value;
      const qty = Number(Utils.id('adjust-qty').value);
      const reason = Utils.id('adjust-reason').value.trim();
      const errEl = Utils.id('err-adjust');

      if (!qty || qty <= 0) {
        errEl.textContent = I18n.t('crm.validation.numberInvalid');
        errEl.classList.add('visible');
        return;
      }
      errEl.classList.remove('visible');

      try {
        await InventoryStore.adjustStock(product.id, type, qty, reason || I18n.t('crm.inventoryDetail.manualAdjustment'));
        renderInventoryDetailPage(root, params);
      } catch (err) {
        errEl.textContent = err.message || String(err);
        errEl.classList.add('visible');
      }
    });
  }
}
