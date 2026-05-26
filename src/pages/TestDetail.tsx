import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useData } from '@/store/data';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { BarsChart } from '@/components/charts/Charts';
import {
  compareVariants,
  variantConversion,
  variantCpa,
  variantCtr,
  variantRoi,
} from '@/utils/statistics';
import { formatMoney, formatNumber, formatPercent } from '@/utils/format';

export function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const test = useData((s) => s.tests.find((t) => t.id === id));
  const updateTestStatus = useData((s) => s.updateTestStatus);
  const project = useData((s) =>
    test ? s.projects.find((p) => p.id === test.projectId) : undefined
  );

  if (!test) {
    return (
      <div>
        <Link to="/app/tests" className="inline-flex items-center gap-1 text-sm text-soft hover:text-strong mb-4">
          <ArrowLeft className="h-4 w-4" /> Назад к тестам
        </Link>
        <EmptyState title="Тест не найден" />
      </div>
    );
  }

  const cmp = compareVariants(test.variants[0], test.variants[1]);
  const [a, b] = test.variants;

  const chartData = [
    {
      metric: 'CTR',
      'Вариант A': variantCtr(a),
      'Вариант B': variantCtr(b),
    },
    {
      metric: 'Конверсия',
      'Вариант A': variantConversion(a),
      'Вариант B': variantConversion(b),
    },
    {
      metric: 'ROI',
      'Вариант A': variantRoi(a),
      'Вариант B': variantRoi(b),
    },
  ];

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-soft hover:text-strong mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge>{project?.name ?? '—'}</Badge>
            <Badge tone="brand">{test.type}</Badge>
            <Badge
              tone={test.status === 'running' ? 'success' : test.status === 'finished' ? 'brand' : 'neutral'}
              dot
            >
              {test.status === 'running' ? 'идёт' : test.status === 'finished' ? 'завершён' : 'черновик'}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-strong">{test.name}</h1>
          <p className="text-sm text-soft mt-1">{test.goal}</p>
        </div>
        <div className="flex gap-2">
          {test.status === 'running' && (
            <Button onClick={() => updateTestStatus(test.id, 'finished')} variant="secondary">
              Завершить
            </Button>
          )}
          {test.status === 'draft' && (
            <Button onClick={() => updateTestStatus(test.id, 'running')}>Запустить</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryStat label="Достоверность" value={formatPercent(cmp.confidence * 100, 1)} hint="Уровень уверенности в победителе" />
        <SummaryStat
          label="Прирост CTR"
          value={
            cmp.ctr.uplift >= 0
              ? `+${formatPercent(cmp.ctr.uplift * 100, 1)}`
              : formatPercent(cmp.ctr.uplift * 100, 1)
          }
          hint="Вариант B vs A"
        />
        <SummaryStat
          label="Стат. значимость"
          value={cmp.ctr.significant ? 'Да' : 'Недостаточно данных'}
          hint="При уровне 95%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {test.variants.map((v) => {
          const isWinner = cmp.bestVariant === v.label && test.status !== 'draft';
          const ctr = variantCtr(v);
          return (
            <Card
              key={v.id}
              className={isWinner ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : ''}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-semibold ${
                      isWinner
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-brand-500/15 text-brand-300'
                    }`}
                  >
                    {v.label}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-strong">Вариант {v.label}</div>
                    <div className="text-xs text-soft">Контрольный/тестовый</div>
                  </div>
                </div>
                {isWinner && (
                  <Badge tone="success" dot>
                    <Trophy className="h-3 w-3" /> победитель
                  </Badge>
                )}
              </div>
              <div className="surface p-3 mb-4">
                <div className="text-xs text-soft mb-1">Значение варианта</div>
                <div className="text-sm text-strong">{v.value}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Mini label="Показы" value={formatNumber(v.views)} />
                <Mini label="Клики" value={formatNumber(v.clicks)} />
                <Mini label="Контакты" value={formatNumber(v.contacts)} />
                <Mini label="Конверсии" value={formatNumber(v.conversions)} />
                <Mini label="CTR" value={formatPercent(ctr, 2)} />
                <Mini label="Конверсия" value={formatPercent(variantConversion(v), 1)} />
                <Mini label="CPA" value={formatMoney(variantCpa(v))} />
                <Mini label="ROI" value={formatPercent(variantRoi(v), 1)} />
              </div>
              <div className="text-xs text-soft mb-1.5">CTR на максимуме</div>
              <Progress value={ctr} max={Math.max(8, ctr * 1.5)} tone={isWinner ? 'success' : 'brand'} />
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <CardHeader title="Сравнение метрик" description="CTR, конверсия и ROI по вариантам" />
        <BarsChart
          data={chartData}
          xKey="metric"
          series={[
            { key: 'Вариант A', name: 'Вариант A', color: '#5b88ff' },
            { key: 'Вариант B', name: 'Вариант B', color: '#84cc16' },
          ]}
          formatY={(v) => `${v.toFixed(1)}%`}
          height={280}
        />
      </Card>

      <Card>
        <CardHeader title="Решение по тесту" />
        {cmp.bestVariant ? (
          <div className="space-y-3">
            <div className="surface p-4">
              <div className="text-sm font-semibold text-strong">
                Победитель: вариант {cmp.bestVariant}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-soft">
                {cmp.ctr.winner && (
                  <li>• CTR {cmp.ctr.winner === 'B' ? 'выше' : 'ниже'} на {formatPercent(Math.abs(cmp.ctr.uplift) * 100, 1)}</li>
                )}
                {cmp.conversion.winner && (
                  <li>• Конверсия {cmp.conversion.winner === 'B' ? 'выше' : 'ниже'} на {formatPercent(Math.abs(cmp.conversion.uplift) * 100, 1)}</li>
                )}
                {cmp.cpa.winner && (
                  <li>• Стоимость заявки {cmp.cpa.winner === 'A' ? 'ниже у A' : 'ниже у B'} на {formatPercent(cmp.cpa.improvement * 100, 1)}</li>
                )}
                <li>• Уровень уверенности: {formatPercent(cmp.confidence * 100, 1)}</li>
              </ul>
            </div>
            {!cmp.ctr.significant && (
              <div className="surface p-4 border-amber-500/30 bg-amber-500/[0.04]">
                <div className="text-sm font-medium text-amber-300">Недостаточно данных</div>
                <div className="text-xs text-soft mt-1">
                  Для надёжного результата нужно минимум 100 показов на каждый вариант и
                  уровень достоверности ≥ 95%.
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="Победитель не определён" description="Дождитесь поступления данных" />
        )}
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="text-xs text-soft uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold text-strong mt-1.5 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-soft mt-1">{hint}</div>}
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-2.5">
      <div className="text-[10px] text-soft uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-strong mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
