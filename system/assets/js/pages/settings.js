/**
 * ANDORIA CRM — SETTINGS (Administration)
 * pages/settings.js
 *
 * Company / Branches / Users in one page with tab navigation, matching
 * the Product Polish sprint's Administration module spec. Every write
 * action here is additionally gated by RLS server-side — the UI gating
 * (canManageAdmin(), hiding the nav link, read-only Company form for
 * non-admins) is a courtesy, not the security boundary.
 */

'use strict';

let _settingsTab = 'company';
let _editingBranchId = null;
let _editingUserId = null;

async function renderSettingsPage(root, tab) {
  if (!root) return;
  _settingsTab = tab || 'company';
  const st = (k, vars) => I18n.t('crm.settings.' + k, vars);

  if (!canManageAdmin()) {
    root.innerHTML = `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🔒</div>
        <div class="crm-empty-title">${st('accessDeniedTitle')}</div>
        <div class="crm-empty-text">${st('accessDeniedText')}</div>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${st('title')}</span>
    </div>
    <div class="crm-page-header">
      <div class="crm-page-title">${st('title')}</div>
      <div class="crm-page-subtitle">${st('subtitle')}</div>
    </div>

    <div class="crm-filter-tabs mb-4">
      ${['company', 'branches', 'users'].map((t) => `
        <button class="crm-filter-tab ${_settingsTab === t ? 'active' : ''}" data-settings-tab="${t}">${st('tab' + t.charAt(0).toUpperCase() + t.slice(1))}</button>
      `).join('')}
    </div>

    <div id="settings-tab-content"><div class="crm-skel crm-skel-card"></div></div>
  `;

  Utils.qsa('[data-settings-tab]', root).forEach((btn) => {
    btn.addEventListener('click', () => { CRMRouter.navigate('/settings/' + btn.dataset.settingsTab); });
  });

  const content = Utils.id('settings-tab-content');
  if (_settingsTab === 'branches') await renderBranchesTab(content);
  else if (_settingsTab === 'users') await renderUsersTab(content);
  else await renderCompanyTab(content);
}

// ═══════════════════════════════════════════════════════════════════
// COMPANY TAB
// ═══════════════════════════════════════════════════════════════════

async function renderCompanyTab(root) {
  const st = (k) => I18n.t('crm.settings.' + k);
  const settings = await SettingsStore.get();
  const canEdit = currentStaffRole() === 'OWNER' || currentStaffRole() === 'ADMIN' || currentStaffRole() === 'ACCOUNTANT';

  const field = (id, labelText, value, type = 'text') => `
    <div class="form-group">
      <label class="form-label">${labelText}</label>
      <input type="${type}" class="form-input" id="${id}" value="${value ?? ''}" ${canEdit ? '' : 'disabled'}>
    </div>
  `;

  root.innerHTML = `
    <div class="crm-panel">
      <div class="crm-panel-head"><div class="crm-panel-title">${st('companySectionInfo')}</div></div>
      <div class="crm-panel-body" style="padding:var(--space-5)">
        <div class="crm-detail-grid">
          <div class="flex-col gap-2">
            ${field('set-company-name', st('companyName'), settings?.companyName)}
            ${field('set-company-address', st('companyAddress'), settings?.companyAddress)}
            ${field('set-company-email', st('companyEmail'), settings?.companyEmail, 'email')}
            ${field('set-company-phone', st('companyPhone'), settings?.companyPhone)}
            ${field('set-company-whatsapp', st('companyWhatsapp'), settings?.companyWhatsapp)}
          </div>
          <div class="flex-col gap-2">
            ${field('set-currency', st('currency'), settings?.currency)}
            ${field('set-tax-pct', st('taxPct'), settings?.taxPct, 'number')}
            ${field('set-timezone', st('timezone'), settings?.timezone)}
            ${field('set-logo-url', st('logoUrl'), settings?.companyLogoUrl)}
          </div>
        </div>
        ${canEdit ? `<button type="button" class="btn btn-primary mt-6" id="btn-save-company">${st('save')}</button>` : `<div class="crm-eyebrow mt-4">${st('readOnlyNotice')}</div>`}
      </div>
    </div>

    ${currentStaffRole() === 'OWNER' || currentStaffRole() === 'ADMIN' ? `
    <div class="crm-panel mt-6" style="border-color: var(--color-danger); box-shadow: 0 0 10px rgba(255,50,50,0.1);">
      <div class="crm-panel-head"><div class="crm-panel-title" style="color: var(--color-danger);">منطقة الخطر (Danger Zone)</div></div>
      <div class="crm-panel-body" style="padding:var(--space-5)">
        <p style="color: var(--color-text-muted); margin-bottom: 1rem;">هذا الزر سيقوم بحذف جميع الطلبات، العملاء المحتملين، والمشاريع، وسيقوم بتصفير عداد لوحة التحكم ليبدأ من الصفر (SOL-000001). <b>هذا الإجراء لا يمكن التراجع عنه.</b></p>
        <button type="button" class="btn" id="btn-wipe-leads" style="background: var(--color-danger); color: white; width: auto;">🗑️ مسح المستخدمين وتصفير العداد</button>
      </div>
    </div>
    ` : ''}
  `;

  const saveBtn = Utils.id('btn-save-company');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    try {
      await SettingsStore.update({
        companyName: Utils.id('set-company-name').value.trim(),
        companyAddress: Utils.id('set-company-address').value.trim(),
        companyEmail: Utils.id('set-company-email').value.trim(),
        companyPhone: Utils.id('set-company-phone').value.trim(),
        companyWhatsapp: Utils.id('set-company-whatsapp').value.trim(),
        currency: Utils.id('set-currency').value.trim(),
        taxPct: Number(Utils.id('set-tax-pct').value) || 0,
        timezone: Utils.id('set-timezone').value.trim(),
        companyLogoUrl: Utils.id('set-logo-url').value.trim(),
      });
      Toast.success(st('saved'));
    } catch (err) {
      Toast.error(err.message || String(err));
    }
  });

  const wipeBtn = Utils.id('btn-wipe-leads');
  if (wipeBtn) wipeBtn.addEventListener('click', async () => {
    if (!confirm('هل أنت متأكد من رغبتك في مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه بأي شكل!')) return;
    if (prompt('للتأكيد، اكتب كلمة "مسح"') !== 'مسح') {
      Toast.error('تم إلغاء عملية المسح');
      return;
    }
    try {
      const { error } = await SupabaseClient.get().rpc('admin_wipe_all_leads');
      if (error) throw error;
      Toast.success('تم تصفير النظام بنجاح!');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      Toast.error(err.message || String(err));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// BRANCHES TAB
// ═══════════════════════════════════════════════════════════════════

async function renderBranchesTab(root) {
  const st = (k) => I18n.t('crm.settings.' + k);
  await Branches.refresh();
  const branches = Branches.all();

  root.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="crm-eyebrow">${st('branchesCount', { count: branches.length })}</div>
      <button type="button" class="btn btn-primary" id="btn-add-branch" style="width:auto">+ ${st('addBranch')}</button>
    </div>
    <div id="branch-form-wrap"></div>
    <div class="crm-table-wrap">
      <table class="crm-table">
        <thead><tr><th>${st('colName')}</th><th>${st('colManager')}</th><th>${st('colPhone')}</th><th>${st('colStatus')}</th><th></th></tr></thead>
        <tbody>
          ${branches.map((b) => `
            <tr>
              <td data-label="${st('colName')}"><b>${b.name}</b>${b.slug ? `<div class="crm-row-sub">${b.slug}</div>` : ''}</td>
              <td data-label="${st('colManager')}">${b.manager ? b.manager.name : '—'}</td>
              <td data-label="${st('colPhone')}">${b.whatsapp || b.phone || '—'}</td>
              <td data-label="${st('colStatus')}"><span class="status-pill ${b.active ? 'tone-success' : 'tone-neutral'}">${b.active ? st('active') : st('archived')}</span></td>
              <td style="text-align:end">
                <button type="button" class="crm-quick-action" data-edit-branch="${b.id}" style="padding:6px 12px">✏️</button>
                ${b.active
                  ? `<button type="button" class="crm-quick-action" data-archive-branch="${b.id}" style="padding:6px 12px">🗄</button>`
                  : `<button type="button" class="crm-quick-action" data-restore-branch="${b.id}" style="padding:6px 12px">↩</button>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  Utils.id('btn-add-branch').addEventListener('click', () => { _editingBranchId = null; renderBranchForm(); });
  Utils.qsa('[data-edit-branch]', root).forEach((btn) => btn.addEventListener('click', () => { _editingBranchId = btn.dataset.editBranch; renderBranchForm(); }));
  Utils.qsa('[data-archive-branch]', root).forEach((btn) => btn.addEventListener('click', async () => { await Branches.archive(btn.dataset.archiveBranch); Toast.success(st('saved')); renderBranchesTab(root); }));
  Utils.qsa('[data-restore-branch]', root).forEach((btn) => btn.addEventListener('click', async () => { await Branches.restore(btn.dataset.restoreBranch); Toast.success(st('saved')); renderBranchesTab(root); }));

  function renderBranchForm() {
    const b = _editingBranchId ? Branches.get(_editingBranchId) : null;
    const staffOptions = (_allStaffCache || []).map((u) => `<option value="${u.id}" ${b?.managerId === u.id ? 'selected' : ''}>${u.name}</option>`).join('');
    const wrap = Utils.id('branch-form-wrap');
    wrap.innerHTML = `
      <div class="crm-panel mb-4">
        <div class="crm-panel-head"><div class="crm-panel-title">${b ? st('editBranch') : st('addBranch')}</div></div>
        <div class="crm-panel-body" style="padding:var(--space-5)">
          <div class="crm-detail-grid">
            <div class="form-group"><label class="form-label">${st('colName')}</label><input type="text" class="form-input" id="branch-name" value="${b?.name || ''}"></div>
            <div class="form-group"><label class="form-label">${st('colManager')}</label><select class="form-select" id="branch-manager"><option value="">—</option>${staffOptions}</select></div>
            <div class="form-group"><label class="form-label">${st('colPhone')}</label><input type="text" class="form-input" id="branch-phone" value="${b?.phone || ''}"></div>
            <div class="form-group"><label class="form-label">WhatsApp</label><input type="text" class="form-input" id="branch-whatsapp" value="${b?.whatsapp || ''}"></div>
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">${st('companyAddress')}</label><input type="text" class="form-input" id="branch-address" value="${b?.address || ''}"></div>
          </div>
          <div class="crm-edit-actions">
            <button type="button" class="btn btn-primary" id="btn-save-branch">${st('save')}</button>
            <button type="button" class="btn btn-secondary" id="btn-cancel-branch">${st('cancel')}</button>
          </div>
        </div>
      </div>
    `;
    Utils.id('btn-cancel-branch').addEventListener('click', () => { wrap.innerHTML = ''; });
    Utils.id('btn-save-branch').addEventListener('click', async () => {
      const input = {
        name: Utils.id('branch-name').value.trim(),
        managerId: Utils.id('branch-manager').value || null,
        phone: Utils.id('branch-phone').value.trim(),
        whatsapp: Utils.id('branch-whatsapp').value.trim(),
        address: Utils.id('branch-address').value.trim(),
      };
      if (!input.name) { Toast.error(I18n.t('crm.validation.required')); return; }
      try {
        if (_editingBranchId) await Branches.update(_editingBranchId, input);
        else await Branches.create(input);
        Toast.success(st('saved'));
        wrap.innerHTML = '';
        renderBranchesTab(root);
      } catch (err) {
        Toast.error(err.message || String(err));
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════════

let _allStaffCache = [];

async function renderUsersTab(root) {
  const st = (k, vars) => I18n.t('crm.settings.' + k, vars);
  const users = await UsersStore.list();
  _allStaffCache = users.filter((u) => !u.archived);
  await Branches.refresh();
  const branches = Branches.all();
  const roles = ['OWNER', 'ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTANT', 'INSTALLER', 'VIEWER'];

  root.innerHTML = `
    <div class="crm-panel mb-4" style="border-color:var(--color-border-gold)">
      <div class="crm-panel-body" style="padding:var(--space-4) var(--space-5);display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">ℹ️</span>
        <div style="font-size:13px;color:var(--color-text-muted)">${st('createUserNotice')}</div>
      </div>
    </div>

    <div class="crm-table-wrap">
      <table class="crm-table">
        <thead><tr><th>${st('colName')}</th><th>${st('colRole')}</th><th>${st('colBranch')}</th><th>${st('colStatus')}</th><th></th></tr></thead>
        <tbody>
          ${users.map((u) => `
            <tr>
              <td data-label="${st('colName')}"><b>${u.name}</b></td>
              <td data-label="${st('colRole')}">
                <select class="form-select" data-role-select="${u.id}" style="padding:6px 10px;font-size:12px" ${u.role === 'OWNER' ? 'disabled' : ''}>
                  ${roles.map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${I18n.t('crm.roles.' + r)}</option>`).join('')}
                </select>
              </td>
              <td data-label="${st('colBranch')}">
                <select class="form-select" data-branch-select="${u.id}" style="padding:6px 10px;font-size:12px" ${u.role === 'OWNER' ? 'disabled' : ''}>
                  <option value="">—</option>
                  ${branches.map((b) => `<option value="${b.id}" ${u.branchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                </select>
              </td>
              <td data-label="${st('colStatus')}">
                ${u.archived ? `<span class="status-pill tone-neutral">${st('archived')}</span>`
                  : u.active ? `<span class="status-pill tone-success">${st('active')}</span>`
                  : `<span class="status-pill tone-warning">${st('deactivated')}</span>`}
              </td>
              <td style="text-align:end;white-space:nowrap">
                ${u.role === 'OWNER' ? '' : `
                  ${u.archived
                    ? `<button type="button" class="crm-quick-action" data-restore-user="${u.id}" style="padding:6px 10px">↩ ${st('restore')}</button>`
                    : `
                      ${u.active
                        ? `<button type="button" class="crm-quick-action" data-deactivate-user="${u.id}" style="padding:6px 10px">⏸ ${st('deactivate')}</button>`
                        : `<button type="button" class="crm-quick-action" data-reactivate-user="${u.id}" style="padding:6px 10px">▶ ${st('reactivate')}</button>`}
                      <button type="button" class="crm-quick-action" data-archive-user="${u.id}" style="padding:6px 10px">🗄</button>
                    `}
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  Utils.qsa('[data-role-select]', root).forEach((sel) => sel.addEventListener('change', async () => {
    try { await UsersStore.update(sel.dataset.roleSelect, { role: sel.value }); Toast.success(st('saved')); }
    catch (err) { Toast.error(err.message || String(err)); renderUsersTab(root); }
  }));
  Utils.qsa('[data-branch-select]', root).forEach((sel) => sel.addEventListener('change', async () => {
    try { await UsersStore.update(sel.dataset.branchSelect, { branchId: sel.value || null }); Toast.success(st('saved')); }
    catch (err) { Toast.error(err.message || String(err)); }
  }));
  Utils.qsa('[data-deactivate-user]', root).forEach((btn) => btn.addEventListener('click', async () => { await UsersStore.deactivate(btn.dataset.deactivateUser); Toast.success(st('saved')); renderUsersTab(root); }));
  Utils.qsa('[data-reactivate-user]', root).forEach((btn) => btn.addEventListener('click', async () => { await UsersStore.reactivate(btn.dataset.reactivateUser); Toast.success(st('saved')); renderUsersTab(root); }));
  Utils.qsa('[data-archive-user]', root).forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm(st('confirmArchiveUser'))) return;
    await UsersStore.archive(btn.dataset.archiveUser); Toast.success(st('saved')); renderUsersTab(root);
  }));
  Utils.qsa('[data-restore-user]', root).forEach((btn) => btn.addEventListener('click', async () => { await UsersStore.restore(btn.dataset.restoreUser); Toast.success(st('saved')); renderUsersTab(root); }));
}
