import type { AvitoStatRow, MetricSummary, Ad } from '@/types';

export function summarize(rows: AvitoStatRow[], avgOrderValue = 2800): MetricSummary {
  const views = rows.reduce((s, r) => s + r.views, 0);
  const contacts = rows.reduce((s, r) => s + r.contacts, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const clicks = Math.round(contacts / 0.6);
  const conversions = Math.round(contacts * 0.32);
  const revenue = conversions * avgOrderValue;

  return {
    views,
    clicks,
    ctr: views > 0 ? (clicks / views) * 100 : 0,
    contacts,
    conversion: clicks > 0 ? (conversions / clicks) * 100 : 0,
    cpa: conversions > 0 ? cost / conversions : 0,
    cpc: clicks > 0 ? cost / clicks : 0,
    cpl: contacts > 0 ? cost / contacts : 0,
    roi: cost > 0 ? ((revenue - cost) / cost) * 100 : 0,
    romi: cost > 0 ? (revenue / cost) * 100 : 0,
    revenuePerView: views > 0 ? revenue / views : 0,
    revenuePerContact: contacts > 0 ? revenue / contacts : 0,
    totalCost: cost,
    totalRevenue: revenue,
  };
}

export interface DailyPoint {
  date: string;
  views: number;
  contacts: number;
  ctr: number;
  conversion: number;
  cost: number;
}

export function dailySeries(rows: AvitoStatRow[]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const row of rows) {
    const key = row.date.slice(0, 10);
    const existing = map.get(key) ?? {
      date: key,
      views: 0,
      contacts: 0,
      ctr: 0,
      conversion: 0,
      cost: 0,
    };
    existing.views += row.views;
    existing.contacts += row.contacts;
    existing.cost += row.cost;
    map.set(key, existing);
  }
  return Array.from(map.values())
    .map((p) => ({
      ...p,
      ctr: p.views > 0 ? (p.contacts / p.views) * 100 : 0,
      conversion: p.contacts > 0 ? (Math.round(p.contacts * 0.32) / p.contacts) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface AdEfficiency {
  id: string;
  title: string;
  views: number;
  contacts: number;
  ctr: number;
  cpa: number;
}

export function adEfficiency(ads: Ad[]): AdEfficiency[] {
  return ads
    .map((a) => ({
      id: a.id,
      title: a.title,
      views: a.views,
      contacts: a.contacts,
      ctr: a.views > 0 ? (a.contacts / a.views) * 100 : 0,
      cpa: a.contacts > 0 ? a.cost / a.contacts : 0,
    }))
    .sort((a, b) => b.ctr - a.ctr);
}
