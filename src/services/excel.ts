import * as XLSX from 'xlsx';
import type { AvitoStatRow } from '@/types';
import { uid } from '@/utils/mock';

export interface ImportedRow {
  raw: Record<string, unknown>;
  parsed: AvitoStatRow | null;
  error?: string;
}

export interface ImportPreview {
  headers: string[];
  rows: ImportedRow[];
  totalRows: number;
  mapping: Record<string, string>;
}

const FIELD_PATTERNS: Record<keyof AvitoStatRow, RegExp[]> = {
  id: [/^id$/i],
  projectId: [/project/i],
  adId: [/^id\s*объявл/i, /ad[_\s]?id/i, /№/, /объявл.*id/i],
  title: [/заголов/i, /назван/i, /title/i, /name/i],
  category: [/категори/i, /category/i],
  price: [/цена/i, /price/i, /стоим/i],
  date: [/дата/i, /date/i, /период/i],
  views: [/просмотр/i, /views/i, /показ/i],
  contacts: [/контакт/i, /contacts?/i, /обращ/i, /звонк/i],
  favorites: [/избран/i, /favor/i, /сохран/i],
  cost: [/расход/i, /затрат/i, /cost/i, /бюджет/i, /spend/i],
  city: [/город/i, /city/i],
  photo: [/фото/i, /photo/i, /image/i],
};

export function autoMapHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const header of headers) {
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (patterns.some((p) => p.test(header))) {
        if (!Object.values(map).includes(field)) {
          map[header] = field;
          break;
        }
      }
    }
  }
  return map;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const s = value.replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toDateISO(value: unknown): string {
  if (typeof value === 'number') {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 86_400_000;
    return new Date(epoch.getTime() + ms).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const tryDate = new Date(value);
    if (!Number.isNaN(tryDate.getTime())) return tryDate.toISOString();
  }
  return new Date().toISOString();
}

function buildRow(
  raw: Record<string, unknown>,
  mapping: Record<string, string>,
  projectId: string
): AvitoStatRow {
  const out: AvitoStatRow = {
    id: uid('row'),
    projectId,
    adId: '',
    title: '',
    category: '',
    price: 0,
    date: new Date().toISOString(),
    views: 0,
    contacts: 0,
    favorites: 0,
    cost: 0,
  };
  for (const [header, field] of Object.entries(mapping)) {
    const value = raw[header];
    switch (field as keyof AvitoStatRow) {
      case 'adId':
        out.adId = String(value ?? '');
        break;
      case 'title':
        out.title = String(value ?? '');
        break;
      case 'category':
        out.category = String(value ?? '');
        break;
      case 'city':
        out.city = String(value ?? '');
        break;
      case 'photo':
        out.photo = String(value ?? '');
        break;
      case 'date':
        out.date = toDateISO(value);
        break;
      case 'price':
        out.price = toNumber(value);
        break;
      case 'views':
        out.views = toNumber(value);
        break;
      case 'contacts':
        out.contacts = toNumber(value);
        break;
      case 'favorites':
        out.favorites = toNumber(value);
        break;
      case 'cost':
        out.cost = toNumber(value);
        break;
      default:
        break;
    }
  }
  if (!out.title) out.title = `Объявление ${out.adId || ''}`.trim();
  if (!out.category) out.category = '—';
  return out;
}

export async function parseExcelFile(
  file: File,
  projectId: string,
  customMapping?: Record<string, string>
): Promise<ImportPreview> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], totalRows: 0, mapping: {} };
  }
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  const mapping = customMapping ?? autoMapHeaders(headers);

  const rows: ImportedRow[] = json.map((raw) => {
    try {
      const parsed = buildRow(raw, mapping, projectId);
      return { raw, parsed };
    } catch (err) {
      return { raw, parsed: null, error: (err as Error).message };
    }
  });

  return { headers, rows, totalRows: json.length, mapping };
}

export function exportXlsx(rows: Record<string, unknown>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}
