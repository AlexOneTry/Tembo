/* ============================================================
   analytics.js — все расчёты метрик, KPI, агрегаций и рекомендаций
   ============================================================
   - Принимает массив "нормализованных" строк AvitoParser
   - Считает: CPC / CPM / CTR / CPL / CPA / ROI / ROMI / маржу / конверсии
   - Группирует: по объявлениям / категориям / датам / регионам / типам
   - Строит воронку и тепловую карту
   - Выдаёт ИИ-подобные рекомендации
*/

(function (global) {
  'use strict';

  const SAFE = (n, fallback = 0) => (isFinite(n) ? n : fallback);
  const div  = (a, b) => (b ? a / b : 0);

  // -------------------- Конфиг по умолчанию --------------------
  const DEFAULT_CONFIG = {
    currency: 'RUB',
    avgCheck: 0,        // пользовательский средний чек (если в файле нет дохода)
    marginPct: 30,      // % маржинальности по умолчанию
    targetCPL: 0,       // целевой CPL для рекомендаций
  };

  // -------------------- Базовые суммы --------------------
  function sumRows(rows) {
    let impressions = 0, views = 0, contacts = 0, messages = 0, calls = 0,
        favorites = 0, spend = 0, revenue = 0, sales = 0, profit = 0;

    for (const r of rows) {
      impressions += r.impressions || 0;
      views       += r.views       || 0;
      contacts    += r.contacts    || 0;
      messages    += r.messages    || 0;
      calls       += r.calls       || 0;
      favorites   += r.favorites   || 0;
      spend       += r.spend       || 0;
      revenue     += r.revenue     || 0;
      sales       += r.sales       || 0;
      profit      += r.profit      || 0;
    }
    return { impressions, views, contacts, messages, calls, favorites, spend, revenue, sales, profit };
  }

  // -------------------- Метрики --------------------
  /**
   * computeKPI(rows, config)
   * Возвращает все основные KPI / коэффициенты.
   */
  function computeKPI(rows, config = DEFAULT_CONFIG) {
    const s = sumRows(rows);

    // Если "продаж" нет, считаем оценочно: 30% от контактов превращаются в продажу
    // НО только если есть выручка/средний чек; иначе оставляем 0.
    let estimatedSales = s.sales;
    let estimatedRevenue = s.revenue;
    let estimatedProfit = s.profit;

    if (!estimatedSales && config.avgCheck > 0 && s.contacts > 0) {
      // Предполагаем коэффициент закрытия 30% — если у пользователя нет других данных
      estimatedSales = s.contacts * 0.3;
    }
    if (!estimatedRevenue && config.avgCheck > 0 && estimatedSales > 0) {
      estimatedRevenue = estimatedSales * config.avgCheck;
    }
    if (!estimatedProfit && estimatedRevenue > 0) {
      estimatedProfit = estimatedRevenue * (config.marginPct / 100) - s.spend;
    }

    const ctr      = div(s.views, s.impressions) * 100;          // %
    const cpc      = div(s.spend, s.views);                       // ₽ / просмотр (как клик)
    const cpm      = div(s.spend, s.impressions) * 1000;
    const cpl      = div(s.spend, s.contacts);                    // стоимость лида
    const cpa      = div(s.spend, estimatedSales);
    const cpaContact = cpl;
    const convImpView = div(s.views, s.impressions) * 100;
    const convViewContact = div(s.contacts, s.views) * 100;
    const convContactSale = estimatedSales > 0 ? div(estimatedSales, s.contacts) * 100 : 0;
    const overallConv = div(estimatedSales, s.impressions) * 100;

    const roi      = s.spend > 0 ? ((estimatedProfit) / s.spend) * 100 : 0;
    const romi     = s.spend > 0 ? ((estimatedRevenue - s.spend) / s.spend) * 100 : 0;
    const margin   = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;
    const avgCheck = estimatedSales > 0 ? estimatedRevenue / estimatedSales : (config.avgCheck || 0);

    return {
      counters: {
        impressions: s.impressions,
        views:       s.views,
        contacts:    s.contacts,
        messages:    s.messages,
        calls:       s.calls,
        favorites:   s.favorites,
        spend:       s.spend,
        revenue:     estimatedRevenue,
        sales:       estimatedSales,
        profit:      estimatedProfit,
        loss:        estimatedProfit < 0 ? -estimatedProfit : 0,
        rowCount:    rows.length,
      },
      rates: {
        ctr:               SAFE(ctr),
        cpc:               SAFE(cpc),
        cpm:               SAFE(cpm),
        cpl:               SAFE(cpl),
        cpa:               SAFE(cpa),
        cpaContact:        SAFE(cpaContact),
        convImpView:       SAFE(convImpView),
        convViewContact:   SAFE(convViewContact),
        convContactSale:   SAFE(convContactSale),
        overallConv:       SAFE(overallConv),
        roi:               SAFE(roi),
        romi:              SAFE(romi),
        margin:            SAFE(margin),
        avgCheck:          SAFE(avgCheck),
        frequency:         SAFE(div(s.impressions, s.contacts || 1)),
      },
    };
  }

  // -------------------- Группировка --------------------
  function groupBy(rows, keyFn) {
    const map = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      if (k == null || k === '') continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return map;
  }

  // Рассчитать сводку по группам (с KPI на каждую)
  function summarizeGroups(rows, keyFn, config) {
    const groups = groupBy(rows, keyFn);
    const out = [];
    for (const [key, gRows] of groups.entries()) {
      const kpi = computeKPI(gRows, config);
      out.push({
        key,
        rowCount: gRows.length,
        ...kpi.counters,
        ...kpi.rates,
        rows: gRows,
      });
    }
    return out;
  }

  // -------------------- Временные ряды --------------------
  /**
   * timeseries(rows) → массив {date, impressions, views, contacts, spend, revenue, profit, ctr, cpc, cpl}
   * сгруппированный по календарной дате
   */
  function timeseries(rows, config) {
    const map = new Map();
    for (const r of rows) {
      if (!r.date) continue;
      const key = r.date.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }

    const out = [];
    for (const [date, gRows] of [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
      const kpi = computeKPI(gRows, config);
      out.push({
        date,
        ...kpi.counters,
        ...kpi.rates,
      });
    }
    return out;
  }

  // -------------------- Воронка --------------------
  function funnel(rows, config) {
    const kpi = computeKPI(rows, config);
    const { impressions, views, contacts, sales } = kpi.counters;
    return [
      { label: 'Показы',    value: impressions, pct: 100 },
      { label: 'Просмотры', value: views,    pct: impressions ? (views    / impressions) * 100 : 0 },
      { label: 'Контакты',  value: contacts, pct: views       ? (contacts / views)       * 100 : 0 },
      { label: 'Продажи',   value: sales,    pct: contacts    ? (sales    / contacts)    * 100 : 0 },
    ];
  }

  // -------------------- Heatmap --------------------
  // День недели (0-6, понедельник = 0) × час (0-23) → суммарные контакты
  function heatmap(rows) {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of rows) {
      if (!r.date) continue;
      const d = (r.date.getDay() + 6) % 7; // Mon=0
      const h = r.date.getHours();
      grid[d][h] += (r.contacts || 0);
    }
    return grid;
  }

  // -------------------- Топ / худшие --------------------
  function rankAds(rows, config) {
    const list = rows.map((r) => {
      const ctr = div(r.views, r.impressions) * 100;
      const cpl = div(r.spend, r.contacts);
      const cpc = div(r.spend, r.views);
      // оценка дохода для одиночного ряда (если в файле нет)
      const rev = r.revenue || (config.avgCheck > 0 && r.contacts > 0 ? r.contacts * 0.3 * config.avgCheck : 0);
      const profit = r.profit || (rev > 0 ? rev * (config.marginPct / 100) - r.spend : -r.spend);
      const roi = r.spend > 0 ? (profit / r.spend) * 100 : 0;

      // composite score: контакты и просмотры дают плюсы, перерасход CPL и убыток — минус
      const cplPenalty = cpl > 0 ? cpl * r.contacts * 0.05 : 0;
      const score = (r.contacts * 3) + (r.views * 0.05) - cplPenalty + (profit > 0 ? profit * 0.01 : profit * 0.02);

      return { ...r, ctr, cpl, cpc, revenueEst: rev, profitEst: profit, roi, score };
    });
    return list;
  }

  // -------------------- Рекомендации --------------------
  function recommend(rows, kpi, config) {
    const tips = [];
    const ranked = rankAds(rows, config);

    // 1. Глобальные показатели
    if (kpi.counters.spend > 0 && kpi.rates.roi < 0) {
      tips.push({ type: 'alert', text: `Текущий ROI составляет ${kpi.rates.roi.toFixed(1)}% — реклама в минусе. Снизьте ставки на убыточных объявлениях.` });
    } else if (kpi.rates.roi > 50) {
      tips.push({ type: 'good', text: `Отличный ROI ${kpi.rates.roi.toFixed(1)}%. Можно увеличить бюджет на лучших объявлениях для масштабирования.` });
    }

    if (kpi.rates.ctr < 1 && kpi.counters.impressions > 100) {
      tips.push({ type: 'warn', text: `Низкий CTR (${kpi.rates.ctr.toFixed(2)}%). Стоит поработать над заголовками и первой фотографией объявлений.` });
    }
    if (kpi.rates.convViewContact < 3 && kpi.counters.views > 100) {
      tips.push({ type: 'warn', text: `Конверсия из просмотра в контакт всего ${kpi.rates.convViewContact.toFixed(2)}%. Улучшите описание, цену и УТП.` });
    }

    // 2. Худшие объявления
    const worst = [...ranked].sort((a, b) => a.score - b.score).slice(0, 3);
    for (const w of worst) {
      if (w.spend > 0 && w.contacts === 0) {
        tips.push({ type: 'alert', text: `«${trimText(w.title, 60)}» — потрачено ${money(w.spend)}, но 0 контактов. Отключите или измените креатив.` });
      } else if (w.profitEst < 0 && w.spend > kpi.counters.spend * 0.05) {
        tips.push({ type: 'warn', text: `«${trimText(w.title, 60)}» съедает бюджет: потрачено ${money(w.spend)} при убытке ${money(-w.profitEst)}.` });
      }
    }

    // 3. Лучшие объявления
    const best = [...ranked].sort((a, b) => b.score - a.score).slice(0, 2);
    for (const b of best) {
      if (b.contacts > 0 && b.roi > 30) {
        tips.push({ type: 'tip', text: `«${trimText(b.title, 60)}» — лидер: ${b.contacts} контактов, ROI ${b.roi.toFixed(0)}%. Увеличьте бюджет на 20-30%.` });
      }
    }

    // 4. Целевой CPL
    if (config.targetCPL > 0 && kpi.rates.cpl > config.targetCPL) {
      tips.push({ type: 'warn', text: `Текущий CPL ${money(kpi.rates.cpl)} превышает целевой ${money(config.targetCPL)}. Перераспределите бюджет в сторону объявлений с лучшим CPL.` });
    }

    // 5. Если совсем нет данных
    if (kpi.counters.impressions === 0 && kpi.counters.spend === 0) {
      tips.push({ type: 'tip', text: 'Похоже, активной рекламной кампании пока нет — данные содержат только просмотры/контакты.' });
    }

    return tips;
  }

  function trimText(s, n) {
    s = (s || '').toString();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function money(n) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
  }

  // -------------------- Прогнозирование --------------------
  // Простой линейный прогноз методом наименьших квадратов
  function linearForecast(series, daysAhead = 7) {
    const n = series.length;
    if (n < 3) return [];
    const xs = series.map((_, i) => i);
    const ys = series.map((p) => p.contacts || 0);
    const xm = xs.reduce((s, v) => s + v, 0) / n;
    const ym = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - xm) * (ys[i] - ym); den += (xs[i] - xm) ** 2; }
    const k = den ? num / den : 0;
    const b = ym - k * xm;

    const lastDate = new Date(series[n - 1].date);
    const out = [];
    for (let i = 1; i <= daysAhead; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      const val = Math.max(0, k * (n - 1 + i) + b);
      out.push({ date: d.toISOString().slice(0, 10), forecastContacts: val });
    }
    return out;
  }

  // -------------------- Фильтры --------------------
  function applyFilters(rows, filters = {}) {
    return rows.filter((r) => {
      if (filters.dateFrom && r.date && r.date < filters.dateFrom) return false;
      if (filters.dateTo   && r.date && r.date > filters.dateTo)   return false;
      if (filters.category && r.category !== filters.category)     return false;
      if (filters.region   && r.region   !== filters.region)       return false;
      if (filters.adType   && r.adType   !== filters.adType)       return false;
      if (filters.minBudget && r.spend < filters.minBudget)        return false;
      if (filters.minCTR) {
        const c = div(r.views, r.impressions) * 100;
        if (c < filters.minCTR) return false;
      }
      if (filters.profitable === 'yes') {
        if ((r.profit || 0) <= 0) return false;
      } else if (filters.profitable === 'no') {
        if ((r.profit || 0) >= 0) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = `${r.title} ${r.category} ${r.region} ${r.adType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // -------------------- Сравнение периодов --------------------
  function comparePeriods(rows, aFrom, aTo, bFrom, bTo, config) {
    const inRange = (r, f, t) => r.date && r.date >= f && r.date <= t;
    const A = rows.filter((r) => inRange(r, aFrom, aTo));
    const B = rows.filter((r) => inRange(r, bFrom, bTo));
    const kA = computeKPI(A, config);
    const kB = computeKPI(B, config);
    return { a: kA, b: kB };
  }

  global.AvitoAnalytics = {
    DEFAULT_CONFIG,
    computeKPI,
    summarizeGroups,
    timeseries,
    funnel,
    heatmap,
    rankAds,
    recommend,
    linearForecast,
    applyFilters,
    comparePeriods,
    sumRows,
    money,
  };
})(window);
