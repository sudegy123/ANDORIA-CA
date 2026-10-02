/**
 * ANDORIA CRM — CUSTOMER DETAIL PAGE
 * pages/customer-detail.js
 *
 * Full profile for one request: customer + recipient info, the
 * recommended system/package, sales assignment, the status workflow
 * control, WhatsApp sales handoff + report tools, PDF placeholders, and
 * the audit timeline. Status changes, notes, and edits (via the Edit
 * Request page) are the only ways this data changes — everything here
 * renders straight from CRMStore.
 */

'use strict';

async function renderCustomerDetailPage(root, id) {
  if (!root) return;
  const dt = (k, vars) => I18n.t('crm.detail.' + k, vars);
  const ct = (k) => I18n.t('crm.common.' + k);

  root.innerHTML = '<div class="crm-empty"><div class="anim-spin" style="display:inline-block;font-size:24px">⏳</div></div>';
  const record = await CRMStore.get(id);
  setTopbarTitle(record ? record.id : dt('notFoundTitle'));
  const existingProject = record ? await ProjectsStore.getByRequestId(record.id) : null;
  const canConvert = record && !existingProject && Status.progressIndex(record.status) >= Status.progressIndex('qualified');

  if (!record) {
    root.innerHTML = `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🤷</div>
        <div class="crm-empty-title">${dt('notFoundTitle')}</div>
        <div class="crm-empty-text">${dt('notFoundText')}</div>
        <a href="#/requests" class="btn btn-secondary mt-6" style="display:inline-flex">${ct('backToRequests')}</a>
      </div>
    `;
    return;
  }

  const isFamily = record.customer.beneficiary === 'family';
  const e164 = CountryManager.toE164(record.customer.mobileCountry, record.customer.mobile);
  const waHref  = 'https://wa.me/' + e164;
  const telHref = 'tel:+' + e164;

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/requests')">${I18n.t('crm.nav.requests')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${record.id}</span>
    </div>
    <div class="crm-detail-header">
      <div>
        <div class="crm-detail-id">${record.id}</div>
        <div class="crm-detail-meta">${ct('createdAt')}: ${fmtDate(record.createdAt)} · ${ct('updatedAt')}: ${fmtDate(record.updatedAt)}</div>
      </div>
      <div class="flex items-center gap-2" style="flex-wrap:wrap">
        ${priorityBadgeHTML(record.priority)}
        ${statusPillHTML(record.status)}
      </div>
    </div>

    <div class="crm-quick-actions-bar">
      <a href="#/requests/${record.id}/edit" class="crm-quick-action">✏️ ${dt('quickEdit')}</a>
      <button type="button" class="crm-quick-action" id="qa-copy-report">📋 ${dt('quickCopyReport')}</button>
      <button type="button" class="crm-quick-action" id="qa-kober">📲 ${dt('quickSendKober')}</button>
      <button type="button" class="crm-quick-action" id="qa-madani">📲 ${dt('quickSendMadani')}</button>
      <a href="#status-section" class="crm-quick-action">🔄 ${dt('quickChangeStatus')}</a>
    </div>

    <div class="crm-detail-grid">
      <div class="flex-col gap-4">

        <div class="card">
          <div class="crm-section-title">${dt('sectionCustomer')}</div>
          <div class="crm-info-row"><span>${ct('customer')}</span><b>${record.customer.name || '—'}</b></div>
          <div class="crm-info-row"><span>${ct('phone')}</span><b>${customerPhoneDisplay(record)}</b></div>
          <div class="crm-info-row"><span>${dt('whatsapp')}</span><b>${record.customer.whatsapp ? CountryManager.display(record.customer.mobileCountry, record.customer.whatsapp) : '—'}</b></div>
          <div class="crm-info-row"><span>${I18n.t('steps.profile.emailLabel')}</span><b>${record.customer.email || '—'}</b></div>
          <div class="crm-info-row"><span>${ct('location')}</span><b>${customerLocationLabel(record)}</b></div>
          <div class="crm-info-row"><span>${dt('city')}</span><b>${customerCityLabel(record)}</b></div>
          <div class="crm-info-row"><span>${dt('address')}</span><b>${record.customer.address || '—'}</b></div>
          <div class="crm-info-row"><span>${dt('mapsLink')}</span><b>${record.customer.mapsLink ? `<a href="${record.customer.mapsLink}" target="_blank" rel="noopener" style="color:var(--color-gold)">${dt('openMap')}</a>` : '—'}</b></div>
          <div class="crm-info-row"><span>${ct('property')}</span><b>${propertyTypeLabel(record)}</b></div>
          <div class="crm-info-row"><span>التقييم الآلي (Lead Score)</span><b><span style="background:${record.leadScore >= 70 ? '#28a745' : record.leadScore >= 40 ? '#ffc107' : '#6c757d'};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;">${record.leadScore || 0} نقطة</span></b></div>
          <div class="crm-info-row"><span>المصدر (UTM Source)</span><b>${record.utmSource ? `🎯 ${record.utmSource} ${record.utmCampaign ? '('+record.utmCampaign+')' : ''}` : 'مباشر (Direct)'}</b></div>
          <div class="crm-info-row"><span>${I18n.t('steps.profile.customerTypeLabel')}</span><b>${customerTypeLabel(record)}</b></div>
          <div class="crm-info-row"><span>${I18n.t('steps.profile.beneficiaryLabel')}</span><b>${isFamily ? ct('systemForFamily') : ct('systemForMyself')}</b></div>
          ${!isFamily && record.customer.stateId ? `<div class="crm-info-row"><span>${I18n.t('steps.profile.stateLabel')}</span><b>${customerStateLabel(record)}</b></div>` : ''}

          <div class="crm-quick-actions">
            <a class="btn btn-whatsapp" href="${waHref}" target="_blank" rel="noopener">💬 ${ct('whatsappCustomer')}</a>
            <a class="btn btn-secondary" href="${telHref}">📞 ${ct('callCustomer')}</a>
          </div>
        </div>

        ${isFamily && record.recipient ? `
          <div class="card">
            <div class="crm-section-title">${dt('sectionRecipient')}</div>
            <div class="crm-info-row"><span>${ct('customer')}</span><b>${record.recipient.name || '—'}</b></div>
            <div class="crm-info-row"><span>${ct('phone')}</span><b>${CountryManager.display('sudan', record.recipient.mobile)}</b></div>
            <div class="crm-info-row"><span>${I18n.t('steps.profile.stateLabel')}</span><b>${LocationManager.getStateName(record.recipient.stateId) || '—'}</b></div>
          </div>
        ` : ''}

        <div class="card">
          <div class="crm-section-title">${dt('sectionSystem')}</div>
          <div class="crm-info-row"><span>${ct('package')}</span><b>${packageDisplayName(record)}</b></div>
          <div class="crm-info-row"><span>${ct('price')}</span><b>${Utils.fmtUSD(record.system.packagePrice || 0)}</b></div>
          <div class="crm-info-row"><span>${dt('systemSize')}</span><b>${record.system.systemSize || '—'}</b></div>
          <div class="crm-info-row"><span>${dt('panels')}</span><b>${record.system.panelCount || '—'} × 400W</b></div>
          <div class="crm-info-row"><span>${dt('battery')}</span><b>${record.system.batteryKwh || '—'} kWh</b></div>
          <div class="crm-info-row"><span>${dt('inverter')}</span><b>${record.system.inverterW || '—'} W</b></div>
          <div class="crm-info-row"><span>${dt('backupHours')}</span><b>${record.system.backupHrs || '—'} ${I18n.t('units.hour')}</b></div>
          <div class="crm-info-row"><span>${dt('consumption')}</span><b>${record.system.monthlyConsumptionKwh || 0} kWh</b></div>
          <div class="crm-info-row"><span>${dt('peakLoad')}</span><b>${Utils.fmtW(record.system.peakW || 0)}</b></div>
        </div>

        ${(existingProject || canConvert) ? `
          <div class="card">
            <div class="crm-section-title">${dt('sectionProject')}</div>
            ${existingProject ? `
              <div class="crm-info-row"><span>${dt('projectStatus')}</span><span class="status-pill tone-${ProjectStatus.tone(existingProject.status)}">${ProjectStatus.icon(existingProject.status)} ${ProjectStatus.label(existingProject.status)}</span></div>
              <a href="#/projects/${existingProject.id}" class="btn btn-secondary mt-4" style="display:inline-flex">${dt('viewProject')}</a>
            ` : `
              <div class="crm-timeline-text" style="color:var(--color-text-dim);margin-bottom:var(--space-3)">${dt('convertHint')}</div>
              <button type="button" class="btn btn-primary" id="btn-convert-project">🏗️ ${dt('convertToProject')}</button>
            `}
          </div>
        ` : ''}

        <div class="card">
          <div class="crm-section-title">${dt('sectionSales')}</div>
          <div class="crm-info-row"><span>${dt('branch')}</span><b>${record.branch ? Branches.label(record.branch) : '—'}</b></div>
          <div class="crm-info-row"><span>${dt('assignedSales')}</span><b>${record.assignedSales || '—'}</b></div>
          <div class="crm-info-row"><span>${dt('priority')}</span><b>${I18n.t('crm.priority.' + record.priority)}</b></div>
          ${record.notes ? `<div class="crm-info-row" style="flex-direction:column;align-items:flex-start;gap:4px"><span>${dt('notes')}</span><b style="text-align:start">${record.notes}</b></div>` : ''}
        </div>

        <div class="card">
          <div class="crm-section-title">${dt('sectionSendSales')}</div>
          <div class="crm-branch-actions">
            <button type="button" class="btn crm-branch-btn-kober" id="btn-send-kober">📲 ${dt('sendToKober')}</button>
            <button type="button" class="btn crm-branch-btn-madani" id="btn-send-madani">📲 ${dt('sendToMadani')}</button>
          </div>
          <button type="button" class="btn btn-secondary mt-4" id="btn-copy-report">📋 ${dt('copyReport')}</button>
          <div class="crm-copy-feedback" id="copy-feedback"></div>
        </div>

        <div class="card">
          <div class="crm-section-title">${dt('sectionPdf')}</div>
          <div class="crm-quick-actions">
            <button type="button" class="btn btn-secondary" id="btn-view-pdf">📄 ${dt('viewPdf')}</button>
            <button type="button" class="btn btn-secondary" id="btn-share-pdf">🔗 ${dt('sharePdf')}</button>
          </div>
        </div>

      </div>

      <div class="flex-col gap-4">

        <div class="card" id="status-section">
          <div class="crm-section-title">${dt('sectionStatus')}</div>
          <div class="crm-status-current">${statusPillHTML(record.status)}</div>
          <div class="crm-status-actions" id="status-actions"></div>
        </div>

        <div class="card">
          <div class="crm-section-title">${dt('sectionTimeline')}</div>
          <div class="crm-timeline" id="crm-timeline">${renderTimeline(record)}</div>
          <form class="crm-note-form" id="note-form">
            <textarea class="crm-note-input" id="note-input" placeholder="${dt('notePlaceholder')}" rows="2"></textarea>
            <button type="submit" class="btn btn-secondary" style="flex-shrink:0">${dt('addNote')}</button>
          </form>
        </div>

      </div>
    </div>
  `;

  renderStatusActions(record);
  wireQuickActions(record);

  const convertBtn = Utils.id('btn-convert-project');
  if (convertBtn) convertBtn.addEventListener('click', async () => {
    try {
      const project = await ProjectsStore.convertFromRequest(record.id);
      CRMRouter.navigate('/projects/' + project.id);
    } catch (err) {
      Toast.error(err.message || String(err));
    }
  });

  const noteForm = Utils.id('note-form');
  if (noteForm) {
    noteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = Utils.id('note-input');
      const text = (input.value || '').trim();
      if (!text) return;
      CRMStore.addNote(record.id, text);
    });
  }
}

/** Wires the quick-actions bar + WhatsApp/Copy/PDF buttons. */
function wireQuickActions(record) {
  const dt = (k) => I18n.t('crm.detail.' + k);

  const copyBtn      = Utils.id('qa-copy-report');
  const copyBtnMain   = Utils.id('btn-copy-report');
  const koberBtn      = Utils.id('qa-kober');
  const koberBtnMain  = Utils.id('btn-send-kober');
  const madaniBtn     = Utils.id('qa-madani');
  const madaniBtnMain = Utils.id('btn-send-madani');
  const viewPdfBtn    = Utils.id('btn-view-pdf');
  const sharePdfBtn   = Utils.id('btn-share-pdf');

  [copyBtn, copyBtnMain].forEach(btn => btn && btn.addEventListener('click', () => copySalesReport(record)));
  [koberBtn, koberBtnMain].forEach(btn => btn && btn.addEventListener('click', () => sendToBranchSales(record, 'kober')));
  [madaniBtn, madaniBtnMain].forEach(btn => btn && btn.addEventListener('click', () => sendToBranchSales(record, 'madani')));
  [viewPdfBtn, sharePdfBtn].forEach(btn => btn && btn.addEventListener('click', () => Toast.info(dt('pdfNotGenerated'))));
}

/** Opens WhatsApp to the given branch's sales number with the report pre-filled. */
function sendToBranchSales(record, branchId) {
  const text = SalesReport.build(record);
  const url = `https://wa.me/${Branches.whatsappDigits(branchId)}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}

/** Copies the sales report to the clipboard, with a small inline confirmation. */
function copySalesReport(record) {
  const text = SalesReport.build(record);
  const feedback = Utils.id('copy-feedback');
  const done = (ok) => {
    if (feedback) {
      feedback.textContent = I18n.t('crm.detail.' + (ok ? 'reportCopied' : 'reportCopyFailed'));
      feedback.classList.add('visible');
      setTimeout(() => feedback.classList.remove('visible'), 2000);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => done(true)).catch(() => done(false));
  } else {
    done(false);
  }
}

/** The "move to next stage" / "cancel" buttons for the current status. */
function renderStatusActions(record) {
  const container = Utils.id('status-actions');
  if (!container) return;
  const dt = (k) => I18n.t('crm.detail.' + k);

  const next = Status.nextStatus(record.status);
  const canCancel = Status.canCancel(record.status);

  if (!next && !canCancel) {
    container.innerHTML = `<div class="crm-timeline-text" style="color:var(--color-text-dim)">${dt('pipelineEnded')}</div>`;
    return;
  }

  container.innerHTML = `
    ${next ? `<button class="btn btn-primary" id="btn-advance-status">${dt('changeStatusLabel')}: ${Status.icon(next)} ${Status.label(next)}</button>` : ''}
    ${canCancel ? `<button class="btn btn-secondary" id="btn-cancel-status">${dt('cancelRequest')}</button>` : ''}
  `;

  const advanceBtn = Utils.id('btn-advance-status');
  if (advanceBtn) advanceBtn.addEventListener('click', () => CRMStore.updateStatus(record.id, next));

  const cancelBtn = Utils.id('btn-cancel-status');
  if (cancelBtn) cancelBtn.addEventListener('click', () => CRMStore.updateStatus(record.id, Status.CANCELLED));
}

function renderTimeline(record) {
  const dt = (k) => I18n.t('crm.detail.' + k);
  const tt = (k, vars) => I18n.t('crm.timeline.' + k, vars);

  const events = (record.timeline || []).slice().sort((a, b) => b.at.localeCompare(a.at));
  if (events.length === 0) return `<div class="crm-timeline-text" style="color:var(--color-text-dim)">${dt('timelineEmpty')}</div>`;

  return events.map(ev => {
    let icon = '•';
    let text = '';
    if (ev.type === 'created') {
      icon = '🆕';
      text = tt('created');
    } else if (ev.type === 'status') {
      icon = Status.icon(ev.status);
      text = tt('statusChanged', { from: Status.label(ev.from), to: Status.label(ev.status) });
    } else if (ev.type === 'note') {
      icon = '📝';
      text = tt('note', { text: ev.text });
    } else if (ev.type === 'field') {
      icon = '✏️';
      text = tt('fieldActions.' + ev.action, {
        before: ev.before === '' || ev.before == null ? '—' : ev.before,
        after:  ev.after  === '' || ev.after  == null ? '—' : ev.after,
      });
    }
    const userLine = ev.user ? `<div class="crm-timeline-user">${I18n.t('crm.timeline.by', { user: ev.user })}</div>` : '';
    return `
      <div class="crm-timeline-item">
        <div class="crm-timeline-dot">${icon}</div>
        <div class="crm-timeline-body">
          <div class="crm-timeline-text">${text}</div>
          ${userLine}
          <div class="crm-timeline-time">${fmtDateTime(ev.at)}</div>
        </div>
      </div>
    `;
  }).join('');
}
