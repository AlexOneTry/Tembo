import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, Pause, Play, Plus, Trash2, Trophy } from 'lucide-react';
import { useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { Progress } from '@/components/ui/Progress';
import { compareVariants, variantCtr } from '@/utils/statistics';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import type { TestType } from '@/types';

const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: 'title', label: 'Заголовок' },
  { value: 'price', label: 'Цена' },
  { value: 'photo', label: 'Фото' },
  { value: 'text', label: 'Текст' },
  { value: 'category', label: 'Категория' },
  { value: 'time', label: 'Время публикации' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'running', label: 'Активные' },
  { value: 'finished', label: 'Завершённые' },
  { value: 'draft', label: 'Черновики' },
];

export function Tests() {
  const tests = useData((s) => s.tests);
  const projects = useData((s) => s.projects);
  const createTest = useData((s) => s.createTest);
  const updateTestStatus = useData((s) => s.updateTestStatus);
  const deleteTest = useData((s) => s.deleteTest);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [type, setType] = useState<TestType>('title');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('Увеличить CTR');
  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');

  const filtered = useMemo(
    () => (filter === 'all' ? tests : tests.filter((t) => t.status === filter)),
    [filter, tests]
  );

  function submit() {
    if (!projectId) {
      toast.error('Выберите проект');
      return;
    }
    if (!name.trim()) {
      toast.error('Укажите название теста');
      return;
    }
    if (!variantA.trim() || !variantB.trim()) {
      toast.error('Опишите оба варианта');
      return;
    }
    createTest({ projectId, type, name, goal, variantA, variantB });
    toast.success('A/B тест запущен');
    setName('');
    setVariantA('');
    setVariantB('');
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="A/B тесты"
        description="Тестируйте заголовки, цены, фото и тексты. Победитель определяется автоматически."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Новый тест
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-1 surface p-1 mb-6 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === f.value ? 'bg-brand-500/20 text-brand-200' : 'text-soft hover:text-strong'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-6 w-6" />}
          title="Тесты не найдены"
          description="Создайте A/B тест, чтобы найти, какой вариант объявления приносит больше контактов."
          action={
            <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Создать тест
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((t) => {
            const cmp = compareVariants(t.variants[0], t.variants[1]);
            const project = projects.find((p) => p.id === t.projectId);
            const typeLabel = TEST_TYPES.find((x) => x.value === t.type)?.label ?? t.type;
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/app/tests/${t.id}`}
                        className="text-sm font-semibold text-strong hover:text-brand-300 transition"
                      >
                        {t.name}
                      </Link>
                      <Badge>{typeLabel}</Badge>
                      <Badge
                        tone={
                          t.status === 'running' ? 'success' : t.status === 'finished' ? 'brand' : 'neutral'
                        }
                        dot
                      >
                        {t.status === 'running' ? 'идёт' : t.status === 'finished' ? 'завершён' : 'черновик'}
                      </Badge>
                    </div>
                    <div className="text-xs text-soft mt-1">
                      {project?.name ?? '—'} · запущен {formatDate(t.startedAt)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {t.status === 'running' ? (
                      <button
                        onClick={() => updateTestStatus(t.id, 'finished')}
                        title="Завершить"
                        className="text-soft hover:text-strong p-1"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : t.status === 'draft' ? (
                      <button
                        onClick={() => updateTestStatus(t.id, 'running')}
                        title="Запустить"
                        className="text-soft hover:text-emerald-400 p-1"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        if (confirm('Удалить тест?')) deleteTest(t.id);
                      }}
                      className="text-soft hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {t.variants.map((v) => {
                    const ctr = variantCtr(v);
                    const isWinner = cmp.bestVariant === v.label && t.status !== 'draft';
                    return (
                      <div
                        key={v.id}
                        className={`surface p-3 relative ${
                          isWinner ? 'border-emerald-500/40 bg-emerald-500/[0.06]' : ''
                        }`}
                      >
                        {isWinner && (
                          <div className="absolute -top-2.5 right-2 chip bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                            <Trophy className="h-3 w-3" /> победитель
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-soft uppercase">Вариант {v.label}</span>
                          <span className="text-xs text-soft">CTR</span>
                        </div>
                        <div className="mt-1 text-sm font-medium text-strong line-clamp-2">{v.value}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-soft">{formatNumber(v.views)} показов</span>
                          <span className="text-base font-semibold text-strong tabular-nums">
                            {formatPercent(ctr, 1)}
                          </span>
                        </div>
                        <Progress value={ctr} max={Math.max(8, ctr * 1.2)} tone={isWinner ? 'success' : 'brand'} className="mt-2" />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-soft">Достоверность</span>
                    <span className="font-semibold text-strong tabular-nums">
                      {formatPercent(cmp.confidence * 100, 1)}
                    </span>
                    {cmp.ctr.significant && (
                      <Badge tone="success" dot>
                        статистически значимо
                      </Badge>
                    )}
                  </div>
                  <Link to={`/app/tests/${t.id}`} className="inline-flex items-center gap-1 text-brand-300 hover:underline">
                    Подробнее <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новый A/B тест"
        description="Создайте тест с двумя вариантами — мы определим победителя"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit}>Запустить тест</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Проект" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select label="Тип теста" value={type} onChange={(e) => setType(e.target.value as TestType)}>
              {TEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Название теста"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Цифры в заголовке"
          />
          <Input label="Цель" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea
              label="Вариант A (контрольный)"
              value={variantA}
              onChange={(e) => setVariantA(e.target.value)}
              placeholder="Текущий заголовок / цена / фото"
            />
            <Textarea
              label="Вариант B (тестовый)"
              value={variantB}
              onChange={(e) => setVariantB(e.target.value)}
              placeholder="Новый вариант"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
