import { useState } from 'react';
import { ArrowUpRight, ExternalLink, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { LineTrendChart } from '@/components/charts/Charts';
import { formatDate, formatMoney, formatShortDate } from '@/utils/format';

export function CompetitorsPage() {
  const competitors = useData((s) => s.competitors);
  const projects = useData((s) => s.projects);
  const addCompetitor = useData((s) => s.addCompetitor);
  const remove = useData((s) => s.removeCompetitor);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? '',
    url: '',
    name: '',
    category: 'Электроника',
    city: 'Москва',
    currentPrice: 0,
  });

  function submit() {
    if (!form.url.trim() || !form.name.trim()) {
      toast.error('Заполните название и ссылку');
      return;
    }
    addCompetitor(form);
    toast.success('Конкурент добавлен', 'Мы начали отслеживать активность');
    setOpen(false);
    setForm({ ...form, url: '', name: '', currentPrice: 0 });
  }

  return (
    <div>
      <PageHeader
        title="Конкуренты"
        description="Отслеживайте цены, поднятия и изменения заголовков у конкурентов"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Добавить конкурента
          </Button>
        }
      />

      {competitors.length === 0 ? (
        <EmptyState
          title="Конкурентов пока нет"
          description="Вставьте ссылку на объявление — мы будем отслеживать изменения каждый день."
          action={<Button onClick={() => setOpen(true)}>Добавить</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {competitors.map((c) => {
            const priceTrend = c.snapshots.map((s) => ({
              date: formatShortDate(s.date),
              price: s.price,
            }));
            const priceDelta = c.snapshots.length > 1
              ? ((c.snapshots.at(-1)!.price - c.snapshots[0].price) / c.snapshots[0].price) * 100
              : 0;
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-strong">{c.name}</h3>
                      <Badge>{c.category}</Badge>
                      <Badge tone={priceDelta >= 0 ? 'warning' : 'success'} dot>
                        Цена {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-soft mt-1">
                      {c.city ?? '—'} · поднятий за неделю: {c.raisesPerWeek}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost h-8 w-8 p-0"
                      aria-label="Открыть"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => remove(c.id)}
                      className="btn-ghost h-8 w-8 p-0 text-soft hover:text-rose-400"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Mini label="Текущая цена" value={formatMoney(c.currentPrice)} />
                  <Mini label="Снимков" value={String(c.snapshots.length)} />
                  <Mini label="Обновлено" value={formatDate(c.lastChange)} />
                </div>

                <LineTrendChart
                  data={priceTrend}
                  xKey="date"
                  series={[{ key: 'price', name: 'Цена, ₽', color: '#f59e0b' }]}
                  formatY={(v) => `${(v / 1000).toFixed(0)}k`}
                  height={160}
                />

                <div className="mt-3">
                  <div className="text-xs text-soft mb-1.5">Последние изменения</div>
                  <ul className="space-y-1">
                    {c.snapshots
                      .slice()
                      .reverse()
                      .slice(0, 4)
                      .map((s, i) => (
                        <li key={i} className="text-xs flex items-center gap-2">
                          <span className="text-soft">{formatShortDate(s.date)}</span>
                          <span className="truncate text-strong">{s.title}</span>
                          {s.raised && (
                            <Badge tone="info">
                              <RotateCcw className="h-3 w-3" /> поднято
                            </Badge>
                          )}
                          <span className="ml-auto tabular-nums">{formatMoney(s.price)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Добавить конкурента"
        description="Вставьте ссылку на объявление Авито"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} leftIcon={<ArrowUpRight className="h-4 w-4" />}>
              Начать отслеживать
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="Проект" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            label="Название (как у вас в CRM)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ТопПродавец"
          />
          <Input
            label="Ссылка на Авито"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://www.avito.ru/..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Категория"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input
              label="Стартовая цена, ₽"
              type="number"
              value={form.currentPrice || ''}
              onChange={(e) => setForm({ ...form, currentPrice: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      </Modal>
    </div>
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
