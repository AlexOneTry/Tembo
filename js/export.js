/* ============================================================
   export.js — экспорт в PDF / Excel / CSV / PNG / JSON
   ============================================================ */
(function (global) {
  'use strict';

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 50);
  }

  // ---------- CSV ----------
  function exportCSV(rows, name = 'avito-analytics.csv') {
    if (!rows || !rows.length) return;
    const cols = ['date', 'title', 'category', 'region', 'adType', 'impressions', 'views', 'contacts', 'messages', 'calls', 'favorites', 'spend', 'revenue', 'profit'];
    const head = ['Дата', 'Объявление', 'Категория', 'Регион', 'Тип', 'Показы', 'Просмотры', 'Контакты', 'Сообщения', 'Звонки', 'Избранное', 'Расходы', 'Доход', 'Прибыль'];
    const lines = [head.join(';')];
    for (const r of rows) {
      const v = cols.map((c) => {
        const val = r[c];
        if (val instanceof Date) return val.toISOString().slice(0, 10);
        const s = (val == null ? '' : val.toString()).replace(/[\r\n;]/g, ' ');
        return s.includes(';') ? `"${s}"` : s;
      });
      lines.push(v.join(';'));
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, name);
  }

  // ---------- Excel ----------
  function exportXLSX(rows, kpi, name = 'avito-analytics.xlsx') {
    const wb = XLSX.utils.book_new();

    // 1. KPI sheet
    const counters = kpi.counters || {};
    const rates    = kpi.rates    || {};
    const kpiArr = [
      ['Метрика', 'Значение'],
      ['Показы',     counters.impressions || 0],
      ['Просмотры',  counters.views       || 0],
      ['Контакты',   counters.contacts    || 0],
      ['Сообщения',  counters.messages    || 0],
      ['Звонки',     counters.calls       || 0],
      ['Избранное',  counters.favorites   || 0],
      ['Расходы',    counters.spend       || 0],
      ['Доход',      counters.revenue     || 0],
      ['Прибыль',    counters.profit      || 0],
      ['CTR, %',     +(rates.ctr || 0).toFixed(2)],
      ['CPC',        +(rates.cpc || 0).toFixed(2)],
      ['CPM',        +(rates.cpm || 0).toFixed(2)],
      ['CPL',        +(rates.cpl || 0).toFixed(2)],
      ['CPA',        +(rates.cpa || 0).toFixed(2)],
      ['ROI, %',     +(rates.roi || 0).toFixed(2)],
      ['ROMI, %',    +(rates.romi || 0).toFixed(2)],
      ['Маржа, %',   +(rates.margin || 0).toFixed(2)],
      ['Конв. показ→прсм., %',    +(rates.convImpView || 0).toFixed(2)],
      ['Конв. прсм.→конт., %',    +(rates.convViewContact || 0).toFixed(2)],
      ['Конв. конт.→прдж., %',    +(rates.convContactSale || 0).toFixed(2)],
      ['Средний чек', +(rates.avgCheck || 0).toFixed(2)],
    ];
    const wsKpi = XLSX.utils.aoa_to_sheet(kpiArr);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI');

    // 2. Ads sheet
    const head = ['Дата', 'Объявление', 'Категория', 'Регион', 'Тип', 'Показы', 'Просмотры', 'Контакты', 'Сообщения', 'Звонки', 'Избранное', 'Расходы', 'Доход', 'Прибыль', 'CTR %', 'CPL'];
    const data = [head, ...rows.map((r) => {
      const ctr = r.impressions ? (r.views / r.impressions) * 100 : 0;
      const cpl = r.contacts ? r.spend / r.contacts : 0;
      const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : (r.date || '');
      return [d, r.title, r.category, r.region, r.adType, r.impressions, r.views, r.contacts, r.messages, r.calls, r.favorites, r.spend, r.revenue, r.profit, +ctr.toFixed(2), +cpl.toFixed(2)];
    })];
    const wsAds = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, wsAds, 'Объявления');

    XLSX.writeFile(wb, name);
  }

  // ---------- JSON ----------
  function exportJSON(payload, name = 'avito-analytics.json') {
    const blob = new Blob([JSON.stringify(payload, replaceDates, 2)], { type: 'application/json' });
    downloadBlob(blob, name);
  }
  function replaceDates(_, v) { return (v instanceof Date) ? v.toISOString() : v; }

  // ---------- PNG (все графики на текущем экране) ----------
  async function exportPNG() {
    const canvases = document.querySelectorAll('.view.active canvas');
    let i = 0;
    for (const c of canvases) {
      const url = c.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = `chart-${++i}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise((r) => setTimeout(r, 100));
    }
    // DOM-based (heatmap, funnel) — через html2canvas
    const blocks = document.querySelectorAll('.view.active .funnel, .view.active .heatmap');
    for (const b of blocks) {
      try {
        const canv = await html2canvas(b, { backgroundColor: '#0b0f1a', scale: 2 });
        const url = canv.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url; a.download = `chart-${++i}.png`;
        document.body.appendChild(a); a.click(); a.remove();
      } catch (_) {}
    }
  }

  // ---------- PDF ----------
  async function exportPDF(rows, kpi, currency = 'RUB') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    // Заголовок
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageW, 60, 'F');
    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.text('Avito Analytics — Отчёт', 24, 38);
    doc.setFontSize(10);
    doc.text(new Date().toLocaleString('ru-RU'), pageW - 24, 38, { align: 'right' });

    // KPI таблица
    doc.setTextColor(0);
    const c = kpi.counters || {};
    const r = kpi.rates    || {};
    const m = (n) => Math.round(n || 0).toLocaleString('ru-RU') + ' ' + (currency === 'RUB' ? 'RUB' : '');

    doc.autoTable({
      startY: 80,
      head: [['Ключевая метрика', 'Значение']],
      body: [
        ['Показы',     (c.impressions || 0).toLocaleString('ru-RU')],
        ['Просмотры',  (c.views       || 0).toLocaleString('ru-RU')],
        ['Контакты',   (c.contacts    || 0).toLocaleString('ru-RU')],
        ['Расходы',    m(c.spend)],
        ['Доход',      m(c.revenue)],
        ['Прибыль',    m(c.profit)],
        ['CTR, %',     (r.ctr || 0).toFixed(2)],
        ['CPC',        (r.cpc || 0).toFixed(2)],
        ['CPL',        (r.cpl || 0).toFixed(2)],
        ['ROI, %',     (r.roi || 0).toFixed(2)],
        ['ROMI, %',    (r.romi || 0).toFixed(2)],
        ['Маржа, %',   (r.margin || 0).toFixed(2)],
      ],
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      theme: 'striped',
      styles: { fontSize: 10 },
    });

    // Снимки графиков с активного экрана
    let y = doc.lastAutoTable.finalY + 20;
    const canvases = document.querySelectorAll('.view.active canvas');
    for (const cv of canvases) {
      const img = cv.toDataURL('image/png');
      const w = pageW - 48;
      const h = (cv.height / cv.width) * w;
      if (y + h > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40; }
      doc.addImage(img, 'PNG', 24, y, w, h);
      y += h + 14;
    }

    // ТОП-20 объявлений
    if (rows && rows.length) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('ТОП-20 объявлений по контактам', 24, 40);
      const sorted = [...rows].sort((a, b) => (b.contacts || 0) - (a.contacts || 0)).slice(0, 20);
      doc.autoTable({
        startY: 56,
        head: [['Объявление', 'Категория', 'Показы', 'Прсм.', 'Конт.', 'Расход', 'CPL']],
        body: sorted.map((r) => [
          (r.title || '').slice(0, 42),
          (r.category || '').slice(0, 16),
          (r.impressions || 0).toLocaleString('ru-RU'),
          (r.views || 0).toLocaleString('ru-RU'),
          (r.contacts || 0).toLocaleString('ru-RU'),
          m(r.spend),
          r.contacts ? (r.spend / r.contacts).toFixed(0) : '0',
        ]),
        headStyles: { fillColor: [34, 211, 238], textColor: 0 },
        theme: 'grid',
        styles: { fontSize: 9 },
      });
    }

    doc.save('avito-analytics-report.pdf');
  }

  global.AvitoExport = {
    exportCSV, exportXLSX, exportJSON, exportPNG, exportPDF,
  };
})(window);
