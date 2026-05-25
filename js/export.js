/* ===== export.js — PDF / XLSX / CSV / PNG / JSON exports ===== */

const Exporter = (() => {

  function download(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // === CSV ===
  function toCSV(rows, headers) {
    const cols = headers || Object.keys(rows[0] || {});
    const escape = v => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const lines = [cols.join(';')];
    rows.forEach(r => lines.push(cols.map(c => escape(r[c])).join(';')));
    return lines.join('\n');
  }
  function exportCSV(filename, rows, headers) {
    const csv = toCSV(rows, headers);
    download(filename, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  }

  // === XLSX ===
  function exportXLSX(filename, sheets) {
    // sheets: { sheetName: rows[] }
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([name, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  }

  // === JSON ===
  function exportJSON(filename, data) {
    download(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  }

  // === PDF (basic, jsPDF + autotable) ===
  async function exportPDF({ title, kpi, rowsTable, chartIds = [], filename }) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageW, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(title || 'Avito Analytics Report', 10, 10);

    doc.setTextColor(40, 40, 50);
    doc.setFontSize(9);
    const date = new Date().toLocaleString('ru-RU');
    doc.text(`Сгенерировано: ${date}`, 10, 22);

    let y = 30;

    if (kpi) {
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text('Ключевые показатели', 10, y); y += 5;

      const kpiRows = [
        ['Показы', Analytics.formatNum(kpi.impressions)],
        ['Просмотры', Analytics.formatNum(kpi.views)],
        ['Контакты', Analytics.formatNum(kpi.contacts)],
        ['Продажи', Analytics.formatNum(kpi.sales)],
        ['Расход', Analytics.formatMoney(kpi.spend)],
        ['Доход', Analytics.formatMoney(kpi.revenue)],
        ['Прибыль', Analytics.formatMoney(kpi.profit)],
        ['ROI', kpi.roi.toFixed(2) + ' %'],
        ['ROMI', kpi.romi.toFixed(2) + ' %'],
        ['CTR', kpi.ctr.toFixed(2) + ' %'],
        ['CPC', Analytics.formatMoney(kpi.cpc)],
        ['CPM', Analytics.formatMoney(kpi.cpm)],
        ['CPL', Analytics.formatMoney(kpi.cpl)],
        ['CPA', Analytics.formatMoney(kpi.cpa)],
        ['Маржинальность', kpi.margin.toFixed(2) + ' %'],
        ['Конверсия общая', kpi.totalConv.toFixed(2) + ' %']
      ];
      doc.autoTable({
        head: [['Метрика', 'Значение']],
        body: kpiRows,
        startY: y,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 211, 238] }
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Charts as images
    for (const id of chartIds) {
      const ch = Charts.getChart(id);
      if (!ch) continue;
      const img = ch.toBase64Image('image/png', 1);
      if (y > 230) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      const titleByChart = {
        lineDaily: 'Динамика расходов и контактов',
        funnel: 'Воронка',
        pieCategory: 'Распределение расходов',
        lineCTR: 'CTR и конверсия',
        lineProfit: 'Прибыль/убыток',
        barCategory: 'По категориям',
        barRegion: 'По регионам',
        barRevExp: 'Доход vs Расход'
      };
      doc.text(titleByChart[id] || id, 10, y); y += 3;
      doc.addImage(img, 'PNG', 10, y, pageW - 20, 70);
      y += 75;
    }

    if (rowsTable && rowsTable.body && rowsTable.body.length) {
      if (y > 230) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      doc.text(rowsTable.title || 'Таблица', 10, y); y += 3;
      doc.autoTable({
        head: [rowsTable.head],
        body: rowsTable.body,
        startY: y,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [139, 92, 246] }
      });
    }

    doc.save(filename || 'report.pdf');
  }

  function exportChartPNG(id) {
    Charts.exportPNG(id, `${id}-${Date.now()}.png`);
  }

  function exportAllChartsZip(ids) {
    // Without JSZip we just trigger sequential downloads
    ids.forEach((id, i) => setTimeout(() => exportChartPNG(id), i * 200));
  }

  return { exportCSV, exportXLSX, exportJSON, exportPDF, exportChartPNG, exportAllChartsZip, download, toCSV };
})();
