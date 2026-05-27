import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  Tag,
  Type,
} from 'lucide-react';
import { useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { analyzeAd, generateTextSuggestion, generateTitleSuggestions } from '@/services/ai';
import { formatRelativeDays } from '@/utils/format';
import type { AIRecommendation, Ad } from '@/types';

const TONE_BY_SEVERITY: Record<AIRecommendation['severity'], 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

export function AIRecommendationsPage() {
  const ads = useData((s) => s.ads);
  const recs = useData((s) => s.recommendations);
  const addRecs = useData((s) => s.addRecommendations);
  const dismiss = useData((s) => s.dismissRecommendation);
  const toast = useToast();
  const [selectedAdId, setSelectedAdId] = useState<string>(ads[0]?.id ?? '');
  const selectedAd = useMemo(() => ads.find((a) => a.id === selectedAdId), [ads, selectedAdId]);
  const [titles, setTitles] = useState<string[]>([]);
  const [textDraft, setTextDraft] = useState('');

  function refreshTitles(ad: Ad) {
    setTitles(generateTitleSuggestions(ad, 5));
  }

  function refreshText(ad: Ad) {
    setTextDraft(generateTextSuggestion(ad));
  }

  function runFullAnalysis() {
    if (!selectedAd) return;
    const found = analyzeAd(selectedAd);
    addRecs(found);
    refreshTitles(selectedAd);
    refreshText(selectedAd);
    toast.success('Анализ готов', `${found.length} новых рекомендаций`);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Скопировано');
    } catch {
      toast.error('Не удалось скопировать');
    }
  }

  return (
    <div>
      <PageHeader
        title="AI-рекомендации"
        description="Генерация заголовков и текстов, разбор слабых мест, советы по фото и цене"
        actions={
          <Button leftIcon={<Sparkles className="h-4 w-4" />} onClick={runFullAnalysis}>
            Запустить AI-анализ
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Выбор объявления для анализа"
              description="AI разберёт заголовок, цену, фото и текст"
            />
            <Select
              value={selectedAdId}
              onChange={(e) => setSelectedAdId(e.target.value)}
              className="mb-4"
            >
              <option value="">— выберите объявление —</option>
              {ads.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
            {selectedAd ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="surface p-3">
                  <div className="text-soft uppercase tracking-wider">Цена</div>
                  <div className="text-strong font-semibold mt-1">{selectedAd.price.toLocaleString('ru-RU')} ₽</div>
                </div>
                <div className="surface p-3">
                  <div className="text-soft uppercase tracking-wider">Показы</div>
                  <div className="text-strong font-semibold mt-1">{selectedAd.views.toLocaleString('ru-RU')}</div>
                </div>
                <div className="surface p-3">
                  <div className="text-soft uppercase tracking-wider">Контакты</div>
                  <div className="text-strong font-semibold mt-1">{selectedAd.contacts.toLocaleString('ru-RU')}</div>
                </div>
                <div className="surface p-3">
                  <div className="text-soft uppercase tracking-wider">Категория</div>
                  <div className="text-strong font-semibold mt-1">{selectedAd.category}</div>
                </div>
              </div>
            ) : (
              <EmptyState title="Объявление не выбрано" />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Генерация заголовков"
              description="5 вариантов на основе данных объявления"
              action={
                selectedAd && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    onClick={() => refreshTitles(selectedAd)}
                  >
                    Сгенерировать
                  </Button>
                )
              }
            />
            {titles.length > 0 ? (
              <div className="space-y-2">
                {titles.map((t, i) => (
                  <div
                    key={i}
                    className="surface p-3 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-md bg-brand-500/15 text-brand-300 flex items-center justify-center text-xs font-semibold shrink-0">
                        #{i + 1}
                      </div>
                      <div className="text-sm text-strong">{t}</div>
                    </div>
                    <button
                      onClick={() => copy(t)}
                      className="text-soft hover:text-strong opacity-0 group-hover:opacity-100 transition"
                      aria-label="Копировать"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Type className="h-6 w-6" />}
                title="Нет вариантов"
                description="Нажмите «Сгенерировать», чтобы получить заголовки"
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Шаблон текста"
              description="Структурированное описание для повышения конверсии"
              action={
                selectedAd && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    onClick={() => refreshText(selectedAd)}
                  >
                    Сгенерировать
                  </Button>
                )
              }
            />
            <Textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              rows={8}
              placeholder="Нажмите «Сгенерировать», чтобы получить шаблон описания"
              className="min-h-[180px]"
            />
            {textDraft && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => copy(textDraft)} leftIcon={<Copy className="h-3.5 w-3.5" />}>
                  Копировать
                </Button>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Все рекомендации" description="Применяйте по одной — мы пометим, что сделано" />
          {recs.length === 0 ? (
            <EmptyState title="Рекомендаций нет" description="Запустите AI-анализ объявления" />
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {recs.map((r) => (
                <div key={r.id} className="surface p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge tone={TONE_BY_SEVERITY[r.severity]} dot>
                      {r.severity === 'critical' ? 'критично' : r.severity === 'warning' ? 'важно' : 'совет'}
                    </Badge>
                    <span className="text-[10px] text-soft">{formatRelativeDays(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-strong">
                    <RecIcon type={r.type} />
                    <span>{r.message}</span>
                  </div>
                  <p className="text-xs text-soft mt-1.5 leading-relaxed">{r.suggestion}</p>
                  <div className="flex items-center justify-between mt-2.5">
                    {r.expectedLift ? (
                      <span className="text-xs text-emerald-400 font-medium">
                        +{r.expectedLift}% ожидаемый прирост
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => dismiss(r.id)}
                      className="text-[11px] text-soft hover:text-strong inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> применено
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecIcon({ type }: { type: AIRecommendation['type'] }) {
  if (type === 'title') return <Type className="h-4 w-4 text-brand-300" />;
  if (type === 'photo') return <ImageIcon className="h-4 w-4 text-violet-300" />;
  if (type === 'price') return <Tag className="h-4 w-4 text-amber-300" />;
  return <Sparkles className="h-4 w-4 text-emerald-300" />;
}
