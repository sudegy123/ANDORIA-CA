/**
 * ANDORIA CRM — ADD / EDIT PRODUCT FORM
 * pages/inventory-form.js
 *
 * One page backs both #/inventory/products/new and
 * #/inventory/products/:id/edit — same inline-validation pattern the
 * wizard's Customer Profile and the CRM's Edit Request page already use.
 * Quantity is never editable here — only InventoryStore.adjustStock()
 * (on the detail page) may change it, so the stock ledger always
 * explains every change.
 */

'use strict';

let _prodTouched = new Set();
let _prodSubmitAttempted = false;

function getProductFieldSpecs(isEdit) {
  return [
    { id: 'prod-sku', required: true },
    { id: 'prod-category', required: true },
    { id: 'prod-brand', required: true },
    { id: 'prod-model', required: true },
    { id: 'prod-purchase-price', required: true, kind: 'number' },
    { id: 'prod-selling-price', required: true, kind: 'number' },
    { id: 'prod-min-stock', required: false, kind: 'number' },
    { id: 'prod-capacity', required: false, kind: 'number' },
    ...(isEdit ? [] : [{ id: 'prod-initial-qty', required: false, kind: 'number' }]),
  ];
}

// Which category gets a capacity field, and what it means for Live
// Pricing (assets/js/pricing-engine.js): SOLAR_PANEL/INVERTER capacity is
// in watts, BATTERY in kWh. Every other category has no live-pricing role
// (accessories/cables/mounting aren't part of the package price formula),
// so the field stays hidden for them.
function _capacityFieldFor(category) {
  if (category === 'SOLAR_PANEL' || category === 'INVERTER') return 'watts';
  if (category === 'BATTERY') return 'kwh';
  return null;
}

function _readProductFieldValue(spec) {
  const el = Utils.id(spec.id);
  if (!el) return '';
  if (spec.kind === 'number') return el.value === '' ? '' : Number(el.value);
  return el.value;
}

function _validateProductField(spec, value) {
  const isEmpty = value === '' || value === null || value === undefined;
  if (spec.required && isEmpty) return 'crm.validation.required';
  if (isEmpty) return '';
  if (spec.kind === 'number' && (!isFinite(value) || Number(value) < 0)) return 'crm.validation.numberInvalid';
  return '';
}

function _touchProductField(id) {
  _prodTouched.add(id);
  _refreshProductValidation();
}

function _refreshProductValidation() {
  const isEdit = !!Utils.id('prod-form')?.dataset.editId;
  const specs = getProductFieldSpecs(isEdit);
  let firstInvalidId = null;
  let valid = true;

  specs.forEach((spec) => {
    const value = _readProductFieldValue(spec);
    const errKey = _validateProductField(spec, value);
    if (errKey) {
      valid = false;
      if (!firstInvalidId) firstInvalidId = spec.id;
    }
    const shouldShow = !!errKey && (_prodTouched.has(spec.id) || _prodSubmitAttempted);
    const errEl = Utils.id('err-' + spec.id);
    if (errEl) {
      errEl.textContent = shouldShow ? I18n.t(errKey) : '';
      errEl.classList.toggle('visible', shouldShow);
    }
    const fieldEl = Utils.id(spec.id);
    if (fieldEl) fieldEl.classList.toggle('invalid', shouldShow);
  });

  return { valid, firstInvalidId };
}

async function renderInventoryFormPage(root, params) {
  if (!root) return;
  _prodTouched = new Set();
  _prodSubmitAttempted = false;

  const isEdit = !!(params && params.id);
  const ft = (k) => I18n.t('crm.inventoryForm.' + k);

  let product = null;
  if (isEdit) {
    root.innerHTML = '<div class="crm-empty"><div class="anim-spin" style="display:inline-block;font-size:24px">⏳</div></div>';
    product = await InventoryStore.get(params.id);
    if (!product) {
      root.innerHTML = `
        <div class="crm-empty card">
          <div class="crm-empty-icon">🤷</div>
          <div class="crm-empty-title">${I18n.t('crm.inventoryDetail.notFoundTitle')}</div>
          <a href="#/inventory/products" class="btn btn-secondary mt-6" style="display:inline-flex">${I18n.t('crm.inventoryDetail.backToProducts')}</a>
        </div>
      `;
      return;
    }
  }
  setTopbarTitle(isEdit ? ft('editTitle') + ' — ' + product.sku : ft('addTitle'));

  const suppliers = await SuppliersStore.list();

  const categoryOptions = ProductCategories.all().map((c) => `
    <option value="${c.id}" ${product?.category === c.id ? 'selected' : ''}>${c.icon} ${ProductCategories.label(c.id)}</option>
  `).join('');
  const supplierOptions = `<option value="">${ft('noSupplier')}</option>` + suppliers.map((s) => `
    <option value="${s.id}" ${product?.supplierId === s.id ? 'selected' : ''}>${s.company}</option>
  `).join('');

  const field = (id, labelText, inputHtml) => `
    <div class="form-group">
      <label class="form-label">${labelText}</label>
      ${inputHtml}
      <div class="field-error" id="err-${id}"></div>
    </div>
  `;

  root.innerHTML = `
    <a href="${isEdit ? '#/inventory/products/' + product.id : '#/inventory/products'}" style="font-size:12px;font-weight:700;color:var(--color-text-muted);display:inline-block;margin-bottom:var(--space-4)">← ${isEdit ? product.sku : ft('addTitle')}</a>
    <div class="crm-page-header">
      <div class="crm-page-title">${isEdit ? ft('editTitle') : ft('addTitle')}</div>
    </div>

    <form id="prod-form" data-edit-id="${isEdit ? product.id : ''}">
      <div class="crm-detail-grid">
        <div class="flex-col gap-4">

          <div class="card">
            <div class="crm-section-title">${ft('sectionInfo')}</div>
            ${field('prod-sku', ft('sku'), `<input type="text" class="form-input" id="prod-sku" value="${product?.sku || ''}" oninput="_touchProductField('prod-sku')" onblur="_touchProductField('prod-sku')">`)}
            ${field('prod-category', ft('category'), `<select class="form-select" id="prod-category" onchange="_touchProductField('prod-category'); _onCategoryChange()"><option value="">—</option>${categoryOptions}</select>`)}
            <div class="form-group" id="prod-capacity-group" style="display:none">
              <label class="form-label" id="prod-capacity-label"></label>
              <input type="number" min="0" step="0.01" class="form-input" id="prod-capacity" value="${product?.capacityWatts ?? product?.capacityKwh ?? ''}" oninput="_touchProductField('prod-capacity')">
              <div class="field-error" id="err-prod-capacity"></div>
              <div style="font-size:11px;color:var(--color-text-dim);margin-top:4px">${ft('capacityHint')}</div>
            </div>
            ${field('prod-brand', ft('brand'), `<input type="text" class="form-input" id="prod-brand" value="${product?.brand || ''}" oninput="_touchProductField('prod-brand')" onblur="_touchProductField('prod-brand')">`)}
            ${field('prod-model', ft('model'), `<input type="text" class="form-input" id="prod-model" value="${product?.model || ''}" oninput="_touchProductField('prod-model')" onblur="_touchProductField('prod-model')">`)}
            ${field('prod-spec', ft('specification'), `<textarea class="form-input" id="prod-spec" rows="2">${product?.specification || ''}</textarea>`)}
            ${field('prod-unit', ft('unit'), `<input type="text" class="form-input" id="prod-unit" value="${product?.unit || 'pcs'}">`)}
            ${field('prod-warranty', ft('warranty'), `<input type="text" class="form-input" id="prod-warranty" value="${product?.warranty || ''}">`)}
            ${field('prod-notes', ft('notes'), `<textarea class="form-input" id="prod-notes" rows="2">${product?.notes || ''}</textarea>`)}
          </div>

        </div>

        <div class="flex-col gap-4">

          <div class="card">
            <div class="crm-section-title">${ft('sectionPricing')}</div>
            ${field('prod-purchase-price', ft('purchasePrice'), `<input type="number" min="0" step="0.01" class="form-input" id="prod-purchase-price" value="${product?.purchasePrice ?? ''}" oninput="_touchProductField('prod-purchase-price')" onblur="_touchProductField('prod-purchase-price')">`)}
            ${field('prod-selling-price', ft('sellingPrice'), `<input type="number" min="0" step="0.01" class="form-input" id="prod-selling-price" value="${product?.sellingPrice ?? ''}" oninput="_touchProductField('prod-selling-price')" onblur="_touchProductField('prod-selling-price')">`)}
          </div>

          <div class="card">
            <div class="crm-section-title">${ft('sectionStock')}</div>
            ${isEdit
              ? `<div class="crm-info-row"><span>${ft('currentStock')}</span><b>${product.quantity} ${product.unit}</b></div>
                 <div class="crm-info-row" style="margin-bottom:var(--space-4)"><span>${ft('stockHint')}</span><b style="font-weight:400;font-size:11px;color:var(--color-text-dim)">${ft('stockHintText')}</b></div>`
              : field('prod-initial-qty', ft('initialQuantity'), `<input type="number" min="0" class="form-input" id="prod-initial-qty" value="0" oninput="_touchProductField('prod-initial-qty')">`)}
            ${field('prod-min-stock', ft('minStock'), `<input type="number" min="0" class="form-input" id="prod-min-stock" value="${product?.minStock ?? 0}" oninput="_touchProductField('prod-min-stock')">`)}
          </div>

          <div class="card">
            <div class="crm-section-title">${ft('sectionSupplier')}</div>
            ${field('prod-supplier', ft('supplier'), `<select class="form-select" id="prod-supplier">${supplierOptions}</select>`)}
          </div>

        </div>
      </div>

      <div class="crm-edit-actions">
        <button type="submit" class="btn btn-primary">${isEdit ? ft('save') : ft('addTitle')}</button>
        <a href="${isEdit ? '#/inventory/products/' + product.id : '#/inventory/products'}" class="btn btn-secondary">${ft('cancel')}</a>
      </div>
    </form>
  `;

  window._onCategoryChange = () => {
    const category = Utils.id('prod-category').value;
    const kind = _capacityFieldFor(category);
    const group = Utils.id('prod-capacity-group');
    const label = Utils.id('prod-capacity-label');
    if (!group || !label) return;
    group.style.display = kind ? '' : 'none';
    if (kind === 'watts') label.textContent = ft('capacityWatts');
    else if (kind === 'kwh') label.textContent = ft('capacityKwh');
  };
  window._onCategoryChange();

  _refreshProductValidation();

  const form = Utils.id('prod-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    _prodSubmitAttempted = true;
    const { valid, firstInvalidId } = _refreshProductValidation();
    if (!valid) {
      const el = Utils.id(firstInvalidId);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 250); }
      return;
    }

    const input = {
      sku: Utils.id('prod-sku').value.trim(),
      category: Utils.id('prod-category').value,
      brand: Utils.id('prod-brand').value.trim(),
      model: Utils.id('prod-model').value.trim(),
      specification: Utils.id('prod-spec').value.trim(),
      unit: Utils.id('prod-unit').value.trim() || 'pcs',
      purchasePrice: Number(Utils.id('prod-purchase-price').value),
      sellingPrice: Number(Utils.id('prod-selling-price').value),
      minStock: Number(Utils.id('prod-min-stock').value) || 0,
      warranty: Utils.id('prod-warranty').value.trim(),
      notes: Utils.id('prod-notes').value.trim(),
      supplierId: Utils.id('prod-supplier').value || null,
      capacityWatts: null,
      capacityKwh: null,
    };
    const capacityKind = _capacityFieldFor(input.category);
    const capacityVal = Utils.id('prod-capacity').value === '' ? null : Number(Utils.id('prod-capacity').value);
    if (capacityKind === 'watts') input.capacityWatts = capacityVal;
    else if (capacityKind === 'kwh') input.capacityKwh = capacityVal;

    try {
      if (isEdit) {
        await InventoryStore.update(product.id, input);
        CRMRouter.navigate('/inventory/products/' + product.id);
      } else {
        input.initialQuantity = Number(Utils.id('prod-initial-qty').value) || 0;
        const created = await InventoryStore.create(input);
        CRMRouter.navigate('/inventory/products/' + created.id);
      }
    } catch (err) {
      const errEl = Utils.id('err-prod-sku');
      if (errEl) {
        errEl.textContent = err.message && err.message.includes('duplicate') ? ft('skuTaken') : (err.message || String(err));
        errEl.classList.add('visible');
      }
    }
  });
}
