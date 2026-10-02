/**
 * ANDORIA CRM — ADD / EDIT PACKAGE FORM
 * pages/package-form.js
 *
 * One page backs both #/packages/new and #/packages/:id/edit. Staff pick
 * ACTIVE inventory products into a component list (qty each); the price
 * preview recomputes live client-side from each component's current
 * selling price + the installation cost — the exact same math
 * get_priced_packages() does server-side, so what staff see while
 * building is what the customer will see once published.
 */

'use strict';

let _pkgComponents = [];
let _pkgSubmitAttempted = false;

function _pkgComponentsTotal() {
  return _pkgComponents.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
}

async function renderPackageFormPage(root, params) {
  if (!root) return;
  _pkgComponents = [];
  _pkgSubmitAttempted = false;

  const isEdit = !!(params && params.id);
  const ft = (k) => I18n.t('crm.packageForm.' + k);

  let pkg = null;
  root.innerHTML = '<div class="crm-empty"><div class="anim-spin" style="display:inline-block;font-size:24px">⏳</div></div>';
  const [allPackages, allProducts] = await Promise.all([
    isEdit ? PackagesStore.listPriced() : Promise.resolve([]),
    InventoryStore.list({ status: 'ACTIVE' }),
  ]);

  if (isEdit) {
    pkg = allPackages.find((p) => p.id === params.id) || null;
    if (!pkg) {
      root.innerHTML = `
        <div class="crm-empty card">
          <div class="crm-empty-icon">🤷</div>
          <div class="crm-empty-title">${ft('notFoundTitle')}</div>
          <a href="#/packages" class="btn btn-secondary mt-6" style="display:inline-flex">${ft('backToPackages')}</a>
        </div>
      `;
      return;
    }
    _pkgComponents = pkg.components.map((c) => ({
      productId: c.productId, quantity: c.quantity, category: c.category,
      brand: c.brand, model: c.model, unitPrice: c.unitPrice,
    }));
  }
  setTopbarTitle(isEdit ? ft('editTitle') + ' — ' + (I18n.getLang() === 'ar' ? pkg.nameAr : pkg.nameEn) : ft('addTitle'));

  const field = (id, labelText, inputHtml) => `
    <div class="form-group">
      <label class="form-label">${labelText}</label>
      ${inputHtml}
      <div class="field-error" id="err-${id}"></div>
    </div>
  `;

  const productOptions = allProducts.map((p) => `
    <option value="${p.id}">${ProductCategories.icon(p.category)} ${p.brand} ${p.model} — ${Utils.fmtUSD(p.sellingPrice)}</option>
  `).join('');

  root.innerHTML = `
    <a href="#/packages" style="font-size:12px;font-weight:700;color:var(--color-text-muted);display:inline-block;margin-bottom:var(--space-4)">${ft('backToPackages')}</a>
    <div class="crm-page-header">
      <div class="crm-page-title">${isEdit ? ft('editTitle') : ft('addTitle')}</div>
    </div>

    <form id="pkg-form" data-edit-id="${isEdit ? pkg.id : ''}">
      <div class="crm-detail-grid">
        <div class="flex-col gap-4">

          <div class="card">
            <div class="crm-section-title">${ft('sectionInfo')}</div>
            ${field('pkg-name-en', ft('nameEn'), `<input type="text" class="form-input" id="pkg-name-en" value="${pkg?.nameEn || ''}">`)}
            ${field('pkg-name-ar', ft('nameAr'), `<input type="text" class="form-input" id="pkg-name-ar" value="${pkg?.nameAr || ''}">`)}
            ${field('pkg-desc-en', ft('descEn'), `<textarea class="form-input" id="pkg-desc-en" rows="2">${pkg?.descriptionEn || ''}</textarea>`)}
            ${field('pkg-desc-ar', ft('descAr'), `<textarea class="form-input" id="pkg-desc-ar" rows="2">${pkg?.descriptionAr || ''}</textarea>`)}
            ${field('pkg-status', ft('status'), `
              <select class="form-select" id="pkg-status">
                <option value="DRAFT" ${(!pkg || pkg.status === 'DRAFT') ? 'selected' : ''}>${ft('statusDraft')}</option>
                <option value="ACTIVE" ${pkg?.status === 'ACTIVE' ? 'selected' : ''}>${ft('statusActive')}</option>
                <option value="ARCHIVED" ${pkg?.status === 'ARCHIVED' ? 'selected' : ''}>${ft('statusArchived')}</option>
              </select>
            `)}
          </div>

        </div>

        <div class="flex-col gap-4">

          <div class="card">
            <div class="crm-section-title">${ft('sectionComponents')}</div>
            <div class="flex gap-2" style="align-items:flex-end;flex-wrap:wrap">
              <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">
                <label class="form-label">${ft('addComponent')}</label>
                <select class="form-select" id="pkg-add-product">${productOptions}</select>
              </div>
              <div class="form-group" style="width:80px;margin-bottom:0">
                <label class="form-label">${ft('qty')}</label>
                <input type="number" min="1" class="form-input" id="pkg-add-qty" value="1">
              </div>
              <button type="button" class="btn btn-secondary" id="btn-add-component" style="width:auto;padding:12px 16px">+</button>
            </div>
            <div class="field-error" id="err-pkg-components"></div>
            <div id="pkg-components-list" class="mt-6"></div>
          </div>

          <div class="card">
            <div class="crm-section-title">${ft('sectionPricing')}</div>
            <div class="crm-info-row"><span>${ft('componentsSubtotal')}</span><b id="pkg-subtotal">$0</b></div>
            ${field('pkg-installation-cost', ft('installationCost'), `<input type="number" min="0" step="0.01" class="form-input" id="pkg-installation-cost" value="${pkg?.installationCost ?? 0}">`)}
            ${field('pkg-margin', ft('defaultMarginPct'), `<input type="number" min="0" step="0.1" class="form-input" id="pkg-margin" value="${pkg?.defaultMarginPct ?? 0}">`)}
            <div class="crm-info-row" style="border-top:1px solid var(--color-border);padding-top:var(--space-3);margin-top:var(--space-3)">
              <span style="font-weight:700">${ft('totalPrice')}</span><b id="pkg-total" style="font-size:18px;color:var(--color-gold)">$0</b>
            </div>
          </div>

        </div>
      </div>

      <div class="crm-edit-actions">
        <button type="submit" class="btn btn-primary">${isEdit ? ft('save') : ft('addTitle')}</button>
        <a href="#/packages" class="btn btn-secondary">${ft('cancel')}</a>
      </div>
    </form>
  `;

  function renderComponentsList() {
    const listEl = Utils.id('pkg-components-list');
    if (!listEl) return;
    listEl.innerHTML = _pkgComponents.length === 0 ? `
      <div class="crm-timeline-text" style="color:var(--color-text-dim)">${ft('noComponents')}</div>
    ` : _pkgComponents.map((c, i) => `
      <div class="crm-info-row">
        <span>${ProductCategories.icon(c.category)} ${c.quantity}× ${c.brand} ${c.model}</span>
        <span class="flex items-center gap-2">
          <b>${Utils.fmtUSD(c.quantity * c.unitPrice)}</b>
          <button type="button" class="crm-quick-action" style="padding:4px 10px" data-remove-component="${i}">✕</button>
        </span>
      </div>
    `).join('');
    Utils.qsa('[data-remove-component]', listEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        _pkgComponents.splice(Number(btn.dataset.removeComponent), 1);
        renderComponentsList();
        updatePricePreview();
      });
    });
  }

  function updatePricePreview() {
    const subtotal = _pkgComponentsTotal();
    const installCost = Number(Utils.id('pkg-installation-cost')?.value) || 0;
    Utils.text(Utils.id('pkg-subtotal'), Utils.fmtUSD(subtotal));
    Utils.text(Utils.id('pkg-total'), Utils.fmtUSD(subtotal + installCost));
    if (_pkgSubmitAttempted) {
      const err = Utils.id('err-pkg-components');
      if (err) { err.textContent = _pkgComponents.length === 0 ? I18n.t('crm.validation.required') : ''; err.classList.toggle('visible', _pkgComponents.length === 0); }
    }
  }

  renderComponentsList();
  updatePricePreview();

  Utils.id('btn-add-component').addEventListener('click', () => {
    const productId = Utils.id('pkg-add-product').value;
    const qty = Number(Utils.id('pkg-add-qty').value) || 1;
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    const existing = _pkgComponents.find((c) => c.productId === productId);
    if (existing) existing.quantity += qty;
    else _pkgComponents.push({ productId, quantity: qty, category: product.category, brand: product.brand, model: product.model, unitPrice: product.sellingPrice });
    renderComponentsList();
    updatePricePreview();
  });

  Utils.id('pkg-installation-cost').addEventListener('input', updatePricePreview);

  const form = Utils.id('pkg-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    _pkgSubmitAttempted = true;

    const nameEn = Utils.id('pkg-name-en').value.trim();
    const nameAr = Utils.id('pkg-name-ar').value.trim();
    let valid = true;
    const errEnEl = Utils.id('err-pkg-name-en');
    const errArEl = Utils.id('err-pkg-name-ar');
    if (!nameEn) { errEnEl.textContent = I18n.t('crm.validation.required'); errEnEl.classList.add('visible'); valid = false; } else { errEnEl.textContent = ''; errEnEl.classList.remove('visible'); }
    if (!nameAr) { errArEl.textContent = I18n.t('crm.validation.required'); errArEl.classList.add('visible'); valid = false; } else { errArEl.textContent = ''; errArEl.classList.remove('visible'); }
    if (_pkgComponents.length === 0) valid = false;
    updatePricePreview();
    if (!valid) return;

    const input = {
      id: isEdit ? pkg.id : undefined,
      nameEn, nameAr,
      descriptionEn: Utils.id('pkg-desc-en').value.trim(),
      descriptionAr: Utils.id('pkg-desc-ar').value.trim(),
      installationCost: Number(Utils.id('pkg-installation-cost').value) || 0,
      defaultMarginPct: Number(Utils.id('pkg-margin').value) || 0,
      status: Utils.id('pkg-status').value,
      components: _pkgComponents.map((c) => ({ productId: c.productId, quantity: c.quantity })),
    };

    try {
      await PackagesStore.upsert(input);
      CRMRouter.navigate('/packages');
    } catch (err) {
      const errEl = Utils.id('err-pkg-components');
      if (errEl) { errEl.textContent = err.message || String(err); errEl.classList.add('visible'); }
    }
  });
}
