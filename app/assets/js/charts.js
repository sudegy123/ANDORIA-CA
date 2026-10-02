/**
 * SOLAR SMART ADVISOR — CHARTS
 * charts.js
 *
 * Renders visual data elements.
 * Pure SVG — no canvas, no external charting library.
 * All chart functions take data and return HTML strings or mutate SVG elements.
 */

'use strict';

const Charts = (() => {

  /**
   * Update the arc gauge on step 5.
   * Shows daily kWh as a semicircle fill.
   *
   * @param {number} dailyWh - raw daily Wh
   * @param {number} maxWh - value at 100% fill (default 20000)
   */
  function updateArc(dailyWh, maxWh = 20000) {
    const arcPath = document.getElementById('arc-fill');
    const arcVal  = document.getElementById('arc-val');

    if (!arcPath || !arcVal) return;

    const ARC_LENGTH = 251.2; // circumference of the arc path
    const pct    = Math.min(1, dailyWh / maxWh);
    const offset = ARC_LENGTH * (1 - pct);

    // Update color based on load level
    if (pct > 0.75) {
      arcPath.setAttribute('stroke', '#EF4444');
    } else if (pct > 0.50) {
      arcPath.setAttribute('stroke', '#F59E0B');
    } else {
      arcPath.setAttribute('stroke', '#F2B632');
    }

    setTimeout(() => {
      arcPath.style.strokeDashoffset = offset;
    }, 80);

    // Update value text
    arcVal.textContent = (dailyWh / 1000).toFixed(1);
  }

  /**
   * Render the load meter bar on step 4.
   *
   * @param {number} dailyWh
   * @param {number} maxWh
   */
  function updateLoadMeter(dailyWh, maxWh = 20000) {
    const fill = document.getElementById('load-fill');
    const val  = document.getElementById('load-val');

    if (!fill || !val) return;

    const pct = Math.min(100, (dailyWh / maxWh) * 100);

    fill.style.width = pct + '%';

    // Color classes
    fill.classList.remove('warm', 'hot');
    if (pct > 75) fill.classList.add('hot');
    else if (pct > 50) fill.classList.add('warm');

    // Value text
    if (dailyWh >= 1000) {
      val.textContent = (dailyWh / 1000).toFixed(1) + ' kWh';
    } else {
      val.textContent = Math.round(dailyWh) + ' Wh';
    }
  }

  /**
   * Render device breakdown bars on step 5.
   *
   * @param {Array} sortedDevices - devices sorted by wh desc
   * @param {number} totalWh - total daily Wh
   * @returns {string} HTML string
   */
  function renderBreakdown(sortedDevices, totalWh) {
    if (!sortedDevices || sortedDevices.length === 0) {
      return `<div class="device-empty">
        <div class="device-empty-icon">📋</div>
        <div>${I18n.t('steps.summary.breakdownEmpty')}</div>
      </div>`;
    }

    const safeTotal = totalWh || 1;
    const lang = I18n.getLang();

    return sortedDevices.map(d => {
      const wh  = d.watts * d.hours * d.qty;
      const pct = Math.min(100, Math.round((wh / safeTotal) * 100));

      return `<div class="breakdown-item">
        <div class="breakdown-left">
          <div class="breakdown-emoji">${d.emoji || '⚡'}</div>
          <div>
            <div class="breakdown-name">${lang === 'en' ? (d.name_en || d.name_ar) : d.name_ar}</div>
            <div class="breakdown-detail">${d.qty} × ${d.watts}W × ${d.hours}h</div>
          </div>
        </div>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar">
            <div class="breakdown-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="breakdown-wh">${wh >= 1000 ? (wh/1000).toFixed(1) + ' kWh' : Math.round(wh) + ' Wh'}</div>
      </div>`;
    }).join('');
  }

  /**
   * Render battery night timeline on step 6.
   *
   * @param {Array} timeline - from RecommendationsEngine.buildBatteryTimeline()
   * @returns {string} HTML string
   */
  function renderBatteryTimeline(timeline) {
    return timeline.map(row => `
      <div class="bat-row">
        <div class="bat-time">${row.label}</div>
        <div class="bat-bar-wrap">
          <div class="bat-bar-fill ${row.color_class}" style="width:${row.pct}%"></div>
        </div>
        <div class="bat-pct" style="color:${row.txt_color}">${row.pct}%</div>
      </div>
    `).join('');
  }

  /**
   * Render payback bar animation.
   * @param {number} paybackMonths
   * @param {number} maxMonths - value representing 100% (default 36)
   */
  function animatePayback(paybackMonths, maxMonths = 36) {
    const bar = document.getElementById('payback-bar');
    if (!bar) return;
    const pct = Math.min(100, Math.round((maxMonths / paybackMonths) * 100));
    setTimeout(() => { bar.style.width = pct + '%'; }, 200);
  }

  return {
    updateArc,
    updateLoadMeter,
    renderBreakdown,
    renderBatteryTimeline,
    animatePayback,
  };

})();

if (typeof window !== 'undefined') window.Charts = Charts;
if (typeof module !== 'undefined') module.exports = Charts;
