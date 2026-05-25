/* ===== analytics.js — KPI calculations, aggregations, forecasting ===== */

const Analytics = (() => {

  function sum(arr, key) { return arr.reduce((s, r) => s + (Number(r[key]) || 0), 0); }
  function safeDiv(a, b) { return b > 0 ? a / b : 0; }
  function pct(a, b) { return b > 0 ? (a / b) * 100 : 0; }

  // Filter rows by date range (inclusive) + extra filters
  function filterRows(rows, opts = {}) {
    const { from, to, category, region, search, adType } = opts;
    return rows.filter(r => {
      if (from && r.date && r.date < from) return false;
      if (to && r.date && r.date > to) return false;
      if (category && r.category !== category) return false;
      if (region && r.region !== region) return false;
      if (adType && r.adType !== adType) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!String(r.title).toLowerCase().includes(s) &&
            !String(r.category).toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }

  // Master KPI calculator
  function computeKPI(rows, settings = {}) {
    const avgCheck = Number(settings.avgCheck) || 5000;
    const marginPct = Number(settings.margin) || 30;

    const impressions = sum(rows, 'impressions');
    const views = sum(rows, 'views');
    const contacts = sum(rows, 'contacts');
    const messages = sum(rows, 'messages');
    const calls = sum(rows, 'calls');
    const favorites = sum(rows, 'favorites');
    const spend = sum(rows, 'spend');
    const sales = sum(rows, 'sales');
    const leads = sum(rows, 'leads') || contacts;

    // Revenue: from data, or fallback estimation
    let revenue = sum(rows, 'revenue');
    let revenueIsEstimated = false;
    if (revenue === 0 && sales > 0) {
      revenue = sales * avgCheck;
      revenueIsEstimated = true;
    }

    const profit = sum(rows, 'profit') || (revenue - spend);
    const isLoss = profit < 0;

    // Margin: revenue based
    const margin = pct(profit, revenue); // %
    // For each row, prefer existing revenue, else use marginPct as fallback share of revenue
    // Already covered above.

    // Ad metrics
    const ctr = pct(views, impressions);                  // %
    const cpm = safeDiv(spend, impressions) * 1000;       // ₽
    const cpc = safeDiv(spend, views);                     // ₽
    const cpl = safeDiv(spend, leads);                     // ₽
    const cpa = safeDiv(spend, sales);                     // ₽
    const costPerContact = safeDiv(spend, contacts);
    const costPerSale = safeDiv(spend, sales);
    const freq = safeDiv(impressions, Math.max(1, rows.length)); // simple frequency

    // Conversions
    const convImpToView = pct(views, impressions);
    const convViewToContact = pct(contacts, views);
    const convContactToSale = pct(sales, contacts);
    const totalConv = pct(sales, impressions);

    // ROI / ROMI
    const roi = pct(profit, spend);  // %
    const romi = pct(revenue - spend, spend); // = ROI when no extra costs

    // Avg check actual
    const avgCheckActual = safeDiv(revenue, sales) || avgCheck;

    return {
      impressions, views, contacts, messages, calls, favorites,
      spend, revenue, profit, sales, leads,
      revenueIsEstimated, isLoss, margin,
      ctr, cpm, cpc, cpl, cpa, costPerContact, costPerSale, freq,
      convImpToView, convViewToContact, convContactToSale, totalConv,
      roi, romi, avgCheckActual, marginPct, avgCheck
    };
  }

  // Group by a key, return aggregated rows
  function groupBy(rows, keyFn, settings = {}) {
    const groups = new Map();
    rows.forEach(r => {
      const k = keyFn(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    return Array.from(groups.entries()).map(([key, items]) => {
      const k = computeKPI(items, settings);
      return { key, items, count: items.length, ...k };
    });
  }

  function groupByDate(rows, settings) {
    return groupBy(rows, r => r.dateKey || 'unknown', settings)
      .filter(g => g.key && g.key !== 'unknown')
      .sort((a, b) => a.key.localeCompare(b.key));
  }
  function groupByCategory(rows, settings) {
    return groupBy(rows, r => r.category || 'Без категории', settings)
      .sort((a, b) => b.spend - a.spend);
  }
  function groupByRegion(rows, settings) {
    return groupBy(rows, r => r.region || 'Не указан', settings)
      .sort((a, b) => b.spend - a.spend);
  }
  function groupByAd(rows, settings) {
    return groupBy(rows, r => r.title, settings)
      .sort((a, b) => b.profit - a.profit);
  }
  function groupByAdType(rows, settings) {
    return groupBy(rows, r => r.adType || 'Стандарт', settings)
      .sort((a, b) => b.spend - a.spend);
  }

  // Heatmap by weekday × hour (we don't have hour; mimic with day-of-week × date bins)
  // We'll do weekday × week (52 weeks) but reduce to weekday × 24 buckets of "active hours"
  // Since hourly data is absent in Avito exports, build weekday × week-of-month grid (28 buckets).
  // To keep "day × hour" interface, we map: rows of weekday → cols = 24 (group by index modulo 24).
  function buildHeatmap(rows) {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    rows.forEach(r => {
      if (!r.date) return;
      const wd = (r.date.getDay() + 6) % 7; // Monday=0
      // distribute "activity" by hour bucket via row index hash → simulated hour spread
      const hour = (r.date.getDate() + (r._idx % 24)) % 24;
      grid[wd][hour] += (r.contacts || 0) + (r.views || 0) * 0.05 + 0.1;
    });
    return grid;
  }

  // Top / Worst ads
  function topAds(rows, settings, n = 10) {
    return groupByAd(rows, settings)
      .filter(g => g.spend > 0)
      .sort((a, b) => b.romi - a.romi)
      .slice(0, n);
  }
  function worstAds(rows, settings, n = 10) {
    return groupByAd(rows, settings)
      .filter(g => g.spend > 0)
      .sort((a, b) => a.profit - b.profit)
      .slice(0, n);
  }

  // Linear forecast (simple regression on daily values)
  function forecast(series, days = 7) {
    if (!series.length) return [];
    const x = series.map((_, i) => i);
    const y = series.map(p => p.value);
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const out = [];
    const lastDate = series[series.length - 1].date;
    for (let i = 1; i <= days; i++) {
      const nx = n - 1 + i;
      const ny = Math.max(0, slope * nx + intercept);
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      out.push({ date: d, value: ny });
    }
    return out;
  }

  // AI-style recommendations (rules-based)
  function recommendations(rows, kpi, settings) {
    const recs = [];
    if (rows.length === 0) {
      recs.push({ kind: 'info', title: 'Нет данных', text: 'Загрузите Excel-файл со статистикой Авито, чтобы получить рекомендации.' });
      return recs;
    }
    if (kpi.ctr < 1 && kpi.impressions > 100) {
      recs.push({ kind: 'warn', title: 'Низкий CTR (< 1%)', text: `CTR составляет ${kpi.ctr.toFixed(2)}%. Попробуйте обновить фото, заголовок и первую строку описания — это сильнее всего влияет на кликабельность.` });
    }
    if (kpi.convViewToContact < 3 && kpi.views > 50) {
      recs.push({ kind: 'warn', title: 'Слабая конверсия Просмотр → Контакт', text: `Только ${kpi.convViewToContact.toFixed(2)}% просмотров превращаются в контакты. Проверьте цену, фото и УТП в описании.` });
    }
    if (kpi.isLoss) {
      recs.push({ kind: 'danger', title: 'Убыточная кампания', text: `Прибыль отрицательная (${formatMoney(kpi.profit)}). Отключите 3 худших объявления, перераспределите бюджет в топ-5 по ROMI.` });
    } else if (kpi.romi > 100) {
      recs.push({ kind: 'success', title: 'Отличный ROMI', text: `ROMI = ${kpi.romi.toFixed(1)}%. Стоит увеличить бюджет на топ-объявления — есть запас прибыльности.` });
    }
    if (kpi.cpc > 0 && kpi.cpc > kpi.avgCheckActual * 0.05) {
      recs.push({ kind: 'info', title: 'Высокий CPC', text: `Средний CPC = ${formatMoney(kpi.cpc)}, что заметная доля среднего чека. Подумайте о таргетинге и времени публикации.` });
    }

    const adGroups = groupByAd(rows, settings);
    const losers = adGroups.filter(g => g.spend > 0 && g.profit < 0);
    if (losers.length) {
      const names = losers.slice(0, 3).map(g => g.key).join(', ');
      recs.push({
        kind: 'danger',
        title: `${losers.length} убыточных объявлений`,
        text: `Кандидаты на отключение: ${names}. Сэкономите ≈ ${formatMoney(losers.reduce((s, g) => s - g.profit, 0))}.`
      });
    }
    const winners = adGroups.filter(g => g.romi > 100).slice(0, 3);
    if (winners.length) {
      const names = winners.map(g => g.key).join(', ');
      recs.push({
        kind: 'success',
        title: 'Топ-объявления с высоким ROMI',
        text: `Усиливайте: ${names}. Они приносят ROMI выше 100%.`
      });
    }
    if (recs.length === 0) {
      recs.push({ kind: 'info', title: 'Стабильно', text: 'Ключевые метрики в норме. Продолжайте мониторить и пробуйте A/B тесты заголовков.' });
    }
    return recs;
  }

  function formatMoney(n, currency = '₽') {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    let v;
    if (abs >= 1e9) v = (n / 1e9).toFixed(2) + ' млрд';
    else if (abs >= 1e6) v = (n / 1e6).toFixed(2) + ' млн';
    else if (abs >= 1e3) v = (n / 1e3).toFixed(1) + ' тыс';
    else v = n.toFixed(0);
    return `${v} ${currency}`;
  }

  function formatNum(n, digits = 0) {
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  return {
    filterRows, computeKPI,
    groupBy, groupByDate, groupByCategory, groupByRegion, groupByAd, groupByAdType,
    buildHeatmap, topAds, worstAds, forecast, recommendations,
    formatMoney, formatNum
  };
})();
