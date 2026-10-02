/**
 * ANDORIA CRM — INVENTORY DASHBOARD PAGE
 * pages/inventory-dashboard.js
 *
 * Stat tiles, category breakdown, low-stock alerts, recent stock
 * activity. Read-only — every click hands off to the product list/detail.
 */

'use strict';

async function renderInventoryDashboardPage(root) {
  if (!root) return;
  const dt = (k) => I18n.t('crm.inventoryDashboard.' + k);
  root.innerHTML = `
    <div class="crm-skel crm-skel-line" style="width:180px;height:11px;margin-bottom:10px"></div>
    <div class="crm-skel crm-skel-line" style="width:280px;height:26px;margin-bottom:24px"></div>
    <div class="crm-skel-grid">${[0, 1, 2, 3].map(() => '<div class="crm-skel crm-skel-stat"></div>').join('')}</div>
    <div class="crm-skel-grid">${[0, 1, 2, 3, 4, 5, 6].map(() => '<div class="crm-skel crm-skel-card"></div>').join('')}</div>
  `;

  const [products, movements, livePricing] = await Promise.all([
    InventoryStore.list({ status: 'ACTIVE' }),
    InventoryStore.recentMovements(8),
    PricingEngine.getLivePrices(true),
  ]);

  const totalProducts = products.length;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const inventoryValue = products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0);
  const lowStock = products.filter((p) => p.lowStock);

  const pricingGaps = [
    { key: 'panel', category: 'SOLAR_PANEL' },
    { key: 'battery', category: 'BATTERY' },
    { key: 'inverter', category: 'INVERTER' },
  ].filter((c) => !livePricing.sourced[c.key]);

  const byCategory = {};
  products.forEach((p) => {
    if (!byCategory[p.category]) byCategory[p.category] = { count: 0, value: 0 };
    byCategory[p.category].count += 1;
    byCategory[p.category].value += p.quantity * p.purchasePrice;
  });

  root.innerHTML = `
    <div class="crm-breadcrumb">
      <span class="crm-breadcrumb-link" onclick="CRMRouter.navigate('/dashboard')">${I18n.t('crm.nav.dashboard')}</span>
      <span class="crm-breadcrumb-sep">/</span>
      <span class="crm-breadcrumb-current">${dt('title')}</span>
    </div>
    <div class="crm-page-header">
      <div class="crm-page-title">${dt('title')}</div>
      <div class="crm-page-subtitle">${dt('subtitle')}</div>
    </div>

    <div class="crm-stats-grid sg4 anim-stagger">
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statProducts')}</div>
        <div class="crm-stat-val">${totalProducts}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statUnits')}</div>
        <div class="crm-stat-val">${Utils.fmt(totalUnits)}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statValue')}</div>
        <div class="crm-stat-val" style="font-size:22px">${Utils.fmtUSD(inventoryValue)}</div>
      </div>
      <div class="crm-stat-tile anim-fade-in">
        <div class="crm-stat-label-v2">${dt('statLowStock')}</div>
        <div class="crm-stat-val" style="${lowStock.length ? 'color:var(--color-danger)' : ''}">${lowStock.length}</div>
        ${lowStock.length ? '<div class="crm-stat-dot danger"></div>' : ''}
      </div>
    </div>

    ${pricingGaps.length > 0 ? `
      <div class="card mb-6" style="border-color:var(--color-warning)">
        <div class="crm-section-title" style="margin-bottom:8px">⚠ ${dt('pricingGapTitle')}</div>
        <div style="font-size:13px;color:var(--color-text-muted)">
          ${dt('pricingGapText', { categories: pricingGaps.map((c) => ProductCategories.label(c.category)).join(I18n.getLang() === 'ar' ? '، ' : ', ') })}
        </div>
      </div>
    ` : ''}

    <div class="flex items-center justify-between mb-4">
      <div class="crm-section-title" style="margin-bottom:0">${dt('categoryBreakdown')}</div>
      <a href="#/inventory/products" style="font-size:12px;font-weight:700;color:var(--color-gold)">${dt('viewAllProducts')}</a>
    </div>
    <div class="crm-stats-grid mb-6">
      ${ProductCategories.all().map((c) => {
        const info = byCategory[c.id] || { count: 0, value: 0 };
        return `
          <div class="crm-stat-tile" style="cursor:pointer" onclick="CRMRouter.navigate('/inventory/products?category=${c.id}')">
            <div style="font-size:22px;margin-bottom:6px">${c.icon}</div>
            <div class="crm-stat-val" style="font-size:20px">${info.count}</div>
            <div class="crm-stat-label">${ProductCategories.label(c.id)}</div>
          </div>
        `;
      }).join('')}
    </div>

    ${lowStock.length > 0 ? `
      <div class="crm-section-title">${dt('lowStockAlerts')}</div>
      <div class="crm-recent-list mb-6">
        ${lowStock.slice(0, 6).map((p) => `
          <div class="crm-recent-item" onclick="CRMRouter.navigate('/inventory/products/${p.id}')">
            <div style="min-width:0">
              <div class="crm-row-id">${p.sku}</div>
              <div class="crm-row-name">${p.brand} ${p.model}</div>
              <div class="crm-row-sub">${ProductCategories.icon(p.category)} ${ProductCategories.label(p.category)}</div>
            </div>
            <div class="status-pill tone-danger">⚠ ${p.available} / ${p.minStock} ${dt('minStockShort')}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="crm-section-title">${dt('recentActivity')}</div>
    ${movements.length === 0 ? `
      <div class="crm-empty card">
        <div class="crm-empty-icon">📭</div>
        <div class="crm-empty-title">${dt('noActivity')}</div>
      </div>
    ` : `
      <div class="crm-timeline card">
        ${movements.map((m) => `
          <div class="crm-timeline-item">
            <div class="crm-timeline-dot">${m.type === 'MANUAL_IN' || m.type === 'PURCHASE_IN' ? '📥' : '📤'}</div>
            <div class="crm-timeline-body">
              <div class="crm-timeline-text">${I18n.t('crm.stockMovement.' + m.type)} — ${m.quantity} × ${m.product ? (m.product.sku + ' ' + m.product.brand + ' ' + m.product.model) : '—'}</div>
              ${m.user ? `<div class="crm-timeline-user">${I18n.t('crm.timeline.by', { user: m.user.name })}</div>` : ''}
              <div class="crm-timeline-time">${fmtDateTime(m.createdAt)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
