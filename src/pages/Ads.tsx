import { useMemo, useState } from 'react';
import { ExternalLink, ImageIcon, Plus, Search, Sparkles } from 'lucide-react';
import { applyFilters, useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { useToast } from '@/components/ui/Toast';
import { analyzeAd, generateTitleSuggestions } from '@/services/ai';
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/utils/format';
import type { Ad } from '@/types';

export function Ads() {
  const ads = useData((s) => s.ads);
  const projects = useData((s) => s.projects);
  const addAd = useData((s) => s.addAd);
  const updateAd = useData((s) => s.updateAd);
  const addRecommendations = useData((s) => s.addRecommendations);
  const filters = useData((s) => s.filters);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState<Ad | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Ad['status']>('all');
  const [titles, setTitles] = useState<string[]>([]);

  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? '',
    title: '',
    category: 'Электроника',
    city: 'Москва',
    price: 0,
    url: '',
  });

  const filtered = useMemo(() => {
    const base = applyFilters(ads, filters);
    return base.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (query && !a.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [ads, filters, statusFilter, query]);

  function submit() {
    if (!form.projectId) {
      toast.error('Выберите проект');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Укажите заголовок');
      return;
    }
    addAd({
      projectId: form.projectId,
      title: form.title,
      category: form.category,
      city: form.city,
      price: form.price,
      url: form.url,
      publishedAt: new Date().toISOString(),
      views: 0,
      contacts: 0,
      favorites: 0,
      cost: 0,
      status: 'active',
    });
    toast.success('Объявление добавлено');
    setOpen(false);
    setForm({ ...form, title: '', price: 0, url: '' });
  }

  function openAnalyze(ad: Ad) {
    setAnalyzeOpen(ad);
    setTitles(generateTitleSuggestions(ad));
    const recs = analyzeAd(ad);
    if (recs.length > 0) {
      addRecommendations(recs);
      toast.info('Анализ готов', `${recs.length} новых рекомендаций`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Объявления"
        description="Управляйте объявлениями, анализируйте слабые места и подбирайте новые заголовки"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Добавить объявление
          </Button>
        }
      />

      <FilterBar />

      <div className="glass-card p-3 mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-soft" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по заголовку"
            className="input-base pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | Ad['status'])}
          className="text-sm md:w-48"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="paused">Приостановлены</option>
          <option value="archived">В архиве</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Объявлений не найдено"
          description="Попробуйте сбросить фильтры или добавьте новое объявление"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ad) => {
            const ctr = ad.views > 0 ? (ad.contacts / ad.views) * 100 : 0;
            const project = projects.find((p) => p.id === ad.projectId);
            return (
              <Card key={ad.id} className="flex flex-col">
                <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-brand-500/30 via-violet-500/20 to-accent-500/20 flex items-center justify-center mb-3">
                  <ImageIcon className="h-10 w-10 text-white/40" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge>{ad.category}</Badge>
                  <Badge
                    tone={ad.status === 'active' ? 'success' : ad.status === 'paused' ? 'warning' : 'neutral'}
                    dot
                  >
                    {ad.status === 'active' ? 'активно' : ad.status === 'paused' ? 'пауза' : 'архив'}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-strong line-clamp-2">{ad.title}</h3>
                <div className="text-xs text-soft mt-1">
                  {project?.name ?? '—'} · {ad.city ?? '—'} · {formatDate(ad.publishedAt)}
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  <Mini label="Цена" value={formatMoney(ad.price)} />
                  <Mini label="Показы" value={formatNumber(ad.views)} />
                  <Mini label="Контакты" value={formatNumber(ad.contacts)} />
                  <Mini label="CTR" value={formatPercent(ctr, 1)} />
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    size="sm"
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                    onClick={() => openAnalyze(ad)}
                    className="flex-1"
                  >
                    AI-анализ
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      updateAd(ad.id, { status: ad.status === 'active' ? 'paused' : 'active' })
                    }
                  >
                    {ad.status === 'active' ? 'Пауза' : 'Запуск'}
                  </Button>
                  {ad.url && (
                    <a
                      href={ad.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost h-9 w-9 p-0"
                      aria-label="Открыть"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новое объявление"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit}>Добавить</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Проект"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            label="Заголовок"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Категория"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input label="Город" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input
              label="Цена, ₽"
              type="number"
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
            />
          </div>
          <Input
            label="Ссылка на Авито"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://www.avito.ru/..."
          />
        </div>
      </Modal>

      <Modal
        open={!!analyzeOpen}
        onClose={() => setAnalyzeOpen(null)}
        title="AI-анализ объявления"
        description={analyzeOpen?.title}
        size="lg"
      >
        {analyzeOpen && (
          <div className="space-y-4">
            <div className="surface p-3">
              <div className="text-xs text-soft mb-2">Рекомендованные заголовки</div>
              <ul className="space-y-2">
                {titles.map((t, i) => (
                  <li key={i} className="text-sm text-strong p-2 rounded-md hover:bg-white/[0.06] transition">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface p-3">
              <div className="text-xs text-soft mb-2">Что улучшить</div>
              <ul className="space-y-2 text-sm text-soft">
                {analyzeAd(analyzeOpen).map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 mt-2 rounded-full bg-brand-400" />
                    <span>
                      <span className="text-strong font-medium">{r.message}.</span> {r.suggestion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-2 text-center">
      <div className="text-[10px] text-soft uppercase tracking-wider truncate">{label}</div>
      <div className="text-sm font-semibold text-strong tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
