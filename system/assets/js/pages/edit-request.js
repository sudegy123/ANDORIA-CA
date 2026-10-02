/**
 * ANDORIA CRM — EDIT REQUEST PAGE
 * pages/edit-request.js
 *
 * Full edit form for one request (#/requests/:id/edit). Reuses the
 * wizard's own form classes (.form-group/.form-label/.form-input/
 * .form-select) and its inline-validation classes (.field-error/
 * .invalid) rather than inventing a second validation UI. On Save,
 * every changed field is diffed and written through
 * CRMStore.updateRequest() — CRMStore is what appends the per-field
 * audit timeline entries, this page just builds the patch.
 */

'use strict';

let _editTouched = new Set();
let _editSubmitAttempted = false;

/**
 * The tracked fields as an ordered list of {id, path, required, kind}
 * so the same spec drives both rendering and validation — same pattern
 * as the wizard's getProfileFieldSpecs().
 * @param {Object} record
 * @returns {Array}
 */
function getEditFieldSpecs() {
  return [
    { id: 'edit-name',        path: 'customer.name',        required: true },
    { id: 'edit-country',     path: 'customer.mobileCountry', required: true },
    { id: 'edit-phone',       path: 'customer.mobile',       required: true, kind: 'phone' },
    { id: 'edit-whatsapp',    path: 'customer.whatsapp',     required: false, kind: 'phone-optional' },
    { id: 'edit-email',       path: 'customer.email',        required: false, kind: 'email' },
    { id: 'edit-location',    path: 'customer.location',     required: false },
    { id: 'edit-city',        path: 'customer.city',         required: false },
    { id: 'edit-address',     path: 'customer.address',      required: false },
    { id: 'edit-maps',        path: 'customer.mapsLink',     required: false, kind: 'url' },
    { id: 'edit-property',    path: 'property.propertyType', required: false },
    { id: 'edit-consumption', path: 'system.monthlyConsumptionKwh', required: true, kind: 'number' },
    { id: 'edit-package',     path: 'system.packageId',      required: true },
    { id: 'edit-size',        path: 'system.systemSize',     required: false },
    { id: 'edit-battery',     path: 'system.batteryKwh',     required: false, kind: 'number' },
    { id: 'edit-inverter',    path: 'system.inverterW',      required: false, kind: 'number' },
    { id: 'edit-price',       path: 'system.packagePrice',   required: true, kind: 'number' },
    { id: 'edit-branch',      path: 'branch',                required: false },
    { id: 'edit-sales',       path: 'assignedSales',         required: false },
    { id: 'edit-priority',    path: 'priority',              required: false },
    { id: 'edit-notes',       path: 'notes',                 required: false },
  ];
}

function _readFieldValue(spec) {
  const el = Utils.id(spec.id);
  if (!el) return '';
  if (spec.kind === 'number') return el.value === '' ? '' : Number(el.value);
  return el.value;
}

/**
 * @param {Object} spec
 * @param {*} value
 * @returns {string} error i18n key, or '' if valid
 */
function _validateField(spec, value) {
  const isEmpty = value === '' || value === null || value === undefined;
  if (spec.required && isEmpty) return 'crm.validation.required';
  if (isEmpty) return '';

  if (spec.id === 'edit-phone' && !CountryManager.isValid(Utils.id('edit-country').value, String(value))) {
    return 'crm.validation.phoneInvalid';
  }
  if (spec.id === 'edit-whatsapp' && !CountryManager.isValid(Utils.id('edit-country').value, String(value))) {
    return 'crm.validation.phoneInvalid';
  }
  if (spec.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return 'crm.validation.emailInvalid';
  }
  if (spec.kind === 'url' && !/^https?:\/\/.+/i.test(String(value))) {
    return 'crm.validation.urlInvalid';
  }
  if (spec.kind === 'number' && (!isFinite(value) || Number(value) < 0)) {
    return 'crm.validation.numberInvalid';
  }
  return '';
}

function _touchEditField(id) {
  _editTouched.add(id);
  _refreshEditValidation();
}

/** @returns {{valid: boolean, firstInvalidId: string|null}} */
function _refreshEditValidation() {
  const specs = getEditFieldSpecs();
  let firstInvalidId = null;
  let valid = true;

  specs.forEach(spec => {
    const value = _readFieldValue(spec);
    const errKey = _validateField(spec, value);
    if (errKey) {
      valid = false;
      if (!firstInvalidId) firstInvalidId = spec.id;
    }
    const shouldShow = !!errKey && (_editTouched.has(spec.id) || _editSubmitAttempted);
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

async function renderEditRequestPage(root, id) {
  if (!root) return;
  _editTouched = new Set();
  _editSubmitAttempted = false;

  root.innerHTML = '<div class="crm-empty"><div class="anim-spin" style="display:inline-block;font-size:24px">⏳</div></div>';
  const record = await CRMStore.get(id);
  const et = (k) => I18n.t('crm.edit.' + k);
  setTopbarTitle(record ? et('title') + ' — ' + record.id : et('title'));

  if (!record) {
    root.innerHTML = `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🤷</div>
        <div class="crm-empty-title">${I18n.t('crm.detail.notFoundTitle')}</div>
        <a href="#/requests" class="btn btn-secondary mt-6" style="display:inline-flex">${I18n.t('crm.common.backToRequests')}</a>
      </div>
    `;
    return;
  }

  const countryOptions = CountryManager.getCountries().map(c => `
    <option value="${c.id}" ${record.customer.mobileCountry === c.id ? 'selected' : ''}>${c.flag} ${I18n.getLang() === 'en' ? c.name_en : c.name_ar}</option>
  `).join('');
  const locationOptions = CountryManager.getCountries().map(c => `
    <option value="${c.id}" ${record.customer.location === c.id ? 'selected' : ''}>${c.flag} ${I18n.getLang() === 'en' ? c.name_en : c.name_ar}</option>
  `).join('');
  const propertyTypes = ['house', 'apartment', 'shop', 'office', 'farm', 'clinic', 'school', 'mosque', 'workshop'];
  const propertyOptions = propertyTypes.map(t => `
    <option value="${t}" ${record.property.propertyType === t ? 'selected' : ''}>${I18n.t('steps.property.types.' + t)}</option>
  `).join('');
  const packageOptions = ['essential', 'standard', 'premium'].map(t => `
    <option value="${t}" ${record.system.packageId === t ? 'selected' : ''}>${I18n.t('steps.packages.tiers.' + t + '.name')}</option>
  `).join('');
  const branchOptions = `<option value="">${et('branchUnassigned')}</option>` + Branches.all().map(b => `
    <option value="${b.id}" ${record.branch === b.id ? 'selected' : ''}>${Branches.label(b.id)}</option>
  `).join('');
  const priorityOptions = ['low', 'medium', 'high', 'urgent'].map(p => `
    <option value="${p}" ${record.priority === p ? 'selected' : ''}>${I18n.t('crm.priority.' + p)}</option>
  `).join('');

  const field = (spec, labelText, inputHtml) => `
    <div class="form-group">
      <label class="form-label">${labelText}</label>
      ${inputHtml}
      <div class="field-error" id="err-${spec.id}"></div>
    </div>
  `;
  const specs = getEditFieldSpecs();
  const specById = {};
  specs.forEach(s => { specById[s.id] = s; });

  root.innerHTML = `
    <a href="#/requests/${record.id}" style="font-size:12px;font-weight:700;color:var(--color-text-muted);display:inline-block;margin-bottom:var(--space-4)">← ${record.id}</a>
    <div class="crm-page-header">
      <div class="crm-page-title">${et('title')}</div>
      <div class="crm-page-subtitle">${record.id} · ${record.customer.name || '—'}</div>
    </div>

    <form id="edit-request-form">
      <div class="crm-detail-grid">
        <div class="flex-col gap-4">

          <div class="card">
            <div class="crm-section-title">${I18n.t('crm.detail.sectionCustomer')}</div>
            ${field(specById['edit-name'], I18n.t('steps.profile.nameLabel'), `<input type="text" class="form-input" id="edit-name" value="${record.customer.name || ''}" oninput="_touchEditField('edit-name')" onblur="_touchEditField('edit-name')">`)}
            ${field(specById['edit-country'], I18n.t('steps.profile.mobileLabel') + ' — ' + et('countryCode'), `<select class="form-select" id="edit-country" onchange="_touchEditField('edit-country'); _refreshEditValidation();">${countryOptions}</select>`)}
            ${field(specById['edit-phone'], et('phone'), `<input type="tel" class="form-input" id="edit-phone" value="${record.customer.mobile || ''}" oninput="_touchEditField('edit-phone')" onblur="_touchEditField('edit-phone')">`)}
            ${field(specById['edit-whatsapp'], et('whatsapp'), `<input type="tel" class="form-input" id="edit-whatsapp" value="${record.customer.whatsapp || ''}" oninput="_touchEditField('edit-whatsapp')" onblur="_touchEditField('edit-whatsapp')">`)}
            ${field(specById['edit-email'], I18n.t('steps.profile.emailLabel'), `<input type="email" class="form-input" id="edit-email" value="${record.customer.email || ''}" oninput="_touchEditField('edit-email')" onblur="_touchEditField('edit-email')">`)}
          </div>

          <div class="card">
            <div class="crm-section-title">${et('sectionLocation')}</div>
            ${field(specById['edit-location'], et('country'), `<select class="form-select" id="edit-location" onchange="_touchEditField('edit-location')"><option value="">—</option>${locationOptions}</select>`)}
            ${field(specById['edit-city'], et('city'), `<input type="text" class="form-input" id="edit-city" value="${record.customer.city || ''}" oninput="_touchEditField('edit-city')" onblur="_touchEditField('edit-city')">`)}
            ${field(specById['edit-address'], et('address'), `<textarea class="form-input" id="edit-address" rows="2" oninput="_touchEditField('edit-address')" onblur="_touchEditField('edit-address')">${record.customer.address || ''}</textarea>`)}
            ${field(specById['edit-maps'], et('mapsLink'), `<input type="text" class="form-input" id="edit-maps" placeholder="https://maps.google.com/…" value="${record.customer.mapsLink || ''}" oninput="_touchEditField('edit-maps')" onblur="_touchEditField('edit-maps')">`)}
            ${field(specById['edit-property'], et('propertyType'), `<select class="form-select" id="edit-property" onchange="_touchEditField('edit-property')"><option value="">—</option>${propertyOptions}</select>`)}
          </div>

        </div>

        <div class="flex-col gap-4">

          <div class="card">
            <div class="crm-section-title">${et('sectionSystem')}</div>
            ${field(specById['edit-consumption'], et('consumption'), `<input type="number" min="0" class="form-input" id="edit-consumption" value="${record.system.monthlyConsumptionKwh || 0}" oninput="_touchEditField('edit-consumption')" onblur="_touchEditField('edit-consumption')">`)}
            ${field(specById['edit-package'], I18n.t('crm.common.package'), `<select class="form-select" id="edit-package" onchange="_touchEditField('edit-package')">${packageOptions}</select>`)}
            ${field(specById['edit-size'], et('systemSize'), `<input type="text" class="form-input" id="edit-size" value="${record.system.systemSize || ''}" oninput="_touchEditField('edit-size')" onblur="_touchEditField('edit-size')">`)}
            ${field(specById['edit-battery'], I18n.t('crm.detail.battery'), `<input type="number" min="0" step="0.1" class="form-input" id="edit-battery" value="${record.system.batteryKwh || 0}" oninput="_touchEditField('edit-battery')" onblur="_touchEditField('edit-battery')">`)}
            ${field(specById['edit-inverter'], I18n.t('crm.detail.inverter'), `<input type="number" min="0" class="form-input" id="edit-inverter" value="${record.system.inverterW || 0}" oninput="_touchEditField('edit-inverter')" onblur="_touchEditField('edit-inverter')">`)}
            ${field(specById['edit-price'], I18n.t('crm.common.price'), `<input type="number" min="0" class="form-input" id="edit-price" value="${record.system.packagePrice || 0}" oninput="_touchEditField('edit-price')" onblur="_touchEditField('edit-price')">`)}
          </div>

          <div class="card">
            <div class="crm-section-title">${et('sectionSales')}</div>
            ${field(specById['edit-branch'], et('branch'), `<select class="form-select" id="edit-branch" onchange="_touchEditField('edit-branch')">${branchOptions}</select>`)}
            ${field(specById['edit-sales'], et('assignedSales'), `<input type="text" class="form-input" id="edit-sales" value="${record.assignedSales || ''}" oninput="_touchEditField('edit-sales')" onblur="_touchEditField('edit-sales')">`)}
            ${field(specById['edit-priority'], et('priority'), `<select class="form-select" id="edit-priority" onchange="_touchEditField('edit-priority')">${priorityOptions}</select>`)}
            ${field(specById['edit-notes'], et('notes'), `<textarea class="form-input" id="edit-notes" rows="3" oninput="_touchEditField('edit-notes')" onblur="_touchEditField('edit-notes')">${record.notes || ''}</textarea>`)}
          </div>

        </div>
      </div>

      <div class="crm-edit-actions">
        <button type="submit" class="btn btn-primary">${et('save')}</button>
        <a href="#/requests/${record.id}" class="btn btn-secondary">${et('cancel')}</a>
      </div>
    </form>
  `;

  _refreshEditValidation();

  const form = Utils.id('edit-request-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    _editSubmitAttempted = true;
    const { valid, firstInvalidId } = _refreshEditValidation();
    if (!valid) {
      const el = Utils.id(firstInvalidId);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 250); }
      return;
    }

    const patch = {
      customer: {
        name: Utils.id('edit-name').value.trim(),
        mobileCountry: Utils.id('edit-country').value,
        mobile: Utils.id('edit-phone').value.trim(),
        whatsapp: Utils.id('edit-whatsapp').value.trim(),
        email: Utils.id('edit-email').value.trim(),
        location: Utils.id('edit-location').value,
        city: Utils.id('edit-city').value.trim(),
        address: Utils.id('edit-address').value.trim(),
        mapsLink: Utils.id('edit-maps').value.trim(),
      },
      property: {
        propertyType: Utils.id('edit-property').value || null,
      },
      system: {
        monthlyConsumptionKwh: Number(Utils.id('edit-consumption').value) || 0,
        packageId: Utils.id('edit-package').value,
        systemSize: Utils.id('edit-size').value.trim(),
        batteryKwh: Number(Utils.id('edit-battery').value) || 0,
        inverterW: Number(Utils.id('edit-inverter').value) || 0,
        packagePrice: Number(Utils.id('edit-price').value) || 0,
      },
      branch: Utils.id('edit-branch').value || null,
      assignedSales: Utils.id('edit-sales').value.trim(),
      priority: Utils.id('edit-priority').value,
      notes: Utils.id('edit-notes').value.trim(),
    };

    await CRMStore.updateRequest(record.id, patch);
    CRMRouter.navigate('/requests/' + record.id);
  });
}
