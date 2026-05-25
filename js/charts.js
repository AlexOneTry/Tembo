/* ===== charts.js — Chart.js helpers ===== */

const Charts = (() => {

  // Global Chart.js defaults for dark theme
  function applyTheme(theme = 'dark') {
    if (!window.Chart) return;
    const text = theme === 'dark' ? '#c2cad8' : '#334155';
    const grid = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';
    Chart.defaults.color = text;
    Chart.defaults.borderColor = grid;
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.font.size = 11;
  }

  const charts = {}; // map id -> Chart

  function destroy(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }
  function getCtx(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    return el.getContext('2d');
  }

  function gradient(ctx, c1, c2) {
    const g = ctx.createLinearGradient(0, 0, 0, 280);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  }

  const PALETTE = ['#8b5cf6', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb7185', '#2dd4bf', '#facc15', '#e879f9'];

  // === Line: daily spend + contacts ===
  function lineDaily(id, daily) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const labels = daily.map(d => d.key);
    charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Расход (₽)',
            data: daily.map(d => d.spend),
            borderColor: '#8b5cf6',
            backgroundColor: gradient(ctx, 'rgba(139,92,246,0.35)', 'rgba(139,92,246,0)'),
            fill: true, tension: 0.35, borderWidth: 2,
            pointRadius: 2, pointHoverRadius: 5,
            yAxisID: 'y'
          },
          {
            label: 'Контакты',
            data: daily.map(d => d.contacts),
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34,211,238,0.1)',
            fill: false, tension: 0.35, borderWidth: 2,
            pointRadius: 2, pointHoverRadius: 5,
            yAxisID: 'y1'
          }
        ]
      },
      options: lineOpts({ dualAxis: true })
    });
  }

  // === Line: CTR + conversion ===
  function lineCTR(id, daily) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: daily.map(d => d.key),
        datasets: [
          { label: 'CTR %', data: daily.map(d => d.ctr.toFixed(2)), borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.15)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2 },
          { label: 'Конверсия в продажу %', data: daily.map(d => d.totalConv.toFixed(2)), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.10)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2 }
        ]
      },
      options: lineOpts()
    });
  }

  // === Pie: category ===
  function pieCategory(id, groups) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const top = groups.slice(0, 8);
    charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top.map(g => g.key),
        datasets: [{
          data: top.map(g => g.spend),
          backgroundColor: PALETTE,
          borderColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${Analytics.formatMoney(c.parsed)}` } }
        }
      }
    });
  }

  // === Funnel (custom horizontal bar) ===
  function funnel(id, kpi) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const data = [
      { label: 'Показы', value: kpi.impressions, color: '#8b5cf6' },
      { label: 'Просмотры', value: kpi.views, color: '#22d3ee' },
      { label: 'Контакты', value: kpi.contacts, color: '#f472b6' },
      { label: 'Продажи', value: kpi.sales, color: '#34d399' }
    ];
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Воронка',
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.65
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${Analytics.formatNum(c.parsed.x)}` } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // === Bar: category effectiveness (ROMI) ===
  function barCategory(id, groups) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const top = groups.slice(0, 10);
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(g => g.key),
        datasets: [
          { label: 'Расход', data: top.map(g => g.spend), backgroundColor: 'rgba(139,92,246,0.7)', borderRadius: 6 },
          { label: 'Доход', data: top.map(g => g.revenue), backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 6 }
        ]
      },
      options: barOpts()
    });
  }

  // === Bar: region ===
  function barRegion(id, groups) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const top = groups.slice(0, 10);
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(g => g.key),
        datasets: [{
          label: 'Контакты',
          data: top.map(g => g.contacts),
          backgroundColor: PALETTE,
          borderRadius: 6
        }]
      },
      options: barOpts({ singleColor: true })
    });
  }

  // === Bar: revenue vs expense daily ===
  function barRevExp(id, daily) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: daily.map(d => d.key),
        datasets: [
          { label: 'Доход', data: daily.map(d => d.revenue), backgroundColor: 'rgba(52,211,153,0.75)', borderRadius: 5, stack: 'a' },
          { label: 'Расход', data: daily.map(d => -d.spend), backgroundColor: 'rgba(248,113,113,0.75)', borderRadius: 5, stack: 'a' }
        ]
      },
      options: barOpts({ stacked: true })
    });
  }

  // === Line profit daily ===
  function lineProfit(id, daily) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: daily.map(d => d.key),
        datasets: [{
          label: 'Прибыль (₽)',
          data: daily.map(d => d.profit),
          borderColor: '#34d399',
          backgroundColor: ctx => {
            const c = ctx.chart.ctx;
            const g = c.createLinearGradient(0, 0, 0, 280);
            g.addColorStop(0, 'rgba(52,211,153,0.45)');
            g.addColorStop(1, 'rgba(52,211,153,0.0)');
            return g;
          },
          fill: true, tension: 0.35, borderWidth: 2,
          pointRadius: 2, pointHoverRadius: 5,
          segment: {
            borderColor: ctx => ctx.p1.parsed.y < 0 ? '#f87171' : '#34d399'
          }
        }]
      },
      options: lineOpts()
    });
  }

  // === Doughnut: expenses by category ===
  function doughnutExp(id, groups) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const top = groups.slice(0, 8);
    charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top.map(g => g.key),
        datasets: [{ data: top.map(g => g.spend), backgroundColor: PALETTE, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'bottom' } } }
    });
  }

  // === Bar: margin by category ===
  function barMargin(id, groups) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const top = groups.slice(0, 10);
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(g => g.key),
        datasets: [{
          label: 'Маржинальность %',
          data: top.map(g => g.margin),
          backgroundColor: top.map(g => g.margin >= 0 ? 'rgba(52,211,153,0.75)' : 'rgba(248,113,113,0.75)'),
          borderRadius: 6
        }]
      },
      options: barOpts({ singleColor: true })
    });
  }

  function lineConv(id, daily) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: daily.map(d => d.key),
        datasets: [
          { label: 'Показ→Просмотр %', data: daily.map(d => d.convImpToView.toFixed(2)), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.35, fill: true, borderWidth: 2, pointRadius: 2 },
          { label: 'Просмотр→Контакт %', data: daily.map(d => d.convViewToContact.toFixed(2)), borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', tension: 0.35, fill: true, borderWidth: 2, pointRadius: 2 },
          { label: 'Контакт→Продажа %', data: daily.map(d => d.convContactToSale.toFixed(2)), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)', tension: 0.35, fill: true, borderWidth: 2, pointRadius: 2 }
        ]
      },
      options: lineOpts()
    });
  }

  function barConvAds(id, ads) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const top = ads.slice(0, 15);
    charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(g => g.key.length > 28 ? g.key.slice(0, 28) + '…' : g.key),
        datasets: [{ label: 'Конверсия %', data: top.map(g => g.totalConv.toFixed(2)), backgroundColor: PALETTE, borderRadius: 6 }]
      },
      options: { ...barOpts({ singleColor: true }), indexAxis: 'y' }
    });
  }

  function forecastChart(id, daily, forecast) {
    destroy(id);
    const ctx = getCtx(id); if (!ctx) return;
    const labels = [
      ...daily.map(d => d.key),
      ...forecast.map(f => Excel.formatDateKey(f.date))
    ];
    const real = [
      ...daily.map(d => d.profit),
      ...forecast.map(() => null)
    ];
    const fore = [
      ...daily.map(() => null),
      ...forecast.map(f => f.value)
    ];
    // Connect last real to first forecast
    if (daily.length > 0 && forecast.length > 0) {
      fore[daily.length - 1] = daily[daily.length - 1].profit;
    }
    charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Прибыль (факт)', data: real, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.15)', tension: 0.3, fill: true, borderWidth: 2, pointRadius: 2 },
          { label: 'Прогноз', data: fore, borderColor: '#f472b6', borderDash: [6, 4], backgroundColor: 'rgba(244,114,182,0.1)', tension: 0.3, fill: true, borderWidth: 2, pointRadius: 3 }
        ]
      },
      options: lineOpts()
    });
  }

  // Heatmap as DOM grid (Chart.js matrix plugin not loaded)
  function renderHeatmap(containerId, grid) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // header row
    const headers = ['', ...Array.from({ length: 24 }, (_, h) => h.toString().padStart(2, '0'))];
    headers.forEach((h, i) => {
      const c = document.createElement('div');
      c.className = i === 0 ? 'hm-label hm-header' : 'hm-header';
      c.textContent = h;
      el.appendChild(c);
    });

    // find max
    const max = Math.max(...grid.flat(), 1);

    days.forEach((d, di) => {
      const lab = document.createElement('div');
      lab.className = 'hm-label';
      lab.textContent = d;
      el.appendChild(lab);
      for (let h = 0; h < 24; h++) {
        const v = grid[di][h];
        const cell = document.createElement('div');
        cell.className = 'hm-cell';
        const ratio = v / max;
        cell.style.background = `rgba(139,92,246,${0.06 + ratio * 0.8})`;
        cell.title = `${d}, ${h}:00 — активность ${v.toFixed(1)}`;
        el.appendChild(cell);
      }
    });
  }

  // === Generic options ===
  function lineOpts({ dualAxis = false } = {}) {
    const opts = {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { boxWidth: 10, padding: 8 } },
        tooltip: { backgroundColor: 'rgba(20,24,34,.95)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 12 } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    };
    if (dualAxis) {
      opts.scales.y1 = { position: 'right', grid: { display: false }, beginAtZero: true };
    }
    return opts;
  }
  function barOpts({ stacked = false, singleColor = false } = {}) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: !singleColor, labels: { boxWidth: 10, padding: 8 } },
        tooltip: { backgroundColor: 'rgba(20,24,34,.95)' }
      },
      scales: {
        x: { stacked, grid: { display: false } },
        y: { stacked, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    };
  }

  function exportPNG(id, filename) {
    const c = charts[id];
    if (!c) return;
    const url = c.toBase64Image('image/png', 1);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${id}.png`;
    a.click();
  }

  function getChart(id) { return charts[id]; }

  return {
    applyTheme, destroy,
    lineDaily, lineCTR, pieCategory, funnel,
    barCategory, barRegion, barRevExp,
    lineProfit, doughnutExp, barMargin,
    lineConv, barConvAds, forecastChart,
    renderHeatmap,
    exportPNG, getChart
  };
})();
