/* ============================================================
   ui.js — toasts, модалки, таблицы с сортировкой, утилиты UI
   ============================================================ */
(function (global) {
  'use strict';

  // ---------- Toasts ----------
  function toast(message, type = 'info', duration = 3800) {
    const box = document.getElementById('toastBox');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✅', error: '⛔', info: 'ℹ️', warn: '⚠️' };
    el.innerHTML = `<div>${icons[type] || ''}</div><div>${message}</div>`;
    box.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      setTimeout(() => el.remove(), 280);
    }, duration);
  }

  // ---------- Modals ----------
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
  }
  // глобальные обработчики для крестиков
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-close]')) {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal:not(.hidden)').forEach((m) => m.classList.add('hidden'));
  });

  // ---------- Number / money formatting ----------
  const _nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const _nf2 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  const currencyByCode = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸', BYN: 'Br' };

  function fmtNumber(n)  { return _nf.format(Math.round(n || 0)); }
  function fmtNumber2(n) { return _nf2.format(n || 0); }
  function fmtMoney(n, currency = 'RUB') {
    return _nf.format(Math.round(n || 0)) + ' ' + (currencyByCode[currency] || '');
  }
  function fmtPct(n, d = 2)  { return (n == null || !isFinite(n) ? 0 : n).toFixed(d) + '%'; }
  function fmtCompact(v) {
    if (v == null || !isFinite(v)) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e9) return (v / 1e9).toFixed(1) + ' млрд';
    if (abs >= 1e6) return (v / 1e6).toFixed(1) + ' млн';
    if (abs >= 1e3) return (v / 1e3).toFixed(1) + ' тыс';
    return Math.round(v).toString();
  }
  function fmtDate(d) {
    if (!d) return '—';
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt)) return '—';
    return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ---------- KPI card builder ----------
  function buildKpiCard({ label, value, sub, tone, trend, icon }) {
    const t = tone ? ` ${tone}` : '';
    let trendHtml = '';
    if (trend != null && isFinite(trend)) {
      const cls = trend > 0.5 ? 'up' : trend < -0.5 ? 'down' : 'flat';
      const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '•';
      trendHtml = `<span class="kpi-trend ${cls}">${arrow} ${Math.abs(trend).toFixed(1)}%</span>`;
    }
    return `
      <div class="kpi-card${t}">
        ${icon ? `<div class="kpi-ico">${icon}</div>` : ''}
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value} ${trendHtml}</div>
        ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
      </div>`;
  }

  // ---------- Render KPI grid for dashboard ----------
  function renderKpiGrid(containerId, kpi, currency = 'RUB') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const c = kpi.counters;
    const r = kpi.rates;
    el.innerHTML = [
      buildKpiCard({ label: 'Показы',        value: fmtNumber(c.impressions), sub: 'Сколько раз показались' }),
      buildKpiCard({ label: 'Просмотры',     value: fmtNumber(c.views),       sub: `CTR ${fmtPct(r.ctr)}` }),
      buildKpiCard({ label: 'Контакты',      value: fmtNumber(c.contacts),    sub: `Сообщ. ${fmtNumber(c.messages)} · Звон. ${fmtNumber(c.calls)}` }),
      buildKpiCard({ label: 'Избранное',     value: fmtNumber(c.favorites),   sub: 'Добавлений в избранное' }),
      buildKpiCard({ label: 'Расходы',       value: fmtMoney(c.spend, currency), sub: 'Сумма затрат на рекламу', tone: 'bad' }),
      buildKpiCard({ label: 'Доход',         value: fmtMoney(c.revenue, currency), sub: 'Выручка/оценка', tone: 'good' }),
      buildKpiCard({ label: c.profit >= 0 ? 'Прибыль' : 'Убыток', value: fmtMoney(Math.abs(c.profit), currency), sub: `Маржа ${fmtPct(r.margin)}`, tone: c.profit >= 0 ? 'good' : 'bad' }),
      buildKpiCard({ label: 'ROI',           value: fmtPct(r.roi, 1),         sub: 'Возврат на инвестиции',          tone: r.roi >= 0 ? 'good' : 'bad' }),
      buildKpiCard({ label: 'ROMI',          value: fmtPct(r.romi, 1),        sub: 'Возврат на маркетинг',           tone: r.romi >= 0 ? 'good' : 'bad' }),
      buildKpiCard({ label: 'CPC',           value: fmtMoney(r.cpc, currency), sub: 'Стоимость 1 просмотра' }),
      buildKpiCard({ label: 'CPM',           value: fmtMoney(r.cpm, currency), sub: 'Стоимость 1000 показов' }),
      buildKpiCard({ label: 'CPL',           value: fmtMoney(r.cpl, currency), sub: 'Стоимость 1 лида', tone: r.cpl > 0 ? 'warn' : '' }),
      buildKpiCard({ label: 'CPA',           value: fmtMoney(r.cpa, currency), sub: 'Стоимость продажи' }),
      buildKpiCard({ label: 'Конв. показ→прсм.',  value: fmtPct(r.convImpView) }),
      buildKpiCard({ label: 'Конв. прсм.→конт.',  value: fmtPct(r.convViewContact) }),
      buildKpiCard({ label: 'Конв. конт.→прдж.',  value: fmtPct(r.convContactSale) }),
      buildKpiCard({ label: 'Средний чек',        value: fmtMoney(r.avgCheck, currency) }),
      buildKpiCard({ label: 'Всего объявлений',   value: fmtNumber(c.rowCount) }),
    ].join('');
  }

  // ---------- Render metrics grid (analytics view) ----------
  function renderMetricsGrid(containerId, kpi, currency) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const c = kpi.counters;
    const r = kpi.rates;
    const tile = (label, value) => `<div class="metric-tile"><div class="label">${label}</div><div class="value">${value}</div></div>`;
    el.innerHTML = [
      tile('Показы',        fmtNumber(c.impressions)),
      tile('Просмотры',     fmtNumber(c.views)),
      tile('Контакты',      fmtNumber(c.contacts)),
      tile('Сообщения',     fmtNumber(c.messages)),
      tile('Звонки',        fmtNumber(c.calls)),
      tile('Избранное',     fmtNumber(c.favorites)),
      tile('CTR',           fmtPct(r.ctr)),
      tile('CPC',           fmtMoney(r.cpc, currency)),
      tile('CPM',           fmtMoney(r.cpm, currency)),
      tile('CPL',           fmtMoney(r.cpl, currency)),
      tile('CPA',           fmtMoney(r.cpa, currency)),
      tile('ROI',           fmtPct(r.roi, 1)),
      tile('ROMI',          fmtPct(r.romi, 1)),
      tile('Маржа',         fmtPct(r.margin, 1)),
      tile('Частота',       fmtNumber2(r.frequency)),
      tile('Конв. общая',   fmtPct(r.overallConv)),
      tile('Расход',        fmtMoney(c.spend, currency)),
      tile('Доход',         fmtMoney(c.revenue, currency)),
      tile('Прибыль',       fmtMoney(c.profit, currency)),
      tile('Средний чек',   fmtMoney(r.avgCheck, currency)),
    ].join('');
  }

  // ---------- Sortable / Paginated table renderer ----------
  /**
   * createTable({tableId, columns, rows, pageSize})
   * columns: [{ key, label, fmt(value, row), align, sortFn?, sortable=true }]
   */
  function createTable(opts) {
    const tbl     = document.getElementById(opts.tableId);
    const thead   = tbl.querySelector('thead');
    const tbody   = tbl.querySelector('tbody');
    const pagBox  = opts.paginationId ? document.getElementById(opts.paginationId) : null;
    const pageSize = opts.pageSize || 12;
    const cols    = opts.columns;
    let rows      = opts.rows || [];
    let page      = 1;
    let sortKey   = opts.defaultSortKey || null;
    let sortDir   = opts.defaultSortDir || 'desc';

    function renderHead() {
      thead.innerHTML = `<tr>${cols.map((c) => {
        const sCls = (c.sortable !== false) ? (sortKey === c.key ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : '') : '';
        const a = c.align ? ` style="text-align:${c.align}"` : '';
        return `<th data-key="${c.key}" class="${sCls}"${a}>${c.label}</th>`;
      }).join('')}</tr>`;
      thead.querySelectorAll('th').forEach((th) => {
        th.addEventListener('click', () => {
          const k = th.dataset.key;
          const c = cols.find((x) => x.key === k);
          if (!c || c.sortable === false) return;
          if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortKey = k; sortDir = 'desc'; }
          page = 1;
          render();
        });
      });
    }

    function renderBody() {
      let r = rows;
      if (sortKey) {
        const col = cols.find((c) => c.key === sortKey);
        const sortFn = col?.sortFn || ((a, b) => {
          const va = a[sortKey], vb = b[sortKey];
          if (typeof va === 'number' && typeof vb === 'number') return va - vb;
          return (va ?? '').toString().localeCompare((vb ?? '').toString(), 'ru');
        });
        r = [...r].sort(sortFn);
        if (sortDir === 'desc') r.reverse();
      }
      const total = r.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (page > totalPages) page = totalPages;
      const start = (page - 1) * pageSize;
      const slice = r.slice(start, start + pageSize);

      tbody.innerHTML = slice.map((row) => {
        const cls = row.__rowClass ? ` class="${row.__rowClass}"` : '';
        return `<tr${cls}>${cols.map((c) => {
          const v = row[c.key];
          const text = c.fmt ? c.fmt(v, row) : (v ?? '—');
          const a = c.align ? ` style="text-align:${c.align}"` : '';
          const tdCls = c.cellClass ? ` class="${c.cellClass}"` : '';
          return `<td${a}${tdCls}>${text}</td>`;
        }).join('')}</tr>`;
      }).join('');

      if (pagBox) renderPagination(totalPages);
    }

    function renderPagination(total) {
      if (!pagBox) return;
      if (total <= 1) { pagBox.innerHTML = ''; return; }
      const parts = [];
      parts.push(`<button ${page === 1 ? 'disabled' : ''} data-go="${page - 1}">‹</button>`);
      const make = (n) => `<button class="${n === page ? 'active' : ''}" data-go="${n}">${n}</button>`;
      const wnd = 5;
      let from = Math.max(1, page - 2), to = Math.min(total, from + wnd - 1);
      from = Math.max(1, to - wnd + 1);
      if (from > 1) parts.push(make(1));
      if (from > 2) parts.push(`<span style="color:var(--text-muted);padding:0 4px">…</span>`);
      for (let i = from; i <= to; i++) parts.push(make(i));
      if (to < total - 1) parts.push(`<span style="color:var(--text-muted);padding:0 4px">…</span>`);
      if (to < total) parts.push(make(total));
      parts.push(`<button ${page === total ? 'disabled' : ''} data-go="${page + 1}">›</button>`);
      pagBox.innerHTML = parts.join('');
      pagBox.querySelectorAll('button[data-go]').forEach((b) => {
        b.addEventListener('click', () => {
          const n = parseInt(b.dataset.go, 10);
          if (n) { page = n; render(); }
        });
      });
    }

    function render() {
      renderHead();
      renderBody();
    }

    render();

    return {
      update(newRows) { rows = newRows; page = 1; render(); },
      setSort(key, dir = 'desc') { sortKey = key; sortDir = dir; render(); },
      destroy() { tbody.innerHTML = ''; thead.innerHTML = ''; if (pagBox) pagBox.innerHTML = ''; },
      getRows() { return rows; },
    };
  }

  // ---------- Recommendations ----------
  function renderRecommendations(containerId, tips) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!tips || !tips.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="reco-title">💡 AI-рекомендации по оптимизации</div>
      <div class="reco-list">
        ${tips.map((t) => `
          <div class="reco-item ${t.type}">
            <div class="badge">${labelOf(t.type)}</div>
            <div>${t.text}</div>
          </div>`).join('')}
      </div>`;
  }
  function labelOf(t) {
    return { tip: 'Совет', warn: 'Внимание', alert: 'Проблема', good: 'Хорошо' }[t] || 'Инфо';
  }

  // ---------- Ad list (top/worst) ----------
  function renderAdList(containerId, ranked, type = 'top', limit = 8, currency = 'RUB') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const items = [...ranked].sort((a, b) => type === 'top' ? b.score - a.score : a.score - b.score).slice(0, limit);
    el.innerHTML = items.map((r) => {
      const cls = (r.profitEst >= 0 && r.contacts > 0) ? 'good' : 'bad';
      return `
        <div class="ad-item ${cls}">
          <div>
            <div class="title">${escapeHtml(r.title)}</div>
            <div class="meta">${escapeHtml(r.category)} · CTR ${fmtPct(r.ctr)} · CPL ${fmtMoney(r.cpl, currency)} · ROI ${fmtPct(r.roi, 0)}</div>
          </div>
          <div class="score" title="Контакты">${fmtNumber(r.contacts)}</div>
        </div>`;
    }).join('') || '<div class="text-slate-500 text-sm">Нет данных</div>';
  }

  function escapeHtml(s) {
    return (s || '').toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Skeleton helpers ----------
  function showSkeleton(containerId, count = 6) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = Array.from({ length: count }, () => `
      <div class="kpi-card">
        <div class="skeleton" style="height:12px;width:60%"></div>
        <div class="skeleton" style="height:26px;width:75%;margin-top:10px"></div>
        <div class="skeleton" style="height:10px;width:50%;margin-top:8px"></div>
      </div>`).join('');
  }

  // ---------- Theme toggle ----------
  function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.classList.toggle('light');
    localStorage.setItem('avito_theme', isLight ? 'light' : 'dark');
    toast(isLight ? 'Светлая тема' : 'Тёмная тема', 'info', 1500);
  }
  function applySavedTheme() {
    const t = localStorage.getItem('avito_theme');
    if (t === 'light') document.documentElement.classList.add('light');
  }

  global.AvitoUI = {
    toast,
    openModal,
    closeModal,
    fmtNumber, fmtNumber2, fmtMoney, fmtPct, fmtCompact, fmtDate,
    renderKpiGrid,
    renderMetricsGrid,
    createTable,
    renderRecommendations,
    renderAdList,
    showSkeleton,
    toggleTheme,
    applySavedTheme,
    escapeHtml,
  };
})(window);
