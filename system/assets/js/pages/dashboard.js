/**
 * ANDORIA CRM — DASHBOARD PAGE
 * pages/dashboard.js
 *
 * Command-center view: pipeline volume by time window, money (revenue/
 * profit/outstanding — computed from real projects+payments data, zero
 * for now until Payments/Purchase modules populate cost fields, never
 * fabricated), operational health (low stock, in-progress projects),
 * a unified recent-activity feed, and the top salesperson/branch by
 * request volume. Every number here reads from existing tables — no
 * new schema, no new module.
 */

'use strict';

function _dashboardSkeleton() {
  return `
    <div class="crm-page-header">
      <div class="crm-eyebrow" style="margin-bottom:6px">Andoria Solar · Command Center</div>
      <div class="crm-page-title">${I18n.t('crm.dashboard.title')}</div>
    </div>
    <div class="crm-skel-grid">
      ${[0, 1, 2, 3].map(() => '<div class="crm-skel crm-skel-stat"></div>').join('')}
    </div>
    <div class="crm-skel-grid">
      ${[0, 1, 2, 3, 4].map(() => '<div class="crm-skel crm-skel-stat"></div>').join('')}
    </div>
    <div class="crm-detail-grid">
      <div class="crm-skel-stack">${[0, 1, 2, 3].map(() => '<div class="crm-skel crm-skel-row"></div>').join('')}</div>
      <div class="crm-skel-stack">${[0, 1, 2].map(() => '<div class="crm-skel crm-skel-card"></div>').join('')}</div>
    </div>
  `;
}

async function _fetchPaymentTotals() {
  try {
    const { data, error } = await SupabaseClient.get().from('payments').select('amount, status');
    if (error) throw error;
    const paid = (data || []).filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount || 0), 0);
    return { paid };
  } catch (e) {
    console.error('[Dashboard] payments aggregate failed:', e);
    return { paid: 0 };
  }
}

function _dayBarsChart(requests) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(d);
  }
  const counts = days.map((d) => requests.filter((r) => {
    const rd = new Date(r.createdAt);
    return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth() && rd.getDate() === d.getDate();
  }).length);
  const max = Math.max(1, ...counts);
  const lang = I18n.getLang();
  const dayLabel = (d) => d.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', { weekday: 'short' });

  return `
    <div class="crm-chart-bars">
      ${days.map((d, i) => `
        <div class="crm-chart-col">
          <div class="crm-chart-bar-track">
            <div class="crm-chart-bar" style="height:${Math.max(4, (counts[i] / max) * 100)}%"></div>
          </div>
          <div class="crm-chart-bar-val">${counts[i]}</div>
          <div class="crm-chart-bar-label">${dayLabel(d)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderDashboardPage(root) {
  if (!root) return;
  const dt = (k, vars) => I18n.t('crm.dashboard.' + k, vars);

  root.innerHTML = _dashboardSkeleton();

  const [requests, projects, lowStock, paymentTotals] = await Promise.all([
    CRMStore.list(),
    ProjectsStore.list(),
    InventoryStore.lowStock(),
    _fetchPaymentTotals(),
  ]);

  // ── Time windows ──────────────────────────────────────────────
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const inWindow = (iso, from) => new Date(iso) >= from;

  const todayCount = requests.filter((r) => inWindow(r.createdAt, startOfToday)).length;
  const weekCount = requests.filter((r) => inWindow(r.createdAt, startOfWeek)).length;
  const monthCount = requests.filter((r) => inWindow(r.createdAt, startOfMonth)).length;

  // ── Money (real, from existing schema — zero until Payments/Purchase populate it) ──
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED');
  const activeProjects = projects.filter((p) => !['COMPLETED', 'CANCELLED'].includes(p.status));
  const revenue = completedProjects.reduce((s, p) => s + Number(p.sellingPrice || 0), 0);
  const profit = completedProjects.reduce((s, p) => {
    const cost = Number(p.materialCost || 0) + Number(p.installationCost || 0) + Number(p.transportationCost || 0) + Number(p.laborCost || 0) + Number(p.miscCost || 0);
    return s + (Number(p.sellingPrice || 0) - cost);
  }, 0);
  const pipelineValue = projects.filter((p) => p.status !== 'CANCELLED').reduce((s, p) => s + Number(p.sellingPrice || 0), 0);
  const outstanding = Math.max(0, pipelineValue - paymentTotals.paid);

  // ── Top salesperson / branch, by request volume ──────────────
  const bySales = {};
  const byBranch = {};
  requests.forEach((r) => {
    const sales = (r.assignedSales || '').trim();
    if (sales) bySales[sales] = (bySales[sales] || 0) + 1;
    if (r.branch) byBranch[r.branch] = (byBranch[r.branch] || 0) + 1;
  });
  const topSales = Object.entries(bySales).sort((a, b) => b[1] - a[1])[0];
  const topBranch = Object.entries(byBranch).sort((a, b) => b[1] - a[1])[0];

  // ── Unified recent activity: requests + projects, merged by recency ──
  const activity = [
    ...requests.slice(0, 8).map((r) => ({ kind: 'request', at: r.createdAt, r })),
    ...projects.slice(0, 8).map((p) => ({ kind: 'project', at: p.updatedAt, p })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 7);

  root.innerHTML = `
    <div class="crm-page-header">
      <div class="crm-eyebrow" style="margin-bottom:6px">Andoria Solar · Command Center</div>
      <div class="crm-page-title">${dt('title')}</div>
      <div class="crm-page-subtitle">${dt('subtitle')}</div>
    </div>

    <div class="crm-stats-grid sg4 anim-stagger">
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statToday')}</div>
        <div class="crm-stat-val">${todayCount}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statWeek')}</div>
        <div class="crm-stat-val">${weekCount}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statMonth')}</div>
        <div class="crm-stat-val">${monthCount}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statTotal')}</div>
        <div class="crm-stat-val">${requests.length}</div>
      </div>
    </div>

    <div class="crm-stats-grid sg5 anim-stagger">
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statRevenue')}</div>
        <div class="crm-stat-val" style="font-size:22px">${Utils.fmtUSD(revenue)}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statProfit')}</div>
        <div class="crm-stat-val" style="font-size:22px">${Utils.fmtUSD(profit)}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statOutstanding')}</div>
        <div class="crm-stat-val" style="font-size:22px">${Utils.fmtUSD(outstanding)}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statProjectsActive')}</div>
        <div class="crm-stat-val">${activeProjects.length}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statProjectsDone')}</div>
        <div class="crm-stat-val">${completedProjects.length}</div>
      </div>
    </div>

    <div class="crm-detail-grid">
      <div class="flex-col gap-4">

        <div class="crm-panel">
          <div class="crm-panel-head">
            <div class="crm-panel-title">${dt('chartTitle')}</div>
            <div class="crm-eyebrow">${dt('chartSub')}</div>
          </div>
          <div class="crm-panel-body" style="padding:var(--space-5)">
            ${_dayBarsChart(requests)}
          </div>
        </div>

        <div class="crm-panel">
          <div class="crm-panel-head">
            <div class="crm-panel-title">${dt('recentTitle')}</div>
            ${requests.length > 0 ? `<span class="crm-panel-link" onclick="CRMRouter.navigate('/requests')">${dt('viewAll')}</span>` : ''}
          </div>
          <div class="crm-panel-body">
            ${activity.length === 0 ? `
              <div class="crm-empty">
                <div class="crm-empty-icon">📭</div>
                <div class="crm-empty-title">${dt('emptyTitle')}</div>
                <div class="crm-empty-text">${dt('emptyText')}</div>
              </div>
            ` : activity.map((item) => item.kind === 'request' ? `
              <div class="crm-recent-item" style="border-radius:0;border-left:0;border-right:0;border-top:0;box-shadow:none" onclick="CRMRouter.navigate('/requests/${item.r.id}')">
                <div style="min-width:0">
                  <div class="crm-row-id">${item.r.id}</div>
                  <div class="crm-row-name">${item.r.customer.name || '—'}</div>
                  <div class="crm-row-sub">${dt('activityNewRequest')}</div>
                </div>
                <div class="flex items-center gap-3" style="flex-shrink:0">
                  <div class="crm-row-sub">${fmtDate(item.r.createdAt)}</div>
                  ${statusPillHTML(item.r.status)}
                </div>
              </div>
            ` : `
              <div class="crm-recent-item" style="border-radius:0;border-left:0;border-right:0;border-top:0;box-shadow:none" onclick="CRMRouter.navigate('/projects/${item.p.id}')">
                <div style="min-width:0">
                  <div class="crm-row-id">${item.p.requestId}</div>
                  <div class="crm-row-name">${dt('activityProjectUpdate')}</div>
                </div>
                <div class="flex items-center gap-3" style="flex-shrink:0">
                  <div class="crm-row-sub">${fmtDate(item.p.updatedAt)}</div>
                  <span class="status-pill tone-${ProjectStatus.tone(item.p.status)}">${ProjectStatus.icon(item.p.status)} ${ProjectStatus.label(item.p.status)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <div class="flex-col gap-4">

        ${lowStock.length > 0 ? `
          <div class="crm-panel">
            <div class="crm-panel-head">
              <div class="crm-panel-title">⚠ ${dt('lowStockTitle')}</div>
              <span class="crm-panel-link" onclick="CRMRouter.navigate('/inventory/products')">${dt('viewAll')}</span>
            </div>
            <div class="crm-panel-body">
              ${lowStock.slice(0, 5).map((p) => `
                <div class="crm-recent-item" style="border-radius:0;border-left:0;border-right:0;border-top:0;box-shadow:none" onclick="CRMRouter.navigate('/inventory/products/${p.id}')">
                  <div style="min-width:0">
                    <div class="crm-row-name">${p.brand} ${p.model}</div>
                    <div class="crm-row-sub">${p.sku}</div>
                  </div>
                  <div class="status-pill tone-danger">${p.available} / ${p.minStock}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="crm-panel">
          <div class="crm-panel-head"><div class="crm-panel-title">${dt('topPerformersTitle')}</div></div>
          <div class="crm-panel-body" style="padding:var(--space-4) var(--space-5)">
            <div class="crm-info-row"><span>${dt('topSalesperson')}</span><b>${topSales ? `${topSales[0]} · ${topSales[1]}` : '—'}</b></div>
            <div class="crm-info-row"><span>${dt('topBranch')}</span><b>${topBranch ? `${Branches.label(topBranch[0])} · ${topBranch[1]}` : '—'}</b></div>
          </div>
        </div>

      </div>
    </div>
  `;
}
