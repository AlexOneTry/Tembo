/* ===== excel.js — Excel/CSV parsing and column auto-detection ===== */

const Excel = (() => {

  // Synonyms for column auto-detection. Keys are canonical field names.
  // Values: arrays of substring matchers (case-insensitive, RU + EN).
  const FIELD_SYNONYMS = {
    date:        ['дата', 'день', 'date', 'period', 'период'],
    title:       ['объявлен', 'название', 'заголовок', 'item', 'title', 'наименование', 'товар'],
    category:    ['категори', 'category', 'раздел'],
    region:      ['регион', 'город', 'локац', 'region', 'city', 'location'],
    adType:      ['тип', 'разм', 'формат', 'услуг', 'type'],
    impressions: ['показ', 'impress', 'imp.', 'показы'],
    views:       ['просмотр', 'view', 'visit'],
    contacts:    ['контакт', 'contact'],
    messages:    ['сообщен', 'message', 'chat', 'чат'],
    calls:       ['звон', 'call', 'phone'],
    favorites:   ['избран', 'favor', 'wish'],
    spend:       ['расход', 'затрат', 'бюджет', 'spend', 'cost', 'cpc-расх'],
    revenue:     ['доход', 'выручк', 'revenue', 'продаж сумм', 'sales amount', 'оборот'],
    sales:       ['продаж', 'sales', 'заказ', 'order', 'сделк'],
    leads:       ['лид', 'заявк', 'lead'],
    ctr:         ['ctr', 'кликабельн'],
    cpc:         ['cpc', 'цена клик'],
    cpm:         ['cpm', 'цена 1000'],
    profit:      ['прибыль', 'profit']
  };

  // Detect mapping: column header -> canonical field
  function detectMapping(headers, override = {}) {
    const mapping = {};
    const used = new Set();
    // First, honor manual overrides
    for (const [field, headerName] of Object.entries(override || {})) {
      if (!headerName) continue;
      const h = headers.find(x => x.toString().toLowerCase().trim() === headerName.toString().toLowerCase().trim());
      if (h) { mapping[field] = h; used.add(h); }
    }
    // Then auto-detect remaining
    for (const [field, syns] of Object.entries(FIELD_SYNONYMS)) {
      if (mapping[field]) continue;
      for (const h of headers) {
        if (used.has(h)) continue;
        const hl = String(h).toLowerCase().trim();
        if (syns.some(s => hl.includes(s))) {
          mapping[field] = h;
          used.add(h);
          break;
        }
      }
    }
    return mapping;
  }

  function parseNumber(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim();
    // Remove RU thousand separators (spaces, NBSPs) and currency
    s = s.replace(/\s| /g, '').replace(/[₽$€£]/g, '').replace(/%/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function parseDate(val) {
    if (val == null || val === '') return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
      // Excel serial date
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(epoch.getTime() + val * 86400000);
    }
    const s = String(val).trim();
    // Try DD.MM.YYYY or DD/MM/YYYY
    let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (m) {
      let y = parseInt(m[3], 10); if (y < 100) y += 2000;
      const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      if (!Number.isNaN(d.getTime())) return d;
    }
    // Try YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      if (!Number.isNaN(d.getTime())) return d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Read file (File or Blob) -> { fileName, sheets, headers, rows, mapping }
  async function readFile(file, manualMapping = {}) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    // Pick the largest sheet
    let bestSheet = null, bestRows = -1;
    for (const name of wb.SheetNames) {
      const sh = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json(sh, { defval: '', raw: true });
      if (json.length > bestRows) { bestRows = json.length; bestSheet = { name, json }; }
    }
    if (!bestSheet || !bestSheet.json.length) {
      throw new Error('Excel-файл пустой или не содержит данных');
    }
    const json = bestSheet.json;
    const headers = Object.keys(json[0]);
    const mapping = detectMapping(headers, manualMapping);

    // Normalize rows: produce a canonical row object plus keep original
    const normalized = json.map((raw, idx) => {
      const get = (field) => mapping[field] ? raw[mapping[field]] : undefined;
      const dateVal = get('date');
      const date = parseDate(dateVal);
      const impressions = parseNumber(get('impressions'));
      const views       = parseNumber(get('views'));
      const contacts    = parseNumber(get('contacts'));
      const messages    = parseNumber(get('messages'));
      const calls       = parseNumber(get('calls'));
      const favorites   = parseNumber(get('favorites'));
      const spend       = parseNumber(get('spend'));
      const revenue     = parseNumber(get('revenue'));
      const sales       = parseNumber(get('sales'));
      const leads       = parseNumber(get('leads'));
      const profit      = mapping.profit ? parseNumber(get('profit')) : (revenue - spend);
      const totalContacts = contacts || (messages + calls);
      return {
        _idx: idx,
        _raw: raw,
        date,
        dateKey: date ? formatDateKey(date) : '',
        title: get('title') ? String(get('title')) : `Объявление #${idx + 1}`,
        category: get('category') ? String(get('category')) : 'Без категории',
        region: get('region') ? String(get('region')) : 'Не указан',
        adType: get('adType') ? String(get('adType')) : 'Стандарт',
        impressions, views,
        contacts: totalContacts,
        messages, calls, favorites,
        spend, revenue, sales, leads,
        profit
      };
    });

    return {
      fileName: file.name,
      sheetName: bestSheet.name,
      ts: Date.now(),
      headers,
      mapping,
      rows: normalized
    };
  }

  function formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return {
    FIELD_SYNONYMS,
    detectMapping,
    parseNumber,
    parseDate,
    readFile,
    formatDateKey
  };
})();
