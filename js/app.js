/* ===== app.js — Main application logic ===== */

const App = (() => {

  // Application state
  const state = {
    dataset: null,            // { fileName, rows, headers, mapping, ts }
    filtered: [],             // current filtered rows
    kpi: null,
    settings: Storage.loadSettings(),
    theme: Storage.loadTheme(),
    filters: { from: null, to: null, search: '', category: null, region: null, adType: null },
    adsTable: { sort: { col: 'profit', dir: 'desc' }, page: 1, pageSize: 15 }
  };

  // -------- Toasts --------
  function toast(message, kind = 'info') {
    const c = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<span>${message}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3000);
    setTimeout(() => el.remove(), 3400);
  }

  // -------- Splash --------
  function showSplash(text) {
    document.getElementById('splashText').textContent = text || 'Загрузка...';
    document.getElementById('splash').classList.remove('hidden');
  }
  function hideSplash() { document.getElementById('splash').classList.add('hidden'); }

  // -------- Theme --------
  function applyTheme(theme) {
    state.theme = theme;
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);
    Charts.applyTheme(theme);
    Storage.saveTheme(theme);
    // Repaint charts to pick up new defaults
    if (state.dataset) refresh();
  }

  // -------- Navigation --------
  function setupNav() {
    document.querySelectorAll('.nav-item').forEach(a => {
      a.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        const id = a.dataset.section;
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById(`section-${id}`);
        if (sec) sec.classList.add('active');
        // close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
        // ensure section-specific charts are rendered
        if (state.dataset) renderForSection(id);
      });
    });
    document.getElementById('mobileNavToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // -------- File handling --------
  function setupFileInput() {
    const inputs = [document.getElementById('fileInput'), document.getElementById('fileInput2')];
    inputs.forEach(inp => {
      if (!inp) return;
      inp.addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (f) await handleFile(f);
        e.target.value = '';
      });
    });

    const dz = document.getElementById('dropZone');
    if (dz) {
      ['dragenter', 'dragover'].forEach(evt =>
        dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach(evt =>
        dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
      dz.addEventListener('drop', async e => {
        const f = e.dataTransfer.files[0];
        if (f) await handleFile(f);
      });
    }
    // Also accept drops anywhere on the body for convenience
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', async e => {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files[0]) return;
      // Only handle if event isn't already handled inside dropzone
      if (e.target.closest('#dropZone')) return;
      e.preventDefault();
      await handleFile(e.dataTransfer.files[0]);
    });
  }

  async function handleFile(file) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast('Поддерживаются файлы .xlsx, .xls, .csv', 'error');
      return;
    }
    showSplash('Чтение Excel-файла...');
    try {
      const mapping = Storage.loadMapping();
      const dataset = await Excel.readFile(file, mapping);
      if (!dataset.rows.length) throw new Error('Файл не содержит строк');
      state.dataset = dataset;
      Storage.saveDataset(dataset);
      Storage.pushHistory({ fileName: dataset.fileName, rows: dataset.rows.length });
      initPeriodInputs();
      refresh();
      toast(`Файл «${dataset.fileName}» загружен (${dataset.rows.length} строк)`, 'success');
      document.getElementById('dropZone').classList.add('hide');
    } catch (e) {
      console.error(e);
      toast('Ошибка чтения файла: ' + (e.message || e), 'error');
    } finally {
      hideSplash();
    }
  }

  function initPeriodInputs() {
    if (!state.dataset) return;
    const dates = state.dataset.rows.map(r => r.date).filter(Boolean);
    if (!dates.length) return;
    const min = new Date(Math.min.apply(null, dates));
    const max = new Date(Math.max.apply(null, dates));
    document.getElementById('dateFrom').value = Excel.formatDateKey(min);
    document.getElementById('dateTo').value = Excel.formatDateKey(max);
    document.getElementById('cmpAFrom').value = Excel.formatDateKey(min);
    document.getElementById('cmpATo').value = Excel.formatDateKey(new Date(min.getFullYear(), min.getMonth(), min.getDate() + Math.floor((max - min) / (1000 * 86400) / 2)));
    document.getElementById('cmpBFrom').value = Excel.formatDateKey(new Date(min.getFullYear(), min.getMonth(), min.getDate() + Math.floor((max - min) / (1000 * 86400) / 2) + 1));
    document.getElementById('cmpBTo').value = Excel.formatDateKey(max);
  }

  // -------- Filters --------
  function setupFilters() {
    document.getElementById('dateFrom').addEventListener('change', refresh);
    document.getElementById('dateTo').addEventListener('change', refresh);
    document.getElementById('globalSearch').addEventListener('input', debounce(() => {
      state.filters.search = document.getElementById('globalSearch').value.trim();
      refresh();
    }, 250));
    document.getElementById('resetFilters').addEventListener('click', () => {
      state.filters = { from: null, to: null, search: '', category: null, region: null, adType: null };
      document.getElementById('globalSearch').value = '';
      initPeriodInputs();
      refresh();
      toast('Фильтры сброшены', 'info');
    });
    document.getElementById('refreshBtn').addEventListener('click', () => {
      if (state.dataset) { refresh(); toast('Данные обновлены', 'success'); }
      else { toast('Сначала загрузите файл', 'warn'); }
    });

    // Ads filters
    ['adFilterCategory', 'adFilterRegion', 'adFilterEff', 'adFilterBudget', 'adFilterSearch'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => { state.adsTable.page = 1; renderAdsSection(); });
    });
    document.getElementById('adFilterReset').addEventListener('click', () => {
      ['adFilterCategory', 'adFilterRegion', 'adFilterEff', 'adFilterBudget', 'adFilterSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      state.adsTable.page = 1;
      renderAdsSection();
    });

    document.getElementById('catFilter').addEventListener('input', renderAnalyticsSection);
  }

  function getCurrentFilters() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;
    return {
      from: from ? new Date(from + 'T00:00:00') : null,
      to: to ? new Date(to + 'T23:59:59') : null,
      search: state.filters.search
    };
  }

  // -------- Refresh (main render) --------
  function refresh() {
    if (!state.dataset) return;
    const filters = getCurrentFilters();
    state.filters = { ...state.filters, ...filters };
    state.filtered = Analytics.filterRows(state.dataset.rows, filters);
    state.kpi = Analytics.computeKPI(state.filtered, state.settings);

    updatePeriodBadge();
    updateDataStatus();

    // Re-render the currently visible section
    const active = document.querySelector('.nav-item.active');
    const id = active ? active.dataset.section : 'dashboard';
    renderForSection(id);
  }

  function updatePeriodBadge() {
    const b = document.getElementById('periodBadge');
    const f = document.getElementById('dateFrom').value;
    const t = document.getElementById('dateTo').value;
    if (f && t) b.textContent = `${formatRu(f)} — ${formatRu(t)}`;
    else b.textContent = 'Все периоды';
  }
  function formatRu(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}.${m}.${y}`;
  }
  function updateDataStatus() {
    const el = document.getElementById('dataStatus');
    if (state.dataset) {
      el.classList.add('ok');
      el.querySelector('.status-text').textContent = `${state.dataset.rows.length} строк`;
    } else {
      el.classList.remove('ok');
      el.querySelector('.status-text').textContent = 'Нет данных';
    }
  }

  function renderForSection(id) {
    if (!state.dataset) return;
    switch (id) {
      case 'dashboard': renderDashboard(); break;
      case 'analytics': renderAnalyticsSection(); break;
      case 'ads': renderAdsSection(); break;
      case 'finance': renderFinanceSection(); break;
      case 'conversions': renderConversionsSection(); break;
      case 'reports': renderReportsSection(); break;
      case 'compare': /* on demand */ break;
      case 'settings': renderSettingsSection(); break;
      case 'export': /* static */ break;
    }
  }

  // -------- KPI cards --------
  function kpiCard({ label, value, sub, kind = '', icon = '' }) {
    return `
      <div class="kpi-card ${kind}">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value ${kind}">${value}</div>
        <div class="kpi-sub">${sub || ''}</div>
        <div class="icon">${icon}</div>
      </div>`;
  }

  const ICONS = {
    impress: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    money: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    target: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    flag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg>',
    cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>',
    trend: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
  };

  function renderKpiGrid(containerId, kpi) {
    const cur = state.settings.currency || '₽';
    const m = Analytics.formatMoney;
    const n = Analytics.formatNum;
    const grid = document.getElementById(containerId);
    if (!grid) return;
    const profitClass = kpi.profit >= 0 ? 'pos' : 'neg';
    grid.innerHTML = [
      kpiCard({ label: 'Показы', value: n(kpi.impressions), sub: 'Частота: ' + kpi.freq.toFixed(2), icon: ICONS.impress, kind: 'cyan' }),
      kpiCard({ label: 'Просмотры', value: n(kpi.views), sub: 'CTR ' + kpi.ctr.toFixed(2) + '%', icon: ICONS.target }),
      kpiCard({ label: 'Контакты', value: n(kpi.contacts), sub: `${n(kpi.calls)} звонков · ${n(kpi.messages)} сообщ.`, icon: ICONS.phone, kind: 'pink' }),
      kpiCard({ label: 'Продажи', value: n(kpi.sales), sub: 'Конв. ' + kpi.totalConv.toFixed(2) + '%', icon: ICONS.cart, kind: 'pos' }),
      kpiCard({ label: 'Расход', value: m(kpi.spend, cur), sub: 'CPC ' + m(kpi.cpc, cur), icon: ICONS.money, kind: 'warn' }),
      kpiCard({ label: 'Доход', value: m(kpi.revenue, cur) + (kpi.revenueIsEstimated ? ' *' : ''), sub: kpi.revenueIsEstimated ? 'оценка по среднему чеку' : 'из файла', icon: ICONS.money, kind: 'pos' }),
      kpiCard({ label: 'Прибыль', value: m(kpi.profit, cur), sub: 'Маржа ' + kpi.margin.toFixed(1) + '%', icon: ICONS.trend, kind: profitClass }),
      kpiCard({ label: 'ROMI', value: kpi.romi.toFixed(1) + '%', sub: 'ROI ' + kpi.roi.toFixed(1) + '%', icon: ICONS.chart, kind: kpi.romi >= 0 ? 'pos' : 'neg' }),
      kpiCard({ label: 'CPM', value: m(kpi.cpm, cur), sub: '1000 показов', icon: ICONS.money }),
      kpiCard({ label: 'CPL', value: m(kpi.cpl, cur), sub: 'Стоимость лида', icon: ICONS.flag }),
      kpiCard({ label: 'CPA', value: m(kpi.cpa, cur), sub: 'Стоимость продажи', icon: ICONS.target, kind: 'warn' }),
      kpiCard({ label: 'Средний чек', value: m(kpi.avgCheckActual, cur), sub: kpi.sales ? 'из ' + n(kpi.sales) + ' продаж' : 'нет продаж', icon: ICONS.cart })
    ].join('');
  }

  // -------- Dashboard --------
  function renderDashboard() {
    const rows = state.filtered;
    const kpi = state.kpi;
    renderKpiGrid('kpiGrid', kpi);

    const daily = Analytics.groupByDate(rows, state.settings);
    const categories = Analytics.groupByCategory(rows, state.settings);

    Charts.lineDaily('lineDaily', daily);
    Charts.funnel('funnel', kpi);
    Charts.pieCategory('pieCategory', categories);
    Charts.lineCTR('lineCTR', daily);
    Charts.renderHeatmap('heatmap', Analytics.buildHeatmap(rows));

    // Recommendations
    const recs = Analytics.recommendations(rows, kpi, state.settings);
    document.getElementById('recommendations').innerHTML = recs.map(r => `
      <div class="rec ${r.kind}">
        <div class="rec-icon">${recIcon(r.kind)}</div>
        <div>
          <div class="rec-title">${escapeHtml(r.title)}</div>
          <div class="rec-text">${escapeHtml(r.text)}</div>
        </div>
      </div>`).join('');

    // Top & worst ads
    renderTopWorst();
  }

  function recIcon(kind) {
    const map = {
      info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      warn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      danger: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    };
    return map[kind] || map.info;
  }

  function renderTopWorst() {
    const top = Analytics.topAds(state.filtered, state.settings, 8);
    const worst = Analytics.worstAds(state.filtered, state.settings, 8);
    document.getElementById('topAdsTable').innerHTML = renderSmallAdsTable(top, 'good');
    document.getElementById('worstAdsTable').innerHTML = renderSmallAdsTable(worst, 'bad');
  }
  function renderSmallAdsTable(ads, mode) {
    if (!ads.length) return '<tbody><tr><td style="padding:14px;color:#888">Нет данных</td></tr></tbody>';
    const head = `<thead><tr><th>Объявление</th><th class="num">Расход</th><th class="num">Прибыль</th><th class="num">ROMI</th></tr></thead>`;
    const body = '<tbody>' + ads.map(a => `
      <tr class="row-${mode}">
        <td>${escapeHtml(truncate(a.key, 40))}</td>
        <td class="num">${Analytics.formatMoney(a.spend)}</td>
        <td class="num ${a.profit >= 0 ? 'pos' : 'neg'}">${Analytics.formatMoney(a.profit)}</td>
        <td class="num">${a.romi.toFixed(1)}%</td>
      </tr>`).join('') + '</tbody>';
    return head + body;
  }

  // -------- Analytics section --------
  function renderAnalyticsSection() {
    const rows = state.filtered;
    const daily = Analytics.groupByDate(rows, state.settings);
    const cats = Analytics.groupByCategory(rows, state.settings);
    const regs = Analytics.groupByRegion(rows, state.settings);

    Charts.barCategory('barCategory', cats);
    Charts.barRegion('barRegion', regs);
    Charts.barRevExp('barRevExp', daily);

    // Category table
    const catFilter = document.getElementById('catFilter').value.toLowerCase().trim();
    const visible = cats.filter(c => !catFilter || c.key.toLowerCase().includes(catFilter));

    const head = `<thead><tr>
      <th>Категория</th>
      <th class="num">Показы</th><th class="num">Просм.</th><th class="num">Конт.</th>
      <th class="num">Прод.</th><th class="num">Расход</th><th class="num">Доход</th>
      <th class="num">Прибыль</th><th class="num">ROMI</th><th class="num">CTR</th>
    </tr></thead>`;
    const body = '<tbody>' + visible.map(c => `
      <tr>
        <td>${escapeHtml(c.key)}</td>
        <td class="num">${Analytics.formatNum(c.impressions)}</td>
        <td class="num">${Analytics.formatNum(c.views)}</td>
        <td class="num">${Analytics.formatNum(c.contacts)}</td>
        <td class="num">${Analytics.formatNum(c.sales)}</td>
        <td class="num">${Analytics.formatMoney(c.spend)}</td>
        <td class="num">${Analytics.formatMoney(c.revenue)}</td>
        <td class="num ${c.profit >= 0 ? 'pos' : 'neg'}">${Analytics.formatMoney(c.profit)}</td>
        <td class="num">${c.romi.toFixed(1)}%</td>
        <td class="num">${c.ctr.toFixed(2)}%</td>
      </tr>`).join('') + '</tbody>';
    document.getElementById('categoryTable').innerHTML = head + body;
  }

  // -------- Ads section --------
  function buildAdSelectOptions() {
    if (!state.dataset) return;
    const cats = Array.from(new Set(state.dataset.rows.map(r => r.category))).sort();
    const regs = Array.from(new Set(state.dataset.rows.map(r => r.region))).sort();
    const fillSel = (id, items) => {
      const el = document.getElementById(id);
      el.innerHTML = '<option value="">Все</option>' + items.map(i => `<option value="${escapeAttr(i)}">${escapeHtml(i)}</option>`).join('');
    };
    fillSel('adFilterCategory', cats);
    fillSel('adFilterRegion', regs);
  }

  function renderAdsSection() {
    if (!state.dataset) return;
    if (!document.getElementById('adFilterCategory').options.length) buildAdSelectOptions();

    const cat = document.getElementById('adFilterCategory').value;
    const reg = document.getElementById('adFilterRegion').value;
    const eff = document.getElementById('adFilterEff').value;
    const budget = parseFloat(document.getElementById('adFilterBudget').value) || 0;
    const search = document.getElementById('adFilterSearch').value.trim().toLowerCase();

    const base = Analytics.filterRows(state.dataset.rows, {
      ...getCurrentFilters(),
      category: cat || null,
      region: reg || null
    });
    let groups = Analytics.groupByAd(base, state.settings);

    if (search) groups = groups.filter(g => g.key.toLowerCase().includes(search));
    if (budget) groups = groups.filter(g => g.spend >= budget);
    if (eff === 'good') groups = groups.filter(g => g.profit > 0);
    if (eff === 'bad') groups = groups.filter(g => g.profit < 0);
    if (eff === 'zero') groups = groups.filter(g => g.sales === 0);

    // sort
    const { col, dir } = state.adsTable.sort;
    groups.sort((a, b) => {
      const av = a[col], bv = b[col];
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? (av - bv) : (bv - av);
    });

    // pagination
    const pageSize = state.adsTable.pageSize;
    const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
    if (state.adsTable.page > totalPages) state.adsTable.page = totalPages;
    const slice = groups.slice((state.adsTable.page - 1) * pageSize, state.adsTable.page * pageSize);

    const cols = [
      { key: 'key', label: 'Объявление' },
      { key: 'category', label: 'Категория', getter: g => g.items[0].category },
      { key: 'impressions', label: 'Показы', num: true },
      { key: 'views', label: 'Просмотры', num: true },
      { key: 'contacts', label: 'Контакты', num: true },
      { key: 'sales', label: 'Продажи', num: true },
      { key: 'ctr', label: 'CTR%', num: true, fmt: v => v.toFixed(2) + '%' },
      { key: 'cpc', label: 'CPC', num: true, fmt: v => Analytics.formatMoney(v) },
      { key: 'cpa', label: 'CPA', num: true, fmt: v => Analytics.formatMoney(v) },
      { key: 'spend', label: 'Расход', num: true, fmt: v => Analytics.formatMoney(v) },
      { key: 'revenue', label: 'Доход', num: true, fmt: v => Analytics.formatMoney(v) },
      { key: 'profit', label: 'Прибыль', num: true, fmt: v => Analytics.formatMoney(v), color: true },
      { key: 'romi', label: 'ROMI', num: true, fmt: v => v.toFixed(1) + '%', color: true }
    ];

    const head = '<thead><tr>' + cols.map(c => {
      const cls = c.num ? 'num' : '';
      const sortCls = col === c.key ? (dir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
      return `<th class="${cls} ${sortCls}" data-sort="${c.key}">${c.label}</th>`;
    }).join('') + '</tr></thead>';

    const body = '<tbody>' + slice.map(g => {
      const rowCls = g.profit > 0 ? 'row-good' : (g.profit < 0 ? 'row-bad' : '');
      return `<tr class="${rowCls}">` + cols.map(c => {
        let v = c.getter ? c.getter(g) : g[c.key];
        if (c.fmt) v = c.fmt(v);
        else if (c.num) v = Analytics.formatNum(v);
        else v = escapeHtml(truncate(String(v), 60));
        let cls = c.num ? 'num' : '';
        if (c.color) cls += ' ' + ((c.key === 'romi' ? g.romi : g.profit) >= 0 ? 'pos' : 'neg');
        return `<td class="${cls}">${v}</td>`;
      }).join('') + '</tr>';
    }).join('') + '</tbody>';

    const t = document.getElementById('adsTable');
    t.innerHTML = head + body;
    t.querySelectorAll('thead th').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (state.adsTable.sort.col === k) state.adsTable.sort.dir = state.adsTable.sort.dir === 'asc' ? 'desc' : 'asc';
        else { state.adsTable.sort = { col: k, dir: 'desc' }; }
        renderAdsSection();
      });
    });

    // pagination UI
    const pg = document.getElementById('adsPagination');
    const buttons = [];
    buttons.push(`<button ${state.adsTable.page === 1 ? 'disabled' : ''} data-pg="prev">‹</button>`);
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - state.adsTable.page) <= 2) {
        buttons.push(`<button class="${p === state.adsTable.page ? 'active' : ''}" data-pg="${p}">${p}</button>`);
      } else if (p === state.adsTable.page - 3 || p === state.adsTable.page + 3) {
        buttons.push(`<span style="padding:0 4px">…</span>`);
      }
    }
    buttons.push(`<button ${state.adsTable.page === totalPages ? 'disabled' : ''} data-pg="next">›</button>`);
    pg.innerHTML = `<div>Всего: ${groups.length}</div><div class="pages">${buttons.join('')}</div>`;
    pg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.pg;
      if (v === 'prev') state.adsTable.page--;
      else if (v === 'next') state.adsTable.page++;
      else state.adsTable.page = parseInt(v, 10);
      renderAdsSection();
    }));

    // store current group set for export
    state._currentAds = groups;
  }

  // -------- Finance section --------
  function renderFinanceSection() {
    const kpi = state.kpi;
    const cur = state.settings.currency;
    const m = Analytics.formatMoney;
    document.getElementById('financeKpi').innerHTML = [
      kpiCard({ label: 'Общий расход', value: m(kpi.spend, cur), sub: 'CPC ' + m(kpi.cpc, cur), icon: ICONS.money, kind: 'warn' }),
      kpiCard({ label: 'Доход', value: m(kpi.revenue, cur), sub: kpi.revenueIsEstimated ? 'оценка' : 'факт', icon: ICONS.money, kind: 'pos' }),
      kpiCard({ label: 'Прибыль / убыток', value: m(kpi.profit, cur), sub: 'Маржа ' + kpi.margin.toFixed(1) + '%', icon: ICONS.trend, kind: kpi.profit >= 0 ? 'pos' : 'neg' }),
      kpiCard({ label: 'ROMI', value: kpi.romi.toFixed(1) + '%', sub: 'ROI ' + kpi.roi.toFixed(1) + '%', icon: ICONS.chart, kind: kpi.romi >= 0 ? 'pos' : 'neg' }),
      kpiCard({ label: 'Средний CPL', value: m(kpi.cpl, cur), sub: 'на лид', icon: ICONS.flag }),
      kpiCard({ label: 'Средний CPA', value: m(kpi.cpa, cur), sub: 'на продажу', icon: ICONS.target }),
      kpiCard({ label: 'Стоимость контакта', value: m(kpi.costPerContact, cur), icon: ICONS.phone }),
      kpiCard({ label: 'Стоимость продажи', value: m(kpi.costPerSale, cur), icon: ICONS.cart })
    ].join('');

    const daily = Analytics.groupByDate(state.filtered, state.settings);
    const cats = Analytics.groupByCategory(state.filtered, state.settings);
    Charts.lineProfit('lineProfit', daily);
    Charts.doughnutExp('doughnutExp', cats);
    Charts.barMargin('barMargin', cats);
  }

  // -------- Conversions section --------
  function renderConversionsSection() {
    const kpi = state.kpi;
    document.getElementById('convKpi').innerHTML = [
      kpiCard({ label: 'Показ → Просмотр', value: kpi.convImpToView.toFixed(2) + '%', icon: ICONS.target }),
      kpiCard({ label: 'Просмотр → Контакт', value: kpi.convViewToContact.toFixed(2) + '%', icon: ICONS.phone, kind: 'cyan' }),
      kpiCard({ label: 'Контакт → Продажа', value: kpi.convContactToSale.toFixed(2) + '%', icon: ICONS.cart, kind: 'pos' }),
      kpiCard({ label: 'Общая конверсия', value: kpi.totalConv.toFixed(3) + '%', sub: 'Показы → Продажи', icon: ICONS.chart, kind: 'warn' })
    ].join('');

    Charts.funnel('funnel2', kpi);
    const daily = Analytics.groupByDate(state.filtered, state.settings);
    Charts.lineConv('lineConv', daily);
    const ads = Analytics.groupByAd(state.filtered, state.settings).filter(a => a.impressions > 0).sort((a, b) => b.totalConv - a.totalConv);
    Charts.barConvAds('barConvAds', ads);
  }

  // -------- Reports section --------
  function renderReportsSection() {
    const daily = Analytics.groupByDate(state.filtered, state.settings);
    const f = Analytics.forecast(daily.map(d => ({ date: new Date(d.key), value: d.profit })), 7);
    Charts.forecastChart('forecastChart', daily, f);

    document.querySelectorAll('.report-card').forEach(card => {
      card.querySelectorAll('button[data-format]').forEach(btn => {
        btn.onclick = () => doReport(card.dataset.report, btn.dataset.format);
      });
    });
  }
  async function doReport(kind, fmt) {
    const kpi = state.kpi;
    if (!kpi) return;
    if (kind === 'summary') {
      if (fmt === 'pdf') {
        await Exporter.exportPDF({
          title: 'Сводный отчёт — Avito Analytics',
          kpi,
          chartIds: ['lineDaily', 'funnel', 'pieCategory', 'lineCTR'],
          filename: `avito-summary-${ymd()}.pdf`
        });
      } else if (fmt === 'xlsx') {
        Exporter.exportXLSX(`avito-summary-${ymd()}.xlsx`, {
          KPI: kpiToRows(kpi),
          Daily: Analytics.groupByDate(state.filtered, state.settings).map(d => ({ Дата: d.key, Показы: d.impressions, Просмотры: d.views, Контакты: d.contacts, Продажи: d.sales, Расход: d.spend, Доход: d.revenue, Прибыль: d.profit })),
          Categories: Analytics.groupByCategory(state.filtered, state.settings).map(simplifyGroup)
        });
      } else if (fmt === 'csv') {
        const daily = Analytics.groupByDate(state.filtered, state.settings).map(d => ({ Дата: d.key, Показы: d.impressions, Просмотры: d.views, Контакты: d.contacts, Продажи: d.sales, Расход: d.spend, Доход: d.revenue, Прибыль: d.profit }));
        Exporter.exportCSV(`avito-summary-${ymd()}.csv`, daily);
      }
    } else if (kind === 'ads') {
      const ads = Analytics.groupByAd(state.filtered, state.settings).map(simplifyGroup);
      if (fmt === 'pdf') {
        await Exporter.exportPDF({
          title: 'Отчёт по объявлениям',
          kpi,
          rowsTable: {
            title: 'Топ-30 объявлений',
            head: ['Название', 'Расход', 'Доход', 'Прибыль', 'ROMI %'],
            body: ads.slice(0, 30).map(a => [truncate(a.Название, 32), Analytics.formatMoney(a.Расход), Analytics.formatMoney(a.Доход), Analytics.formatMoney(a.Прибыль), a.ROMI.toFixed(1)])
          },
          filename: `avito-ads-${ymd()}.pdf`
        });
      } else if (fmt === 'xlsx') Exporter.exportXLSX(`avito-ads-${ymd()}.xlsx`, { Ads: ads });
      else if (fmt === 'csv') Exporter.exportCSV(`avito-ads-${ymd()}.csv`, ads);
    } else if (kind === 'finance') {
      const finance = Analytics.groupByDate(state.filtered, state.settings).map(d => ({
        Дата: d.key, Расход: d.spend, Доход: d.revenue, Прибыль: d.profit, Маржа: d.margin.toFixed(2) + '%', ROMI: d.romi.toFixed(2) + '%'
      }));
      if (fmt === 'pdf') {
        await Exporter.exportPDF({
          title: 'Финансовый отчёт', kpi,
          chartIds: ['lineProfit', 'doughnutExp', 'barMargin'],
          filename: `avito-finance-${ymd()}.pdf`
        });
      }
      else if (fmt === 'xlsx') Exporter.exportXLSX(`avito-finance-${ymd()}.xlsx`, { Finance: finance });
      else if (fmt === 'csv') Exporter.exportCSV(`avito-finance-${ymd()}.csv`, finance);
    }
    toast('Файл сформирован', 'success');
  }

  function kpiToRows(kpi) {
    return [
      { Метрика: 'Показы', Значение: kpi.impressions },
      { Метрика: 'Просмотры', Значение: kpi.views },
      { Метрика: 'Контакты', Значение: kpi.contacts },
      { Метрика: 'Продажи', Значение: kpi.sales },
      { Метрика: 'Расход', Значение: kpi.spend },
      { Метрика: 'Доход', Значение: kpi.revenue },
      { Метрика: 'Прибыль', Значение: kpi.profit },
      { Метрика: 'CTR %', Значение: kpi.ctr },
      { Метрика: 'CPC', Значение: kpi.cpc },
      { Метрика: 'CPM', Значение: kpi.cpm },
      { Метрика: 'CPL', Значение: kpi.cpl },
      { Метрика: 'CPA', Значение: kpi.cpa },
      { Метрика: 'ROI %', Значение: kpi.roi },
      { Метрика: 'ROMI %', Значение: kpi.romi },
      { Метрика: 'Маржа %', Значение: kpi.margin }
    ];
  }
  function simplifyGroup(g) {
    return {
      Название: g.key, Показы: g.impressions, Просмотры: g.views, Контакты: g.contacts, Продажи: g.sales,
      Расход: g.spend, Доход: g.revenue, Прибыль: g.profit, 'CTR%': +g.ctr.toFixed(2), CPC: +g.cpc.toFixed(2),
      CPA: +g.cpa.toFixed(2), 'ROMI%': +g.romi.toFixed(2), ROMI: g.romi, 'Маржа%': +g.margin.toFixed(2)
    };
  }
  function ymd() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  // -------- Compare periods --------
  function setupCompare() {
    document.getElementById('cmpRun').addEventListener('click', runCompare);
  }
  function runCompare() {
    if (!state.dataset) { toast('Сначала загрузите файл', 'warn'); return; }
    const af = document.getElementById('cmpAFrom').value;
    const at = document.getElementById('cmpATo').value;
    const bf = document.getElementById('cmpBFrom').value;
    const bt = document.getElementById('cmpBTo').value;
    if (!af || !at || !bf || !bt) { toast('Укажите оба периода', 'warn'); return; }

    const rowsA = Analytics.filterRows(state.dataset.rows, { from: new Date(af), to: new Date(at + 'T23:59:59') });
    const rowsB = Analytics.filterRows(state.dataset.rows, { from: new Date(bf), to: new Date(bt + 'T23:59:59') });
    const kpiA = Analytics.computeKPI(rowsA, state.settings);
    const kpiB = Analytics.computeKPI(rowsB, state.settings);

    const items = [
      ['Показы', 'impressions', false],
      ['Просмотры', 'views', false],
      ['Контакты', 'contacts', false],
      ['Продажи', 'sales', false],
      ['Расход (₽)', 'spend', true],
      ['Доход (₽)', 'revenue', true],
      ['Прибыль (₽)', 'profit', true],
      ['CTR %', 'ctr', true],
      ['CPC (₽)', 'cpc', true],
      ['CPA (₽)', 'cpa', true],
      ['ROMI %', 'romi', true],
      ['Маржа %', 'margin', true]
    ];
    const row = (label, k, isFloat) => {
      const a = kpiA[k], b = kpiB[k];
      const delta = b - a;
      const pct = a !== 0 ? (delta / Math.abs(a)) * 100 : 0;
      const aStr = isFloat ? (typeof a === 'number' ? a.toFixed(2) : a) : Analytics.formatNum(a);
      const bStr = isFloat ? (typeof b === 'number' ? b.toFixed(2) : b) : Analytics.formatNum(b);
      const dCls = delta >= 0 ? 'pos' : 'neg';
      return `<tr><td>${label}</td><td class="num">${aStr}</td><td class="num">${bStr}</td>
        <td class="num ${dCls}">${delta >= 0 ? '+' : ''}${isFloat ? delta.toFixed(2) : Analytics.formatNum(delta)}</td>
        <td class="num ${dCls}">${delta >= 0 ? '+' : ''}${pct.toFixed(1)}%</td></tr>`;
    };

    const html = `
      <div class="glass card">
        <h3 style="margin-bottom:14px;">Сравнение периодов</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Метрика</th><th class="num">A: ${formatRu(af)}—${formatRu(at)}</th><th class="num">B: ${formatRu(bf)}—${formatRu(bt)}</th><th class="num">Δ</th><th class="num">Δ%</th></tr></thead>
          <tbody>${items.map(([l, k, f]) => row(l, k, f)).join('')}</tbody>
        </table></div>
      </div>`;
    document.getElementById('compareResult').innerHTML = html;
  }

  // -------- Settings --------
  function renderSettingsSection() {
    const s = state.settings;
    document.getElementById('cfgAvgCheck').value = s.avgCheck;
    document.getElementById('cfgMargin').value = s.margin;
    document.getElementById('cfgCurrency').value = s.currency;
    renderMappingFields();
  }
  function renderMappingFields() {
    const cont = document.getElementById('mappingFields');
    const mapping = Storage.loadMapping();
    const fields = Object.keys(Excel.FIELD_SYNONYMS);
    const headers = state.dataset ? state.dataset.headers : [];
    cont.innerHTML = fields.map(f => {
      const opts = ['<option value="">— автоопределение —</option>'].concat(
        headers.map(h => `<option value="${escapeAttr(h)}" ${mapping[f] === h ? 'selected' : ''}>${escapeHtml(h)}</option>`)
      ).join('');
      return `<label class="field"><span>${f}</span>
        <select data-field="${f}" style="width:100%; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:8px 10px; color:var(--text);">${opts}</select>
      </label>`;
    }).join('');
  }
  function setupSettingsHandlers() {
    document.getElementById('saveSettings').addEventListener('click', () => {
      state.settings = {
        avgCheck: +document.getElementById('cfgAvgCheck').value || 5000,
        margin: +document.getElementById('cfgMargin').value || 30,
        currency: document.getElementById('cfgCurrency').value.trim() || '₽'
      };
      Storage.saveSettings(state.settings);
      refresh();
      toast('Настройки сохранены', 'success');
    });
    document.getElementById('saveMapping').addEventListener('click', () => {
      const m = {};
      document.querySelectorAll('#mappingFields select').forEach(s => {
        if (s.value) m[s.dataset.field] = s.value;
      });
      Storage.saveMapping(m);
      toast('Сопоставление сохранено. Загрузите файл повторно для применения.', 'info');
    });
    document.getElementById('clearStorage').addEventListener('click', () => {
      if (!confirm('Удалить все локальные данные?')) return;
      Storage.clearAll();
      state.dataset = null;
      toast('Данные очищены', 'success');
      location.reload();
    });
    document.getElementById('exportSession').addEventListener('click', () => {
      Exporter.exportJSON(`avito-session-${ymd()}.json`, { dataset: state.dataset, settings: state.settings });
    });
    document.getElementById('themeToggle').addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
  }

  // -------- Export section --------
  function setupExportHandlers() {
    document.getElementById('expDataXLSX').addEventListener('click', () => {
      if (!state.dataset) return toast('Нет данных', 'warn');
      const rows = state.filtered.map(r => ({
        Дата: r.dateKey, Объявление: r.title, Категория: r.category, Регион: r.region,
        Показы: r.impressions, Просмотры: r.views, Контакты: r.contacts, Сообщения: r.messages,
        Звонки: r.calls, Избранное: r.favorites, Расход: r.spend, Доход: r.revenue, Продажи: r.sales, Прибыль: r.profit
      }));
      Exporter.exportXLSX(`avito-data-${ymd()}.xlsx`, { Data: rows });
    });
    document.getElementById('expDataCSV').addEventListener('click', () => {
      if (!state.dataset) return toast('Нет данных', 'warn');
      Exporter.exportCSV(`avito-data-${ymd()}.csv`, state.filtered.map(r => ({
        Дата: r.dateKey, Объявление: r.title, Категория: r.category, Показы: r.impressions,
        Просмотры: r.views, Контакты: r.contacts, Расход: r.spend, Доход: r.revenue, Прибыль: r.profit
      })));
    });
    document.getElementById('expDataJSON').addEventListener('click', () => {
      if (!state.dataset) return toast('Нет данных', 'warn');
      Exporter.exportJSON(`avito-data-${ymd()}.json`, state.filtered);
    });

    document.getElementById('expKpiPDF').addEventListener('click', async () => {
      if (!state.kpi) return toast('Нет данных', 'warn');
      await Exporter.exportPDF({ title: 'KPI отчёт', kpi: state.kpi, filename: `avito-kpi-${ymd()}.pdf` });
    });
    document.getElementById('expKpiXLSX').addEventListener('click', () => {
      if (!state.kpi) return toast('Нет данных', 'warn');
      Exporter.exportXLSX(`avito-kpi-${ymd()}.xlsx`, { KPI: kpiToRows(state.kpi) });
    });
    document.getElementById('expChartsAll').addEventListener('click', () => {
      const ids = ['lineDaily', 'funnel', 'pieCategory', 'lineCTR', 'barCategory', 'barRegion', 'barRevExp', 'lineProfit', 'doughnutExp', 'barMargin', 'funnel2', 'lineConv', 'barConvAds', 'forecastChart'];
      Exporter.exportAllChartsZip(ids.filter(id => Charts.getChart(id)));
      toast('Графики сохраняются как PNG...', 'info');
    });

    // Per-chart PNG buttons
    document.querySelectorAll('.export-chart').forEach(b => {
      b.addEventListener('click', () => Exporter.exportChartPNG(b.dataset.chart));
    });

    // Ads export
    document.getElementById('exportAdsCSV').addEventListener('click', () => {
      const ads = (state._currentAds || []).map(simplifyGroup);
      Exporter.exportCSV(`avito-ads-${ymd()}.csv`, ads);
    });
    document.getElementById('exportAdsXLSX').addEventListener('click', () => {
      const ads = (state._currentAds || []).map(simplifyGroup);
      Exporter.exportXLSX(`avito-ads-${ymd()}.xlsx`, { Ads: ads });
    });
  }

  // -------- History --------
  function renderHistory() {
    const hist = Storage.getHistory();
    const el = document.getElementById('historyList');
    if (!hist.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div style="width:100%; font-size:11px; color:var(--text-mute); margin-bottom:4px;">Недавние файлы:</div>' +
      hist.map(h => `<div class="history-chip">📄 ${escapeHtml(h.fileName)} · ${h.rows} строк</div>`).join('');
  }

  // -------- Utils --------
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  // -------- Boot --------
  function init() {
    applyTheme(state.theme);
    Charts.applyTheme(state.theme);
    setupNav();
    setupFileInput();
    setupFilters();
    setupSettingsHandlers();
    setupExportHandlers();
    setupCompare();
    renderHistory();

    // Restore last dataset if present
    const restored = Storage.loadDataset();
    if (restored && restored.rows && restored.rows.length) {
      // restore Date objects (lost during JSON)
      restored.rows = restored.rows.map(r => ({
        ...r,
        date: r.date ? new Date(r.date) : null
      }));
      state.dataset = restored;
      initPeriodInputs();
      refresh();
      document.getElementById('dropZone').classList.add('hide');
      toast('Восстановлены данные предыдущей сессии', 'info');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { state, refresh };
})();
