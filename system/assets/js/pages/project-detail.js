/**
 * ANDORIA CRM — PROJECT DETAIL PAGE
 * pages/project-detail.js
 *
 * One project's fulfillment pipeline: current stage, advance/cancel
 * controls, pricing snapshot, and the append-only timeline. Later
 * modules (Payments, Installments, Profit, Inventory Reservation) add
 * their own cards to this same page rather than a new one.
 */

'use strict';

async function renderProjectDetailPage(root, params) {
  if (!root) return;
  const dt = (k, vars) => I18n.t('crm.projectDetail.' + k, vars);
  const ct = (k) => I18n.t('crm.common.' + k);

  root.innerHTML = '<div class="crm-empty"><div class="anim-spin" style="display:inline-block;font-size:24px">⏳</div></div>';
  const project = await ProjectsStore.get(params.id);
  setTopbarTitle(project ? project.requestId : dt('notFoundTitle'));

  if (!project) {
    root.innerHTML = `
      <div class="crm-empty card">
        <div class="crm-empty-icon">🤷</div>
        <div class="crm-empty-title">${dt('notFoundTitle')}</div>
        <a href="#/projects" class="btn btn-secondary mt-6" style="display:inline-flex">${dt('backToProjects')}</a>
      </div>
    `;
    return;
  }

  const lang = I18n.getLang();

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/projects')">${I18n.t('crm.nav.projects')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${project.requestId}</span>
    </div>
    <div class="crm-detail-header">
      <div>
        <div class="crm-detail-id">${project.requestId}</div>
        <div class="crm-detail-meta">${ct('createdAt')}: ${fmtDate(project.createdAt)} · ${ct('updatedAt')}: ${fmtDate(project.updatedAt)}</div>
      </div>
      <span class="status-pill tone-${ProjectStatus.tone(project.status)}">${ProjectStatus.icon(project.status)} ${ProjectStatus.label(project.status)}</span>
    </div>

    <div class="crm-quick-actions-bar">
      <a href="#/requests/${project.requestId}" class="crm-quick-action">📋 ${dt('viewRequest')}</a>
    </div>

    <div class="crm-detail-grid">
      <div class="flex-col gap-4">

        <div class="card">
          <div class="crm-section-title">${dt('sectionInfo')}</div>
          <div class="crm-info-row"><span>${dt('package')}</span><b>${project.package ? (lang === 'ar' ? project.package.nameAr : project.package.nameEn) : '—'}</b></div>
          <div class="crm-info-row"><span>${dt('sellingPrice')}</span><b>${Utils.fmtUSD(project.sellingPrice)}</b></div>
        </div>

        <div class="card" id="status-section">
          <div class="crm-section-title">${dt('sectionStatus')}</div>
          <div class="crm-status-actions" id="project-status-actions"></div>
        </div>

      </div>

      <div class="flex-col gap-4">

        <div class="card">
          <div class="crm-section-title">${dt('sectionTimeline')}</div>
          <div class="crm-timeline">${renderProjectTimeline(project)}</div>
        </div>

      </div>
    </div>
  `;

  renderProjectStatusActions(project);
}

function renderProjectStatusActions(project) {
  const container = Utils.id('project-status-actions');
  if (!container) return;
  const dt = (k) => I18n.t('crm.projectDetail.' + k);

  const next = ProjectStatus.nextStatus(project.status);
  const canCancel = ProjectStatus.canCancel(project.status);

  if (!next && !canCancel) {
    container.innerHTML = `<div class="crm-timeline-text" style="color:var(--color-text-dim)">${dt('pipelineEnded')}</div>`;
    return;
  }

  container.innerHTML = `
    ${next ? `<button class="btn btn-primary" id="btn-advance-project">${dt('advanceTo')}: ${ProjectStatus.icon(next)} ${ProjectStatus.label(next)}</button>` : ''}
    ${canCancel ? `<button class="btn btn-secondary" id="btn-cancel-project">${dt('cancelProject')}</button>` : ''}
  `;

  const advanceBtn = Utils.id('btn-advance-project');
  if (advanceBtn) advanceBtn.addEventListener('click', async () => {
    await ProjectsStore.updateStatus(project.id, next);
    renderProjectDetailPage(Utils.id('page-root'), { id: project.id });
  });

  const cancelBtn = Utils.id('btn-cancel-project');
  if (cancelBtn) cancelBtn.addEventListener('click', async () => {
    if (!confirm(dt('confirmCancel'))) return;
    await ProjectsStore.updateStatus(project.id, ProjectStatus.CANCELLED);
    renderProjectDetailPage(Utils.id('page-root'), { id: project.id });
  });
}

function renderProjectTimeline(project) {
  const dt = (k) => I18n.t('crm.projectDetail.' + k);
  const tt = (k, vars) => I18n.t('crm.timeline.' + k, vars);

  const events = project.timeline || [];
  if (events.length === 0) return `<div class="crm-timeline-text" style="color:var(--color-text-dim)">${dt('timelineEmpty')}</div>`;

  return events.map((ev) => {
    let icon = '•';
    let text = '';
    if (ev.type === 'created') {
      icon = '📝';
      text = dt('timelineCreated');
    } else if (ev.type === 'status') {
      icon = ProjectStatus.icon(ev.status);
      text = tt('statusChanged', { from: ProjectStatus.label(ev.fromStatus), to: ProjectStatus.label(ev.status) });
    } else if (ev.type === 'note') {
      icon = '📝';
      text = tt('note', { text: ev.text });
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
