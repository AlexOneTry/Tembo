/* ============================================================
   app.js — главный контроллер приложения Avito Analytics Pro
   ============================================================
   - Загружает Excel через AvitoParser
   - Сохраняет нормализованный dataset в IndexedDB (AvitoStorage)
   - Применяет фильтры и пересчитывает KPI/графики (AvitoAnalytics)
   - Рисует UI (AvitoUI, AvitoCharts)
   - Поддерживает экспорт (AvitoExport)
*/

(function () {
  'use strict';

  const UI = window.AvitoUI;
  const AN = window.AvitoAnalytics;
  const CH = window.AvitoCharts;
  const ST = window.AvitoStorage;
  const EX = window.AvitoExport;
  const PR = window.AvitoParser;

  // ---------- Состояние ----------
  const state = {
    config: {
      currency: 'RUB',
      avgCheck: 0,
      marginPct: 30,
      targetCPL: 0,
    },
    rawSheets: null,   // массив листов после парсинга
    activeSheetIndex: 0,
    rows: [],          // нормализованные строки активного листа
    filtered: [],      // после фильтров/периода
    fileName: '',
    datasetId: '',
    filters: {
      dateFrom: null, dateTo: null,
      category: '', region: '', adType: '',
      minBudget: 0, minCTR: 0, profitable: '',
      search: '',
    },
    adsTableCtrl: null,
    catTableCtrl: null,
    previewTableCtrl: null,
  };

  // ============================================================
  // Bootstrap
  // ============================================================
  document.addEventListener('DOMContentLoaded', async () => {
    UI.applySavedTheme();
    bindGlobalEvents();
    bindUploadAndDnD();
    bindSidebar();
    bindFiltersAndPeriod();
    bindExportButtons();
    bindHistoryAndSettings();
    initSettingsForm();

    // Восстановить последний датасет, если есть
    const lastId = ST.getLastDatasetId();
    if (lastId) {
      try {
        const ds = await ST.getDataset(lastId);
        if (ds) {
          UI.toast(`Восстановлен файл: ${ds.fileName}`, 'info', 2000);
          adoptDataset(ds);
          return;
        }
      } catch (_) {}
    }
    // Иначе — режим "нет данных"
    setEmptyState();
  });

  // ============================================================
  // Глобальные события
  // ============================================================
  function bindGlobalEvents() {
    document.getElementById('themeToggle').addEventListener('click', UI.toggleTheme);
    document.getElementById('refreshBtn').addEventListener('click', () => {
      if (!state.rows.length) { UI.toast('Сначала загрузите файл', 'warn'); return; }
      recomputeAndRender();
      UI.toast('Аналитика обновлена', 'success', 1500);
    });

    // Global search
    document.getElementById('globalSearch').addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      recomputeAndRender();
    });
  }

  // ============================================================
  // Sidebar / навигация
  // ============================================================
  function bindSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebarToggle');
    const mobile  = document.getElementById('mobileSidebarToggle');

    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    if (mobile) mobile.addEventListener('click', () => sidebar.classList.toggle('open'));

    document.querySelectorAll('#sidebarNav .nav-item').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('#sidebarNav .nav-item').forEach((x) => x.classList.remove('active'));
        a.classList.add('active');
        const view = a.dataset.view;
        document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === view));
        sidebar.classList.remove('open');
        // Пересчёт текущей вью (на случай если canvas был скрыт)
        renderViewSpecific(view);
      });
    });
  }

  function renderViewSpecific(view) {
    if (!state.filtered.length) return;
    const kpi = AN.computeKPI(state.filtered, state.config);
    const ts  = AN.timeseries(state.filtered, state.config);

    if (view === 'analytics') {
      UI.renderMetricsGrid('metricsGrid', kpi, state.config.currency);
      CH.renderMetricsLine('chartMetricsLine', ts);
      CH.renderContactSources('chartContactSources', kpi.counters);
      renderCategoryTable();
    } else if (view === 'ads') {
      renderAdsTable();
      const ranked = AN.rankAds(state.filtered, state.config);
      UI.renderAdList('topAdsList',   ranked, 'top',   8, state.config.currency);
      UI.renderAdList('worstAdsList', ranked, 'worst', 8, state.config.currency);
    } else if (view === 'finance') {
      UI.renderKpiGrid('financeKpi', kpi, state.config.currency);
      CH.renderFinance('chartFinance', ts);
      CH.renderSpendStructure('chartSpendStructure', AN.summarizeGroups(state.filtered, (r) => r.category, state.config));
      CH.renderMargin('chartMargin', ts);
    } else if (view === 'conversions') {
      UI.renderKpiGrid('conversionsKpi', kpi, state.config.currency);
      const f = AN.funnel(state.filtered, state.config);
      CH.renderFunnel('bigFunnelBox', f);
      CH.renderConversionPie('chartConversionPie', f);
      CH.renderConversionsLine('chartConversionsLine', ts);
    }
  }

  // ============================================================
  // Upload + Drag & Drop
  // ============================================================
  function bindUploadAndDnD() {
    const input = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');

    input.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      input.value = '';
    });

    // Drag and drop по всему документу
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      dragCounter++;
      dropZone?.classList.add('is-dragover');
    });
    window.addEventListener('dragleave', () => {
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; dropZone?.classList.remove('is-dragover'); }
    });
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropZone?.classList.remove('is-dragover');
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    });
  }

  async function handleFile(file) {
    if (!/\.xlsx?$/i.test(file.name)) {
      UI.toast('Поддерживаются только файлы .xlsx и .xls', 'error');
      return;
    }
    UI.toast(`Обработка файла: ${file.name}…`, 'info', 2000);
    try {
      const buf = await PR.readFile(file);
      const parsed = PR.parseWorkbook(buf);
      if (!parsed.sheets.length) {
        UI.toast('Не удалось извлечь данные из файла', 'error');
        return;
      }
      // Сохраняем состояние
      state.rawSheets = parsed.sheets;
      state.activeSheetIndex = parsed.activeSheet;
      state.fileName = file.name;

      // Покажем превью с выбором листа
      openPreviewModal();
    } catch (err) {
      console.error(err);
      UI.toast('Ошибка при чтении файла: ' + (err?.message || err), 'error');
    }
  }

  // ============================================================
  // Превью файла + выбор листа
  // ============================================================
  function openPreviewModal() {
    const sel = document.getElementById('sheetSelect');
    sel.innerHTML = state.rawSheets.map((s, i) => `<option value="${i}" ${i === state.activeSheetIndex ? 'selected' : ''}>${UI.escapeHtml(s.name)} (${s.rows.length} строк)</option>`).join('');

    renderPreviewSheet();
    sel.onchange = () => {
      state.activeSheetIndex = parseInt(sel.value, 10);
      renderPreviewSheet();
    };
    document.getElementById('confirmImport').onclick = () => {
      finalizeImport();
      UI.closeModal('previewModal');
    };
    UI.openModal('previewModal');
  }

  function renderPreviewSheet() {
    const sh = state.rawSheets[state.activeSheetIndex];
    const meta = document.getElementById('previewMeta');
    const recognized = Object.entries(sh.mapping).map(([k, v]) => `<strong>${k}</strong>: ${v}`).join(', ');
    meta.innerHTML = `${state.fileName} · Лист «${UI.escapeHtml(sh.name)}» · Распознано: ${recognized || '—'}`;

    const cols = sh.headers.slice(0, 12).map((h) => ({ key: h, label: h }));
    if (state.previewTableCtrl) state.previewTableCtrl.destroy();
    state.previewTableCtrl = UI.createTable({
      tableId: 'previewTable',
      columns: cols,
      rows: sh.rows.slice(0, 50),
      pageSize: 10,
    });
  }

  function finalizeImport() {
    const sh = state.rawSheets[state.activeSheetIndex];
    state.rows = sh.normalized;
    state.datasetId = 'ds_' + Date.now();

    // Период по умолчанию — весь диапазон
    const dates = state.rows.filter((r) => r.date).map((r) => r.date);
    if (dates.length) {
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      document.getElementById('dateFrom').value = ymd(min);
      document.getElementById('dateTo').value   = ymd(max);
      state.filters.dateFrom = min;
      state.filters.dateTo   = max;
    }

    // Подтянуть фильтры (категории/регионы/типы)
    populateFilterOptions();
    populateColumnMappingOptions(sh.headers);

    // Сохраняем датасет
    persistDataset();

    // Включаем интерфейс
    setLoadedState();
    recomputeAndRender();

    UI.toast(`Файл «${state.fileName}» загружен. Найдено ${state.rows.length} строк.`, 'success');
  }

  // ============================================================
  // Сохранение / загрузка датасета
  // ============================================================
  async function persistDataset() {
    try {
      const payload = {
        id: state.datasetId,
        fileName: state.fileName,
        addedAt: new Date().toISOString(),
        rowCount: state.rows.length,
        // Сохраняем массив с сериализацией дат
        rows: state.rows.map((r) => ({ ...r, date: r.date ? r.date.toISOString() : null, raw: null })),
      };
      await ST.putDataset(payload);
      ST.setLastDatasetId(state.datasetId);
      ST.pushHistory({
        id: state.datasetId,
        fileName: state.fileName,
        addedAt: payload.addedAt,
        rowCount: state.rows.length,
      });
    } catch (err) {
      console.warn('Не удалось сохранить датасет:', err);
    }
  }

  function adoptDataset(ds) {
    state.datasetId = ds.id;
    state.fileName  = ds.fileName;
    state.rows      = ds.rows.map((r) => ({ ...r, date: r.date ? new Date(r.date) : null }));

    const dates = state.rows.filter((r) => r.date).map((r) => r.date);
    if (dates.length) {
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      document.getElementById('dateFrom').value = ymd(min);
      document.getElementById('dateTo').value   = ymd(max);
      state.filters.dateFrom = min;
      state.filters.dateTo   = max;
    }
    populateFilterOptions();
    setLoadedState();
    recomputeAndRender();
  }

  // ============================================================
  // Пустое / загруженное состояние
  // ============================================================
  function setEmptyState() {
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('kpiGrid').classList.add('hidden');
    document.getElementById('dashboardCharts').classList.add('hidden');
    document.getElementById('recommendationsBox').classList.add('hidden');
    document.getElementById('datasetLabel').textContent = 'Файл не загружен';
    document.getElementById('datasetStatus').classList.remove('loaded');
  }
  function setLoadedState() {
    document.getElementById('dropZone').classList.add('hidden');
    document.getElementById('kpiGrid').classList.remove('hidden');
    document.getElementById('dashboardCharts').classList.remove('hidden');
    document.getElementById('datasetLabel').textContent = state.fileName + ` · ${state.rows.length} строк`;
    document.getElementById('datasetStatus').classList.add('loaded');
  }

  // ============================================================
  // Фильтры / период
  // ============================================================
  function bindFiltersAndPeriod() {
    document.getElementById('dateFrom').addEventListener('change', (e) => {
      state.filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
      recomputeAndRender();
    });
    document.getElementById('dateTo').addEventListener('change', (e) => {
      state.filters.dateTo = e.target.value ? endOfDay(new Date(e.target.value)) : null;
      recomputeAndRender();
    });

    document.getElementById('filtersBtn').addEventListener('click', () => UI.openModal('filtersModal'));
    document.getElementById('filtersReset').addEventListener('click', () => {
      ['filterCategory', 'filterRegion', 'filterAdType', 'filterMinBudget', 'filterMinCTR', 'filterProfitable']
        .forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
      state.filters.category = '';
      state.filters.region   = '';
      state.filters.adType   = '';
      state.filters.minBudget = 0;
      state.filters.minCTR   = 0;
      state.filters.profitable = '';
      UI.closeModal('filtersModal');
      recomputeAndRender();
    });
    document.getElementById('filtersApply').addEventListener('click', () => {
      state.filters.category   = document.getElementById('filterCategory').value;
      state.filters.region     = document.getElementById('filterRegion').value;
      state.filters.adType     = document.getElementById('filterAdType').value;
      state.filters.minBudget  = +document.getElementById('filterMinBudget').value || 0;
      state.filters.minCTR     = +document.getElementById('filterMinCTR').value || 0;
      state.filters.profitable = document.getElementById('filterProfitable').value;
      UI.closeModal('filtersModal');
      recomputeAndRender();
    });

    // Ads view local controls
    document.getElementById('adsSearch').addEventListener('input', () => renderAdsTable());
    document.getElementById('adsSort').addEventListener('change',  () => renderAdsTable());

    // Compare
    document.getElementById('runCompareBtn').addEventListener('click', runCompare);
    document.getElementById('forecastBtn').addEventListener('click', renderForecast);
  }

  function populateFilterOptions() {
    const uniq = (key) => [...new Set(state.rows.map((r) => r[key]).filter(Boolean))].sort();
    const fill = (id, vals) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = `<option value="">Все</option>` + vals.map((v) => `<option value="${UI.escapeHtml(v)}">${UI.escapeHtml(v)}</option>`).join('');
    };
    fill('filterCategory', uniq('category'));
    fill('filterRegion',   uniq('region'));
    fill('filterAdType',   uniq('adType'));
  }

  // ============================================================
  // Главный pipeline пересчёта
  // ============================================================
  function recomputeAndRender() {
    if (!state.rows.length) { setEmptyState(); return; }

    state.filtered = AN.applyFilters(state.rows, state.filters);

    // -------- Dashboard
    const kpi = AN.computeKPI(state.filtered, state.config);
    UI.renderKpiGrid('kpiGrid', kpi, state.config.currency);

    const ts = AN.timeseries(state.filtered, state.config);
    CH.renderTimeseries('chartTimeseries', ts);

    const f = AN.funnel(state.filtered, state.config);
    CH.renderFunnel('funnelBox', f);

    const catGroups = AN.summarizeGroups(state.filtered, (r) => r.category, state.config);
    CH.renderPie('chartCategoryPie', catGroups.map((g) => g.key), catGroups.map((g) => g.spend || g.contacts || 1));

    const ranked = AN.rankAds(state.filtered, state.config);
    CH.renderTopAds('chartTopAds', ranked, 10);

    const hm = AN.heatmap(state.filtered);
    CH.renderHeatmap('heatmapBox', hm);

    // Рекомендации
    const tips = AN.recommend(state.filtered, kpi, state.config);
    UI.renderRecommendations('recommendationsBox', tips);

    // -------- Дополнительные вью (если открыты)
    const activeView = document.querySelector('.view.active')?.dataset.view;
    if (activeView && activeView !== 'dashboard') renderViewSpecific(activeView);
    else {
      // на всякий случай перерисуем зависимые таблицы (если уже создавались)
      if (state.adsTableCtrl) renderAdsTable();
      if (state.catTableCtrl) renderCategoryTable();
    }
  }

  // ============================================================
  // Таблица объявлений
  // ============================================================
  function renderAdsTable() {
    const sortMode = document.getElementById('adsSort').value;
    const search   = (document.getElementById('adsSearch').value || '').toLowerCase();
    const currency = state.config.currency;

    let ranked = AN.rankAds(state.filtered, state.config);
    if (search) {
      ranked = ranked.filter((r) => `${r.title} ${r.category} ${r.region} ${r.adType}`.toLowerCase().includes(search));
    }

    const sorters = {
      contacts_desc: (a, b) => b.contacts - a.contacts,
      contacts_asc:  (a, b) => a.contacts - b.contacts,
      spend_desc:    (a, b) => b.spend - a.spend,
      spend_asc:     (a, b) => a.spend - b.spend,
      ctr_desc:      (a, b) => b.ctr - a.ctr,
      roi_desc:      (a, b) => b.roi - a.roi,
      cpl_asc:       (a, b) => (a.cpl || 1e9) - (b.cpl || 1e9),
    };
    ranked.sort(sorters[sortMode] || sorters.contacts_desc);

    const rows = ranked.map((r) => ({
      ...r,
      __rowClass: (r.profitEst > 0 ? 'row-profit' : (r.spend > 0 && r.contacts === 0 ? 'row-loss' : (r.profitEst < 0 ? 'row-warn' : ''))),
    }));

    const columns = [
      { key: 'title',       label: 'Объявление',  fmt: (v) => UI.escapeHtml((v || '').slice(0, 60)) },
      { key: 'category',    label: 'Категория',   fmt: (v) => UI.escapeHtml(v || '—') },
      { key: 'region',      label: 'Регион',      fmt: (v) => UI.escapeHtml(v || '—') },
      { key: 'impressions', label: 'Показы',      fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'views',       label: 'Просмотры',   fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'contacts',    label: 'Контакты',    fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'ctr',         label: 'CTR %',       fmt: (v) => UI.fmtPct(v, 2), align: 'right', cellClass: 'num' },
      { key: 'spend',       label: 'Расход',      fmt: (v) => UI.fmtMoney(v, currency), align: 'right', cellClass: 'num' },
      { key: 'cpl',         label: 'CPL',         fmt: (v) => UI.fmtMoney(v, currency), align: 'right', cellClass: 'num' },
      { key: 'profitEst',   label: 'Прибыль',     fmt: (v) => `<span class="${v >= 0 ? 'cell-good' : 'cell-bad'}">${UI.fmtMoney(v, currency)}</span>`, align: 'right', cellClass: 'num' },
      { key: 'roi',         label: 'ROI %',       fmt: (v) => `<span class="${v >= 0 ? 'cell-good' : 'cell-bad'}">${UI.fmtPct(v, 0)}</span>`, align: 'right', cellClass: 'num' },
    ];

    if (state.adsTableCtrl) state.adsTableCtrl.destroy();
    state.adsTableCtrl = UI.createTable({
      tableId: 'adsTable',
      paginationId: 'adsPagination',
      columns, rows,
      pageSize: 15,
      defaultSortKey: 'contacts',
      defaultSortDir: 'desc',
    });
  }

  // ============================================================
  // Таблица категорий (analytics)
  // ============================================================
  function renderCategoryTable() {
    const currency = state.config.currency;
    const groups = AN.summarizeGroups(state.filtered, (r) => r.category, state.config);
    const columns = [
      { key: 'key',         label: 'Категория',  fmt: (v) => UI.escapeHtml(v) },
      { key: 'rowCount',    label: 'Объявлений', fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'impressions', label: 'Показы',     fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'views',       label: 'Просмотры',  fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'contacts',    label: 'Контакты',   fmt: UI.fmtNumber, align: 'right', cellClass: 'num' },
      { key: 'ctr',         label: 'CTR %',      fmt: (v) => UI.fmtPct(v), align: 'right', cellClass: 'num' },
      { key: 'cpl',         label: 'CPL',        fmt: (v) => UI.fmtMoney(v, currency), align: 'right', cellClass: 'num' },
      { key: 'spend',       label: 'Расходы',    fmt: (v) => UI.fmtMoney(v, currency), align: 'right', cellClass: 'num' },
      { key: 'revenue',     label: 'Доходы',     fmt: (v) => UI.fmtMoney(v, currency), align: 'right', cellClass: 'num' },
      { key: 'profit',      label: 'Прибыль',    fmt: (v) => `<span class="${v >= 0 ? 'cell-good' : 'cell-bad'}">${UI.fmtMoney(v, currency)}</span>`, align: 'right', cellClass: 'num' },
      { key: 'roi',         label: 'ROI %',      fmt: (v) => UI.fmtPct(v, 0), align: 'right', cellClass: 'num' },
    ];
    if (state.catTableCtrl) state.catTableCtrl.destroy();
    state.catTableCtrl = UI.createTable({
      tableId: 'categoryTable',
      columns, rows: groups,
      pageSize: 15,
      defaultSortKey: 'contacts',
      defaultSortDir: 'desc',
    });
  }

  // ============================================================
  // Сравнение периодов
  // ============================================================
  function runCompare() {
    if (!state.rows.length) { UI.toast('Сначала загрузите файл', 'warn'); return; }
    const aFrom = document.getElementById('cmpAFrom').value ? new Date(document.getElementById('cmpAFrom').value) : null;
    const aTo   = document.getElementById('cmpATo').value   ? endOfDay(new Date(document.getElementById('cmpATo').value))   : null;
    const bFrom = document.getElementById('cmpBFrom').value ? new Date(document.getElementById('cmpBFrom').value) : null;
    const bTo   = document.getElementById('cmpBTo').value   ? endOfDay(new Date(document.getElementById('cmpBTo').value))   : null;
    if (!aFrom || !aTo || !bFrom || !bTo) { UI.toast('Заполните оба периода', 'warn'); return; }

    const { a, b } = AN.comparePeriods(state.rows, aFrom, aTo, bFrom, bTo, state.config);
    renderCompareResults(a, b);
  }

  function renderCompareResults(a, b) {
    const c = (key, label, fmt) => {
      const va = (a.counters[key] ?? a.rates[key]) ?? 0;
      const vb = (b.counters[key] ?? b.rates[key]) ?? 0;
      const delta = vb - va;
      const pct = va ? (delta / va) * 100 : 0;
      const dCls = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : '';
      return `<div class="compare-card">
        <div class="label">${label}</div>
        <div class="row"><span>Период A</span><span class="a">${fmt(va)}</span></div>
        <div class="row"><span>Период B</span><span class="b">${fmt(vb)}</span></div>
        <div class="delta ${dCls}">${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</div>
      </div>`;
    };
    const m = (v) => UI.fmtMoney(v, state.config.currency);
    const n = UI.fmtNumber;
    const p = (v) => UI.fmtPct(v, 2);

    document.getElementById('compareResults').innerHTML = `
      <div class="compare-grid">
        ${c('impressions', 'Показы', n)}
        ${c('views', 'Просмотры', n)}
        ${c('contacts', 'Контакты', n)}
        ${c('spend', 'Расходы', m)}
        ${c('revenue', 'Доход', m)}
        ${c('profit', 'Прибыль', m)}
        ${c('ctr', 'CTR', p)}
        ${c('cpl', 'CPL', m)}
        ${c('cpc', 'CPC', m)}
        ${c('roi', 'ROI', p)}
        ${c('romi', 'ROMI', p)}
        ${c('convViewContact', 'Конв. Прсм→Конт', p)}
      </div>`;
  }

  // ============================================================
  // Прогноз
  // ============================================================
  function renderForecast() {
    if (!state.rows.length) { UI.toast('Сначала загрузите файл', 'warn'); return; }
    const ts = AN.timeseries(state.filtered, state.config);
    if (ts.length < 3) { UI.toast('Недостаточно дней для прогноза', 'warn'); return; }
    const fc = AN.linearForecast(ts, 7);
    document.getElementById('forecastCard').classList.remove('hidden');
    CH.renderForecast('chartForecast', ts, fc);
    UI.toast('Прогноз построен на 7 дней', 'success', 1500);
  }

  // ============================================================
  // Экспорт
  // ============================================================
  function bindExportButtons() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-export]');
      if (!btn) return;
      if (!state.filtered.length) { UI.toast('Нет данных для экспорта', 'warn'); return; }
      const type = btn.dataset.export;
      const kpi = AN.computeKPI(state.filtered, state.config);
      try {
        if      (type === 'csv')  EX.exportCSV(state.filtered);
        else if (type === 'xlsx') EX.exportXLSX(state.filtered, kpi);
        else if (type === 'json') EX.exportJSON({ kpi, rows: state.filtered, config: state.config });
        else if (type === 'png')  await EX.exportPNG();
        else if (type === 'pdf')  await EX.exportPDF(state.filtered, kpi, state.config.currency);
        UI.toast('Экспорт завершён', 'success', 1500);
      } catch (err) {
        console.error(err);
        UI.toast('Ошибка экспорта: ' + (err?.message || err), 'error');
      }
    });
  }

  // ============================================================
  // История загрузок и настройки
  // ============================================================
  function bindHistoryAndSettings() {
    document.getElementById('historyBtn').addEventListener('click', async () => {
      const list = await ST.listDatasets();
      const el   = document.getElementById('historyList');
      if (!list.length) {
        el.innerHTML = '<div class="text-slate-400 text-sm">История пуста.</div>';
      } else {
        el.innerHTML = list.sort((a, b) => a.addedAt < b.addedAt ? 1 : -1).map((h) => `
          <div class="ad-item" data-id="${h.id}">
            <div>
              <div class="title">${UI.escapeHtml(h.fileName)}</div>
              <div class="meta">${UI.fmtDate(h.addedAt)} · ${UI.fmtNumber(h.rowCount)} строк</div>
            </div>
            <div class="flex gap-2">
              <button class="action-btn !py-1 !px-2 text-xs" data-action="load" data-id="${h.id}">Загрузить</button>
              <button class="action-btn !py-1 !px-2 text-xs !bg-rose-600/20 !border-rose-500/30" data-action="del" data-id="${h.id}">×</button>
            </div>
          </div>
        `).join('');
        el.querySelectorAll('[data-action="load"]').forEach((b) => b.addEventListener('click', async () => {
          const ds = await ST.getDataset(b.dataset.id);
          if (ds) { adoptDataset(ds); UI.closeModal('historyModal'); UI.toast('Датасет загружен', 'success'); }
        }));
        el.querySelectorAll('[data-action="del"]').forEach((b) => b.addEventListener('click', async () => {
          await ST.deleteDataset(b.dataset.id);
          b.closest('.ad-item').remove();
          UI.toast('Запись удалена', 'info', 1500);
        }));
      }
      UI.openModal('historyModal');
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      state.config.currency  = document.getElementById('setCurrency').value;
      state.config.avgCheck  = +document.getElementById('setAvgCheck').value || 0;
      state.config.marginPct = +document.getElementById('setMargin').value   || 30;
      state.config.targetCPL = +document.getElementById('setTargetCPL').value || 0;
      ST.saveSettings(state.config);
      recomputeAndRender();
      UI.toast('Настройки сохранены', 'success', 1500);
    });

    document.getElementById('resetDataBtn').addEventListener('click', async () => {
      if (!confirm('Удалить все сохранённые данные и историю?')) return;
      await ST.clearAll();
      localStorage.removeItem('avito_settings_v1');
      localStorage.removeItem('avito_history_v1');
      localStorage.removeItem('avito_last_id_v1');
      state.rows = []; state.filtered = []; state.fileName = '';
      CH.destroyAll();
      setEmptyState();
      UI.toast('Все данные удалены', 'info');
    });
  }

  function initSettingsForm() {
    const saved = ST.loadSettings();
    state.config = { ...state.config, ...saved };
    document.getElementById('setCurrency').value  = state.config.currency  || 'RUB';
    document.getElementById('setAvgCheck').value  = state.config.avgCheck  || '';
    document.getElementById('setMargin').value    = state.config.marginPct || 30;
    document.getElementById('setTargetCPL').value = state.config.targetCPL || '';
  }

  function populateColumnMappingOptions(headers) {
    const ids = ['setColSpend', 'setColImpressions', 'setColViews', 'setColContacts', 'setColCategory', 'setColDate'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.innerHTML = `<option value="">— автоопределение —</option>` + headers.map((h) => `<option value="${UI.escapeHtml(h)}">${UI.escapeHtml(h)}</option>`).join('');
    }
  }

  // ============================================================
  // Helpers
  // ============================================================
  function ymd(d) {
    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

})();
