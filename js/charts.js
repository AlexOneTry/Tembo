/* ============================================================
   charts.js — обёртки над Chart.js для всех графиков приложения
   ============================================================ */

(function (global) {
  'use strict';

  // Цветовая палитра в стиле приложения
  const PALETTE = {
    indigo: '#6366f1',
    cyan:   '#22d3ee',
    violet: '#a78bfa',
    pink:   '#f472b6',
    lime:   '#a3e635',
    amber:  '#fbbf24',
    rose:   '#fb7185',
    teal:   '#2dd4bf',
    sky:    '#38bdf8',
  };
  const PALETTE_LIST = Object.values(PALETTE);

  // Регистрируем дефолты Chart.js
  if (global.Chart) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.12)';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.boxWidth = 14;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(2, 6, 23, 0.92)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(99, 102, 241, 0.4)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleColor = '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.elements.point.hoverRadius = 6;
  }

  const charts = new Map();

  function destroy(name) {
    const c = charts.get(name);
    if (c) { c.destroy(); charts.delete(name); }
  }
  function getCanvas(id) {
    const el = document.getElementById(id);
    return el ? el.getContext('2d') : null;
  }

  function gradient(ctx, color, alpha = 0.45) {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0, hexA(color, alpha));
    g.addColorStop(1, hexA(color, 0));
    return g;
  }
  function hexA(hex, a) {
    const m = hex.replace('#', '').match(/.{1,2}/g);
    if (!m) return hex;
    const [r, g, b] = m.map((x) => parseInt(x, 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // ---------------- Timeseries (расходы / контакты / показы) ----------------
  function renderTimeseries(canvasId, series) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const labels = series.map((p) => p.date);

    const c = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Расходы',
            data: series.map((p) => p.spend),
            borderColor: PALETTE.rose,
            backgroundColor: gradient(ctx, PALETTE.rose, 0.35),
            tension: 0.35,
            fill: true,
            yAxisID: 'y',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Контакты',
            data: series.map((p) => p.contacts),
            borderColor: PALETTE.cyan,
            backgroundColor: gradient(ctx, PALETTE.cyan, 0.30),
            tension: 0.35,
            fill: true,
            yAxisID: 'y1',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Показы',
            data: series.map((p) => p.impressions),
            borderColor: PALETTE.violet,
            backgroundColor: 'transparent',
            tension: 0.35,
            yAxisID: 'y2',
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y:  { position: 'left',  grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { callback: (v) => fmtCompact(v) + ' ₽' } },
          y1: { position: 'right', grid: { display: false }, ticks: { callback: (v) => fmtCompact(v) } },
          y2: { display: false },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Bar: ТОП объявлений ----------------
  function renderTopAds(canvasId, ranked, limit = 10) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const sorted = [...ranked].sort((a, b) => (b.contacts || 0) - (a.contacts || 0)).slice(0, limit);

    const c = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map((r) => trimText(r.title, 28)),
        datasets: [{
          label: 'Контакты',
          data: sorted.map((r) => r.contacts || 0),
          backgroundColor: sorted.map((_, i) => hexA(PALETTE_LIST[i % PALETTE_LIST.length], 0.75)),
          borderColor: sorted.map((_, i) => PALETTE_LIST[i % PALETTE_LIST.length]),
          borderWidth: 1.5,
          borderRadius: 8,
        }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(148, 163, 184, 0.08)' } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Pie / Doughnut ----------------
  function renderPie(canvasId, labels, values, opts = {}) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const colors = labels.map((_, i) => PALETTE_LIST[i % PALETTE_LIST.length]);
    const c = new Chart(ctx, {
      type: opts.doughnut !== false ? 'doughnut' : 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map((c) => hexA(c, 0.85)),
          borderColor: '#0b0f1a',
          borderWidth: 2,
          hoverOffset: 12,
        }],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        cutout: opts.doughnut !== false ? '62%' : 0,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const total = c.dataset.data.reduce((s, v) => s + v, 0);
                const pct = total ? ((c.parsed / total) * 100).toFixed(1) : 0;
                return ` ${c.label}: ${fmtCompact(c.parsed)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Multi-line metrics ----------------
  function renderMetricsLine(canvasId, series) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;

    const c = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map((p) => p.date),
        datasets: [
          { label: 'CTR %',     data: series.map((p) => +p.ctr.toFixed(2)),             borderColor: PALETTE.indigo, backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 0, yAxisID: 'y' },
          { label: 'Конв. %',   data: series.map((p) => +p.convViewContact.toFixed(2)), borderColor: PALETTE.cyan,   backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 0, yAxisID: 'y' },
          { label: 'CPC ₽',     data: series.map((p) => +p.cpc.toFixed(2)),             borderColor: PALETTE.amber,  backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 0, yAxisID: 'y1' },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y:  { position: 'left',  grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { callback: (v) => v + '%' } },
          y1: { position: 'right', grid: { display: false }, ticks: { callback: (v) => v + ' ₽' } },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Finance combo: bars revenue/spend + line profit ----------------
  function renderFinance(canvasId, series) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const c = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: series.map((p) => p.date),
        datasets: [
          { label: 'Доход', data: series.map((p) => p.revenue || 0), backgroundColor: hexA(PALETTE.lime, 0.7),  borderRadius: 6 },
          { label: 'Расход',data: series.map((p) => p.spend   || 0), backgroundColor: hexA(PALETTE.rose, 0.7),  borderRadius: 6 },
          { label: 'Прибыль', type: 'line', data: series.map((p) => p.profit || 0), borderColor: PALETTE.cyan, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2.5, pointRadius: 0 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: {
          x: { grid: { display: false }, stacked: false, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { callback: (v) => fmtCompact(v) + ' ₽' } },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Margin / ROMI ----------------
  function renderMargin(canvasId, series) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const c = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map((p) => p.date),
        datasets: [
          { label: 'Маржинальность %', data: series.map((p) => +p.margin.toFixed(2)), borderColor: PALETTE.indigo, backgroundColor: gradient(ctx, PALETTE.indigo, 0.3), tension: 0.35, fill: true, borderWidth: 2, pointRadius: 0 },
          { label: 'ROMI %',           data: series.map((p) => +p.romi.toFixed(2)),   borderColor: PALETTE.amber,  backgroundColor: 'transparent',                       tension: 0.35, borderWidth: 2, pointRadius: 0 },
          { label: 'ROI %',            data: series.map((p) => +p.roi.toFixed(2)),    borderColor: PALETTE.cyan,   backgroundColor: 'transparent',                       tension: 0.35, borderWidth: 2, pointRadius: 0 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { callback: (v) => v + '%' } },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Funnel (DOM-based) ----------------
  function renderFunnel(containerId, steps) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const max = Math.max(...steps.map((s) => s.value || 0), 1);
    el.innerHTML = `
      <div class="funnel">
        ${steps.map((s, i) => `
          <div class="funnel-step ${'s' + (i + 1)}" style="width:${Math.max(20, ((s.value || 0) / max) * 100).toFixed(1)}%">
            <div class="label">${s.label} <span class="pct">${s.pct.toFixed(1)}%</span></div>
            <div class="value">${fmtCompact(s.value)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---------------- Heatmap (DOM-based) ----------------
  function renderHeatmap(containerId, grid) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    let max = 0;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    const cell = (v, d, h) => {
      const ratio = max ? v / max : 0;
      const bg = `rgba(99, 102, 241, ${0.10 + ratio * 0.85})`;
      return `<div class="hm-cell" style="background:${bg}" data-tip="${days[d]} ${String(h).padStart(2,'0')}:00 — ${Math.round(v)} контактов"></div>`;
    };
    let html = `<div class="heatmap">`;
    // header
    html += `<div></div>`;
    for (let h = 0; h < 24; h++) {
      html += `<div class="hm-header">${h % 3 === 0 ? String(h).padStart(2, '0') : ''}</div>`;
    }
    for (let d = 0; d < 7; d++) {
      html += `<div class="hm-label">${days[d]}</div>`;
      for (let h = 0; h < 24; h++) html += cell(grid[d][h], d, h);
    }
    html += `</div>`;
    el.innerHTML = html;
  }

  // ---------------- Conversion pie ----------------
  function renderConversionPie(canvasId, funnelSteps) {
    const labels = funnelSteps.map((s) => s.label);
    const values = funnelSteps.map((s) => s.value);
    renderPie(canvasId, labels, values);
  }

  // ---------------- Contact Sources (Messages vs Calls vs Other) ----------------
  function renderContactSources(canvasId, counters) {
    const other = Math.max(0, (counters.contacts || 0) - (counters.messages || 0) - (counters.calls || 0));
    renderPie(canvasId, ['Сообщения', 'Звонки', 'Прочие'],
      [counters.messages || 0, counters.calls || 0, other]);
  }

  // ---------------- Spend structure ----------------
  function renderSpendStructure(canvasId, groups) {
    const top = [...groups].sort((a, b) => b.spend - a.spend).slice(0, 7);
    renderPie(canvasId, top.map((g) => trimText(g.key, 22)), top.map((g) => g.spend));
  }

  // ---------------- Conversions line ----------------
  function renderConversionsLine(canvasId, series) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const c = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map((p) => p.date),
        datasets: [
          { label: 'Показ → Просмотр %',  data: series.map((p) => +p.convImpView.toFixed(2)),     borderColor: PALETTE.violet, backgroundColor: gradient(ctx, PALETTE.violet, 0.25), tension: 0.35, fill: true, borderWidth: 2, pointRadius: 0 },
          { label: 'Просмотр → Контакт %', data: series.map((p) => +p.convViewContact.toFixed(2)),borderColor: PALETTE.cyan,   backgroundColor: gradient(ctx, PALETTE.cyan, 0.25),   tension: 0.35, fill: true, borderWidth: 2, pointRadius: 0 },
          { label: 'Контакт → Продажа %', data: series.map((p) => +p.convContactSale.toFixed(2)), borderColor: PALETTE.lime,   backgroundColor: 'transparent',                       tension: 0.35, borderWidth: 2, pointRadius: 0 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { callback: (v) => v + '%' } },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Forecast ----------------
  function renderForecast(canvasId, series, forecastPoints) {
    destroy(canvasId);
    const ctx = getCanvas(canvasId);
    if (!ctx) return;
    const labels = [...series.map((p) => p.date), ...forecastPoints.map((p) => p.date)];
    const actual = [...series.map((p) => p.contacts), ...forecastPoints.map(() => null)];
    const forecast = [...series.map(() => null), ...forecastPoints.map((p) => +p.forecastContacts.toFixed(1))];
    // склейка
    if (series.length) forecast[series.length - 1] = series[series.length - 1].contacts;

    const c = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Фактические контакты', data: actual,   borderColor: PALETTE.cyan,   backgroundColor: gradient(ctx, PALETTE.cyan, 0.3),   tension: 0.3, fill: true, borderWidth: 2, pointRadius: 2 },
          { label: 'Прогноз контактов',    data: forecast, borderColor: PALETTE.amber,  backgroundColor: gradient(ctx, PALETTE.amber, 0.25), tension: 0.3, fill: true, borderWidth: 2, borderDash: [6, 4], pointRadius: 2 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { grid: { color: 'rgba(148, 163, 184, 0.08)' } },
        },
      },
    });
    charts.set(canvasId, c);
  }

  // ---------------- Helpers ----------------
  function fmtCompact(v) {
    if (v == null || !isFinite(v)) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e9) return (v / 1e9).toFixed(1) + ' млрд';
    if (abs >= 1e6) return (v / 1e6).toFixed(1) + ' млн';
    if (abs >= 1e3) return (v / 1e3).toFixed(1) + ' тыс';
    return Math.round(v).toString();
  }
  function trimText(s, n) {
    s = (s || '').toString();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function destroyAll() {
    for (const [name, c] of charts.entries()) { try { c.destroy(); } catch (_) {} }
    charts.clear();
  }

  global.AvitoCharts = {
    renderTimeseries,
    renderTopAds,
    renderPie,
    renderMetricsLine,
    renderFinance,
    renderMargin,
    renderFunnel,
    renderHeatmap,
    renderConversionPie,
    renderContactSources,
    renderSpendStructure,
    renderConversionsLine,
    renderForecast,
    destroyAll,
    charts,
    PALETTE,
  };
})(window);
