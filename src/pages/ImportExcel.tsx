import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Trash2, Upload, UploadCloud } from 'lucide-react';
import { useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { parseExcelFile, type ImportPreview } from '@/services/excel';
import { formatNumber } from '@/utils/format';

const FIELDS: { value: string; label: string }[] = [
  { value: '', label: '— пропустить —' },
  { value: 'adId', label: 'ID объявления' },
  { value: 'title', label: 'Заголовок' },
  { value: 'category', label: 'Категория' },
  { value: 'price', label: 'Цена' },
  { value: 'date', label: 'Дата' },
  { value: 'views', label: 'Просмотры' },
  { value: 'contacts', label: 'Контакты' },
  { value: 'favorites', label: 'Избранное' },
  { value: 'cost', label: 'Затраты' },
  { value: 'city', label: 'Город' },
];

export function ImportExcel() {
  const projects = useData((s) => s.projects);
  const appendStats = useData((s) => s.appendStats);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const onPick = useCallback(
    async (f: File) => {
      if (!projectId) {
        toast.error('Сначала выберите проект');
        return;
      }
      if (!/\.xlsx?$/i.test(f.name)) {
        toast.error('Неверный формат', 'Поддерживаются файлы .xlsx и .xls');
        return;
      }
      setFile(f);
      setLoading(true);
      try {
        const result = await parseExcelFile(f, projectId);
        setPreview(result);
        toast.success('Файл распознан', `${result.totalRows} строк готовы к импорту`);
      } catch (err) {
        toast.error('Не удалось прочитать файл', (err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [projectId, toast]
  );

  function updateMapping(header: string, field: string) {
    if (!preview) return;
    const nextMapping = { ...preview.mapping };
    if (field) {
      for (const [h, v] of Object.entries(nextMapping)) {
        if (v === field && h !== header) delete nextMapping[h];
      }
      nextMapping[header] = field;
    } else {
      delete nextMapping[header];
    }
    if (file && projectId) {
      setLoading(true);
      parseExcelFile(file, projectId, nextMapping)
        .then(setPreview)
        .finally(() => setLoading(false));
    }
  }

  function commit() {
    if (!preview) return;
    const rows = preview.rows.map((r) => r.parsed).filter((r): r is NonNullable<typeof r> => !!r);
    if (rows.length === 0) {
      toast.error('Нет валидных строк');
      return;
    }
    appendStats(rows);
    toast.success('Импорт завершён', `Добавлено ${rows.length} строк статистики`);
    setFile(null);
    setPreview(null);
  }

  const mappedCount = useMemo(
    () => (preview ? Object.keys(preview.mapping).length : 0),
    [preview]
  );

  return (
    <div>
      <PageHeader
        title="Импорт Excel"
        description="Загрузите выгрузку Авито в формате .xlsx — мы автоматически распознаем колонки"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Файл" description="Поддерживается .xlsx и .xls" />

          <Select
            label="Проект для импорта"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mb-4"
          >
            <option value="">— выберите проект —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onPick(f);
            }}
            className={`rounded-2xl border-2 border-dashed transition p-10 text-center cursor-pointer ${
              dragOver
                ? 'border-brand-500 bg-brand-500/[0.08]'
                : 'border-white/10 hover:border-brand-500/40 hover:bg-white/[0.02]'
            }`}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
            />
            <div className="h-14 w-14 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium text-strong">
              Перетащите файл сюда или нажмите, чтобы выбрать
            </div>
            <div className="text-xs text-soft mt-1">.xlsx / .xls · до 5 МБ</div>
          </div>

          {file && (
            <div className="mt-4 surface p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-strong truncate">{file.name}</div>
                <div className="text-xs text-soft">
                  {(file.size / 1024).toFixed(1)} КБ · {preview?.totalRows ?? 0} строк
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="text-soft hover:text-rose-400"
                aria-label="Удалить файл"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Что распознаётся" description="Шаблон Авито" />
          <ul className="space-y-2 text-sm text-soft">
            {[
              'ID и заголовок объявления',
              'Категория и цена',
              'Дата публикации',
              'Просмотры, контакты, избранное',
              'Затраты (бюджет)',
              'Город размещения',
            ].map((s) => (
              <li key={s} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-5 text-xs text-soft surface p-3">
            Названия колонок распознаются автоматически — вы сможете поправить сопоставление
            перед импортом.
          </div>
        </Card>
      </div>

      {preview && (
        <Card className="mt-6">
          <CardHeader
            title="Сопоставление колонок"
            description="Проверьте, какие поля будут импортированы"
            action={
              <div className="flex items-center gap-2">
                <Badge tone="brand">
                  {mappedCount} / {preview.headers.length} полей
                </Badge>
                <Button
                  onClick={commit}
                  loading={loading}
                  leftIcon={<Upload className="h-4 w-4" />}
                  disabled={mappedCount === 0}
                >
                  Импортировать
                </Button>
              </div>
            }
          />

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-soft tracking-wider">
                  {preview.headers.map((h) => (
                    <th key={h} className="font-medium px-3 py-2 min-w-[150px]">
                      <div className="space-y-1.5">
                        <div className="text-strong normal-case truncate" title={h}>
                          {h}
                        </div>
                        <Select
                          value={preview.mapping[h] ?? ''}
                          onChange={(e) => updateMapping(h, e.target.value)}
                          className="text-xs py-1.5"
                        >
                          {FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((r, idx) => (
                  <tr key={idx} className="border-t divider text-xs">
                    {preview.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-soft max-w-[180px] truncate">
                        {String(r.raw[h] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.totalRows > 8 && (
            <div className="text-xs text-soft mt-3">
              … и ещё {formatNumber(preview.totalRows - 8)} строк
            </div>
          )}
        </Card>
      )}

      {!preview && !file && (
        <Card className="mt-6">
          <EmptyState
            icon={<FileSpreadsheet className="h-6 w-6" />}
            title="Файл пока не загружен"
            description="После загрузки появится предпросмотр и сопоставление колонок"
          />
        </Card>
      )}
    </div>
  );
}
