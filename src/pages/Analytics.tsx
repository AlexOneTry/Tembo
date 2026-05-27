import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { applyFilters, useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AreaTrendChart, BarsChart, LineTrendChart } from '@/components/charts/Charts';
import { dailySeries, summarize } from '@/services/metrics';
import { formatCompact, formatMoney, formatNumber, formatPercent, formatShortDate } from '@/utils/format';
import { exportXlsx } from '@/services/excel';
import { useToast } from '@/components/ui/Toast';

export function Analytics() {
  const stats = useData((s) => s.stats);
  const filters = useData((s) => s.filters);
  const filtered = useMemo(() => applyFilters(stats, filters), [stats, filters]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const trend = useMemo(
    () => dailySeries(filtered).map((p) => ({ ...p, label: formatShortDate(p.date) })),
    [filtered]
  );
  const toast = useToast();

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { views: number; contacts: number; cost: number }>();
    for (const r of filtered) {
      const v = map.get(r.category) ?? { views: 0, contacts: 0, cost: 0 };
      v.views += r.views;
      v.contacts += r.contacts;
      v.cost += r.cost;
      map.set(r.category, v);
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({
        category,
        views: v.views,
        contacts: v.contacts,
        cost: v.cost,
        ctr: v.views > 0 ? (v.contacts / v.views) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views);
  }, [filtered]);

  function onExport() {
    exportXlsx(
      filtered.map((r) => ({
        Дата: r.date.slice(0, 10),
        Заголовок: r.title,
        Категория: r.category,
        Город: r.city ?? '',
        Цена: r.price,
        Показы: r.views,
        Контакты: r.contacts,
        Избранное: r.favorites,
        Затраты: r.cost,
      })),
      'avitoboost-analytics.xlsx'
    );
    toast.success('Экспортировано в Excel');
  }

  const metrics: { label: string; value: string; hint?: string }[] = [
    { label: 'CTR', value: formatPercent(summary.ctr, 2) },
    { label: 'CPC', value: formatMoney(summary.cpc), hint: 'Цена клика' },
    { label: 'CPA', value: formatMoney(summary.cpa), hint: 'Цена конверсии' },
    { label: 'CPL', value: formatMoney(summary.cpl), hint: 'Цена контакта' },
    { label: 'ROI', value: formatPercent(summary.roi, 1) },
    { label: 'ROMI', value: formatPercent(summary.romi, 0) },
    { label: 'Conv. Rate', value: formatPercent(summary.conversion, 1) },
    { label: 'RPV', value: formatMoney(summary.revenuePerView), hint: 'Доход на показ' },
    { label: 'RPC', value: formatMoney(summary.revenuePerContact), hint: 'Доход на контакт' },
  ];

  return (
    <div>
      <PageHeader
        title="Аналитика"
        description="Все ключевые метрики: CTR, CPC, CPA, CPL, ROI, ROMI, Conversion Rate, RPV и RPC"
        actions={
          <Button leftIcon={<Download className="h-4 w-4" />} variant="secondary" onClick={onExport}>
            Экспорт XLSX
          </Button>
        }
      />

      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="glass-card p-4">
            <div className="text-xs text-soft uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-semibold text-strong mt-1 tabular-nums">{m.value}</div>
            {m.hint && <div className="text-[10px] text-soft mt-1">{m.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="Просмотры и контакты" description="Динамика по дням" />
          <AreaTrendChart
            data={trend}
            xKey="label"
            series={[
              { key: 'views', name: 'Просмотры', color: '#5b88ff' },
              { key: 'contacts', name: 'Контакты', color: '#84cc16' },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Конверсия и CTR" description="Качество трафика" />
          <LineTrendChart
            data={trend}
            xKey="label"
            series={[
              { key: 'ctr', name: 'CTR, %', color: '#a3e635' },
              { key: 'conversion', name: 'Конверсия, %', color: '#5b88ff' },
            ]}
            formatY={(v) => `${v.toFixed(1)}%`}
          />
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Разбивка по категориям" description="Какие категории дают больше показов и контактов" />
        <BarsChart
          data={categoryBreakdown.map((c) => ({
            name: c.category,
            Показы: c.views,
            Контакты: c.contacts,
          }))}
          series={[
            { key: 'Показы', name: 'Показы', color: '#5b88ff' },
            { key: 'Контакты', name: 'Контакты', color: '#84cc16' },
          ]}
          formatY={(v) => formatCompact(v)}
          height={320}
        />
      </Card>

      <Card>
        <CardHeader title="Сводная таблица" description="Все категории" />
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-soft tracking-wider">
                <th className="font-medium py-2 px-2">Категория</th>
                <th className="font-medium py-2 px-2 text-right">Показы</th>
                <th className="font-medium py-2 px-2 text-right">Контакты</th>
                <th className="font-medium py-2 px-2 text-right">CTR</th>
                <th className="font-medium py-2 px-2 text-right">Расход</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map((c) => (
                <tr key={c.category} className="border-t divider">
                  <td className="py-2.5 px-2 text-strong font-medium">{c.category}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{formatNumber(c.views)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{formatNumber(c.contacts)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{formatPercent(c.ctr, 1)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{formatMoney(c.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
