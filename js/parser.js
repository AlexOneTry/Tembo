/* ============================================================
   parser.js — чтение Excel-файлов Авито и нормализация данных
   ============================================================
   - Использует SheetJS (xlsx) для парсинга .xlsx / .xls
   - Автоматически определяет нужные колонки по словарю синонимов
   - Возвращает нормализованный объект { rows, sheets, headers, mapping }
*/

(function (global) {
  'use strict';

  // ------------------------------------------------------------
  // Словарь распознавания колонок Авито.
  // Ключ — внутреннее поле, значение — массив возможных названий
  // колонок (нижний регистр, без лишних пробелов).
  // ------------------------------------------------------------
  const COLUMN_DICTIONARY = {
    date:        ['дата', 'date', 'день', 'дата публикации', 'дата отчета', 'дата отчёта', 'period', 'период', 'datetime'],
    id:          ['id', 'ид', 'id объявления', 'идентификатор', 'avito_id', 'item_id', 'номер'],
    title:       ['название', 'заголовок', 'объявление', 'title', 'name', 'товар', 'услуга', 'описание объявления'],
    category:    ['категория', 'category', 'раздел', 'тип', 'тематика'],
    subcategory: ['подкатегория', 'subcategory'],
    region:      ['регион', 'город', 'локация', 'region', 'city', 'location', 'область'],
    adType:      ['тип рекламы', 'тип объявления', 'формат', 'ad_type', 'тариф', 'способ продвижения', 'услуга продвижения', 'продвижение'],
    price:       ['цена', 'price', 'стоимость товара', 'стоимость услуги', 'средний чек'],
    impressions: ['показы', 'impressions', 'показов', 'показано', 'imp', 'shows'],
    views:       ['просмотры', 'views', 'просмотров', 'просмотрено', 'visits'],
    contacts:    ['контакты', 'контактов', 'contacts', 'обращения', 'лиды', 'leads'],
    messages:    ['сообщения', 'сообщений', 'messages', 'чаты'],
    calls:       ['звонки', 'звонков', 'calls', 'телефонные звонки'],
    favorites:   ['избранное', 'добавления в избранное', 'favorites', 'fav'],
    spend:       ['расход', 'расходы', 'затраты', 'spend', 'cost', 'бюджет', 'потрачено', 'списано'],
    revenue:     ['доход', 'выручка', 'revenue', 'продажи', 'sales', 'доходы'],
    sales:       ['продаж', 'кол-во продаж', 'sold', 'количество продаж', 'sales_count'],
    profit:      ['прибыль', 'profit', 'чистая прибыль'],
    cpc:         ['cpc', 'стоимость клика'],
    cpm:         ['cpm', 'стоимость 1000 показов'],
    ctr:         ['ctr', 'кликабельность'],
  };

  // Базовые поля, которые мы хотим извлечь, и их синонимы
  const PARSE_FIELDS = Object.keys(COLUMN_DICTIONARY);

  // Нормализация строки заголовка для матчинга
  function norm(str) {
    return (str ?? '').toString().toLowerCase().replace(/\s+/g, ' ').replace(/[ё]/g, 'е').trim();
  }

  // Попытка распознать тип значения как число с поддержкой "1 234,56", "12%", "1 500 ₽"
  function parseNumber(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    let s = val.toString().trim();
    if (!s) return 0;
    // убираем валюту / проценты / разделители
    s = s.replace(/[₽$€₸р\s ]/gi, '').replace(/руб\.?/gi, '').replace(/,/g, '.').replace(/[^\d.\-]/g, '');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  // Преобразование Excel-даты в JS Date (универсально)
  function parseDate(val) {
    if (val == null || val === '') return null;
    if (val instanceof Date) return isNaN(val) ? null : val;
    if (typeof val === 'number') {
      // SheetJS обычно сам конвертит, но поддержим серийный номер
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + val * 86400000);
      return isNaN(d) ? null : d;
    }
    const s = val.toString().trim();
    if (!s) return null;
    // dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) {
      const [, d, mo, y, hh, mm] = m;
      const year = +y < 100 ? 2000 + +y : +y;
      const dt = new Date(year, +mo - 1, +d, +(hh || 0), +(mm || 0));
      return isNaN(dt) ? null : dt;
    }
    // ISO
    const iso = new Date(s);
    return isNaN(iso) ? null : iso;
  }

  // Определение mapping заголовок→поле
  function buildMapping(headers) {
    const mapping = {};
    const normalized = headers.map((h) => norm(h));
    for (const field of PARSE_FIELDS) {
      const synonyms = COLUMN_DICTIONARY[field];
      let idx = -1;
      // точные совпадения важнее частичных
      for (let i = 0; i < normalized.length; i++) {
        if (synonyms.includes(normalized[i])) { idx = i; break; }
      }
      if (idx === -1) {
        for (let i = 0; i < normalized.length; i++) {
          if (synonyms.some((syn) => normalized[i].includes(syn))) { idx = i; break; }
        }
      }
      if (idx !== -1) mapping[field] = headers[idx];
    }
    return mapping;
  }

  // Превращает массив объектов листа в нормализованные строки
  function normalizeRows(rawRows, mapping) {
    const get = (row, field) => {
      const col = mapping[field];
      return col != null ? row[col] : undefined;
    };

    return rawRows.map((row, i) => {
      const date = parseDate(get(row, 'date'));
      const impressions = parseNumber(get(row, 'impressions'));
      const views       = parseNumber(get(row, 'views'));
      const messages    = parseNumber(get(row, 'messages'));
      const calls       = parseNumber(get(row, 'calls'));
      let   contacts    = parseNumber(get(row, 'contacts'));
      if (!contacts) contacts = messages + calls; // если контактов нет — собираем сами

      const favorites   = parseNumber(get(row, 'favorites'));
      const spend       = parseNumber(get(row, 'spend'));
      const revenue     = parseNumber(get(row, 'revenue'));
      const sales       = parseNumber(get(row, 'sales'));
      const profit      = parseNumber(get(row, 'profit'));
      const price       = parseNumber(get(row, 'price'));

      return {
        __i: i,
        date,
        id:          (get(row, 'id') ?? '').toString().trim(),
        title:       (get(row, 'title') ?? `Объявление ${i + 1}`).toString().trim() || `Объявление ${i + 1}`,
        category:    (get(row, 'category') ?? 'Без категории').toString().trim() || 'Без категории',
        subcategory: (get(row, 'subcategory') ?? '').toString().trim(),
        region:      (get(row, 'region') ?? 'Не указан').toString().trim() || 'Не указан',
        adType:      (get(row, 'adType') ?? 'Стандарт').toString().trim() || 'Стандарт',
        price,
        impressions,
        views,
        contacts,
        messages,
        calls,
        favorites,
        spend,
        revenue,
        sales,
        profit,
        raw: row,
      };
    }).filter((r) => {
      // оставляем строки, у которых есть хоть какие-то значимые показатели
      return r.impressions || r.views || r.contacts || r.spend || r.revenue || r.title;
    });
  }

  /**
   * Парсит ArrayBuffer Excel-файла.
   * Возвращает: { sheets:[{name, headers, rows, mapping, normalized}], activeSheet }
   */
  function parseWorkbook(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    const sheets = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      const headers = json.length > 0 ? Object.keys(json[0]) : [];
      const mapping = buildMapping(headers);
      const normalized = normalizeRows(json, mapping);
      return { name, headers, rows: json, mapping, normalized };
    }).filter((s) => s.rows.length > 0);

    // Выбираем лист с наибольшим количеством распознанных полей
    let best = 0;
    for (let i = 1; i < sheets.length; i++) {
      const a = Object.keys(sheets[i].mapping).length;
      const b = Object.keys(sheets[best].mapping).length;
      if (a > b) best = i;
    }

    return { sheets, activeSheet: best };
  }

  // Чтение File-объекта → Promise<ArrayBuffer>
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(file);
    });
  }

  global.AvitoParser = {
    parseWorkbook,
    readFile,
    buildMapping,
    normalizeRows,
    parseNumber,
    parseDate,
    COLUMN_DICTIONARY,
    PARSE_FIELDS,
  };

})(window);
