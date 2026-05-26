import { useMemo } from 'react';
import {
  DollarSign,
  Eye,
  ImageIcon,
  MousePointerClick,
  Phone,
  Tag,
  Target,
  TrendingUp,
  Type,
} from 'lucide-react';
import { applyFilters, useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { adEfficiency, dailySeries, summarize } from '@/services/metrics';
import { compareVariants, variantCtr } from '@/utils/statistics';
import { AreaTrendChart, BarsChart, DonutChart, LineTrendChart } from '@/components/charts/Charts';
import {
  formatCompact,
  formatMoney,
  formatNumber,
  formatPercent,
  formatShortDate,
} from '@/utils/format';

export function Dashboard() {
  const stats = useData((s) => s.stats);
  const ads = useData((s) => s.ads);
  const tests = useData((s) => s.tests);
  const filters = useData((s) => s.filters);
  const projects = useData((s) => s.projects);

  const filteredStats = useMemo(() => applyFilters(stats, filters), [stats, filters]);
  const filteredAds = useMemo(() => applyFilters(ads, filters), [ads, filters]);

  const summary = useMemo(() => summarize(filteredStats), [filteredStats]);
  const trend = useMemo(
    () =>
      dailySeries(filteredStats).map((p) => ({
        ...p,
        label: formatShortDate(p.date),
      })),
    [filteredStats]
  );

  const bestAd = useMemo(() => {
    const list = adEfficiency(filteredAds);
    return list[0];
  }, [filteredAds]);

  const bestPriceAd = useMemo(
    () => [...filteredAds].sort((a, b) => b.contacts / (a.price || 1) - a.contacts / (b.price || 1))[0],
    [filteredAds]
  );

  const topAds = useMemo(() => adEfficiency(filteredAds).slice(0, 6), [filteredAds]);

  const testComparison = useMemo(
    () =>
      tests
        .filter((t) => t.status !== 'draft')
        .map((t) => {
          const cmp = compareVariants(t.variants[0], t.variants[1]);
          return {
            name: t.name.slice(0, 22),
            'Вариант A': variantCtr(t.variants[0]),
            'Вариант B': variantCtr(t.variants[1]),
            winner: cmp.bestVariant,
          };
        })
        .slice(0, 6),
    [tests]
  );

  const projectShare = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredStats) {
      map.set(r.projectId, (map.get(r.projectId) ?? 0) + r.views);
    }
    return projects
      .filter((p) => map.has(p.id))
      .map((p) => ({
        name: p.name,
        value: map.get(p.id) ?? 0,
        color: p.color,
      }));
  }, [filteredStats, projects]);

  if (stats.length === 0) {
    return (
      <div>
        <PageHeader title="Дашборд" description="Здесь вы увидите ключевые метрики и графики" />
        <EmptyState
          title="Пока нет данных"
          description="Загрузите Excel-файл выгрузки Авито или создайте первый A/B тест."
          action={
            <Link to="/app/import" className="btn-primary">
              Импортировать Excel
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Сводка по объявлениям, тестам и метрикам за выбранный период"
        actions={
          <>
            <Link to="/app/import" className="btn-secondary">
              Импорт Excel
            </Link>
            <Link to="/app/tests" className="btn-primary">
              Новый A/B тест
            </Link>
          </>
        }
      />

      <FilterBar />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Просмотры" value={formatCompact(summary.views)} icon={Eye} accent="brand" index={0} delta={6.4} />
        <MetricCard label="CTR" value={formatPercent(summary.ctr, 2)} icon={MousePointerClick} accent="accent" index={1} delta={3.1} />
        <MetricCard label="Контакты" value={formatNumber(summary.contacts)} icon={Phone} accent="cyan" index={2} delta={9.2} />
        <MetricCard label="Конверсия" value={formatPercent(summary.conversion, 1)} icon={Target} accent="violet" index={3} delta={1.4} />
        <MetricCard
          label="Стоимость заявки"
          value={formatMoney(summary.cpl)}
          icon={DollarSign}
          accent="amber"
          index={4}
          delta={-7.8}
          hint="CPL"
        />
        <MetricCard
          label="ROI"
          value={formatPercent(summary.roi, 1)}
          icon={TrendingUp}
          accent="brand"
          index={5}
          delta={12.7}
        />
        <MetricCard
          label="Лучший заголовок"
          value={bestAd?.title?.slice(0, 18) ?? '—'}
          icon={Type}
          accent="accent"
          index={6}
          hint={bestAd ? `CTR ${formatPercent(bestAd.ctr, 1)}` : undefined}
        />
        <MetricCard
          label="Лучшая цена"
          value={bestPriceAd ? formatMoney(bestPriceAd.price) : '—'}
          icon={Tag}
          accent="rose"
          index={7}
          hint={bestPriceAd ? `${bestPriceAd.contacts} контактов` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Динамика просмотров и контактов"
            description="Сравнение основных метрик по дням"
            action={<Badge tone="brand" dot>живые данные</Badge>}
          />
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
          <CardHeader title="Доля просмотров по проектам" description="Где аудитория больше всего" />
          {projectShare.length > 0 ? (
            <DonutChart data={projectShare} />
          ) : (
            <EmptyState title="Нет данных" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="CTR по дням" description="Качество объявлений в динамике" />
          <LineTrendChart
            data={trend}
            xKey="label"
            series={[{ key: 'ctr', name: 'CTR, %', color: '#a3e635' }]}
            formatY={(v) => `${v.toFixed(1)}%`}
          />
        </Card>
        <Card>
          <CardHeader title="Стоимость по дням" description="Сколько тратите на трафик" />
          <BarsChart
            data={trend}
            xKey="label"
            series={[{ key: 'cost', name: 'Расход, ₽', color: '#f59e0b' }]}
            formatY={(v) => formatCompact(v)}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Сравнение A/B тестов"
            description="CTR по вариантам активных и завершённых тестов"
            action={
              <Link to="/app/tests" className="text-xs text-brand-300 hover:underline">
                Все тесты →
              </Link>
            }
          />
          {testComparison.length > 0 ? (
            <BarsChart
              data={testComparison}
              xKey="name"
              series={[
                { key: 'Вариант A', name: 'Вариант A', color: '#5b88ff' },
                { key: 'Вариант B', name: 'Вариант B', color: '#84cc16' },
              ]}
              formatY={(v) => `${v.toFixed(1)}%`}
              height={260}
            />
          ) : (
            <EmptyState title="Нет активных тестов" />
          )}
        </Card>
        <Card>
          <CardHeader title="Лучшие объявления" description="По CTR" />
          <div className="space-y-2.5">
            {topAds.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 surface p-2.5">
                <div className="h-8 w-8 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center text-xs font-semibold">
                  #{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-strong truncate">{a.title}</div>
                  <div className="text-xs text-soft mt-0.5">
                    {formatNumber(a.views)} показов · {formatNumber(a.contacts)} контактов
                  </div>
                </div>
                <div className="text-sm font-semibold text-strong tabular-nums">
                  {formatPercent(a.ctr, 1)}
                </div>
              </div>
            ))}
            {topAds.length === 0 && <EmptyState title="Нет объявлений" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Лучшее фото и обложки"
          description="Подсветка фото-объявлений с наибольшим CTR"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredAds.slice(0, 4).map((ad) => (
            <div key={ad.id} className="surface p-3 group">
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-brand-500/30 to-accent-500/20 flex items-center justify-center mb-3 overflow-hidden">
                <ImageIcon className="h-8 w-8 text-white/40" />
              </div>
              <div className="text-xs font-medium text-strong truncate">{ad.title}</div>
              <div className="text-[10px] text-soft mt-1">{formatMoney(ad.price)}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge tone="success" dot>
                  CTR {formatPercent((ad.contacts / Math.max(1, ad.views)) * 100, 1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Link to="/app/ads">
            <Button variant="secondary" size="sm">
              Все объявления
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
