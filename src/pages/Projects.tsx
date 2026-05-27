import { useMemo, useState } from 'react';
import { Plus, Trash2, FolderKanban, Edit2 } from 'lucide-react';
import { useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatNumber } from '@/utils/format';

const CATEGORIES = ['Недвижимость', 'Авто', 'Электроника', 'Услуги', 'Работа', 'Одежда', 'Хобби'];

export function Projects() {
  const projects = useData((s) => s.projects);
  const stats = useData((s) => s.stats);
  const tests = useData((s) => s.tests);
  const addProject = useData((s) => s.addProject);
  const updateProject = useData((s) => s.updateProject);
  const deleteProject = useData((s) => s.deleteProject);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  const stats_by_project = useMemo(() => {
    const map = new Map<string, { views: number; contacts: number; tests: number }>();
    for (const r of stats) {
      const v = map.get(r.projectId) ?? { views: 0, contacts: 0, tests: 0 };
      v.views += r.views;
      v.contacts += r.contacts;
      map.set(r.projectId, v);
    }
    for (const t of tests) {
      const v = map.get(t.projectId) ?? { views: 0, contacts: 0, tests: 0 };
      v.tests += 1;
      map.set(t.projectId, v);
    }
    return map;
  }, [stats, tests]);

  function openCreate() {
    setEditId(null);
    setName('');
    setCategory(CATEGORIES[0]);
    setCity('');
    setDescription('');
    setOpen(true);
  }

  function openEdit(id: string) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setEditId(id);
    setName(p.name);
    setCategory(p.category);
    setCity(p.city ?? '');
    setDescription(p.description ?? '');
    setOpen(true);
  }

  function submit() {
    if (!name.trim()) {
      toast.error('Укажите название');
      return;
    }
    if (editId) {
      updateProject(editId, { name, category, city, description });
      toast.success('Проект обновлён');
    } else {
      addProject({ name, category, city, description });
      toast.success('Проект создан');
    }
    setOpen(false);
  }

  function remove(id: string) {
    if (!confirm('Удалить проект и все связанные данные?')) return;
    deleteProject(id);
    toast.success('Проект удалён');
  }

  return (
    <div>
      <PageHeader
        title="Проекты"
        description="Группируйте объявления и тесты по бизнесу или клиенту"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Новый проект
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="Пока нет проектов"
          description="Создайте проект, чтобы группировать объявления, тесты и статистику."
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Создать проект
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const s = stats_by_project.get(p.id) ?? { views: 0, contacts: 0, tests: 0 };
            return (
              <Card key={p.id} className="group hover:border-brand-500/30 transition">
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold"
                    style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}88)` }}
                  >
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-strong truncate">{p.name}</h3>
                      <Badge>{p.category}</Badge>
                    </div>
                    <div className="text-xs text-soft mt-1">
                      {p.city ?? '—'} · создан {formatDate(p.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEdit(p.id)}
                      className="text-soft hover:text-strong p-1"
                      aria-label="Редактировать"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="text-soft hover:text-rose-400 p-1"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {p.description && <p className="text-sm text-soft mt-3 line-clamp-2">{p.description}</p>}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="Показы" value={formatNumber(s.views)} />
                  <Stat label="Контакты" value={formatNumber(s.contacts)} />
                  <Stat label="Тестов" value={String(s.tests)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Редактировать проект' : 'Новый проект'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit}>{editId ? 'Сохранить' : 'Создать'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Категория" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Input label="Город" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
          </div>
          <Input
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Цель проекта или клиент"
          />
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-2.5 text-center">
      <div className="text-[10px] text-soft uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-strong mt-0.5">{value}</div>
    </div>
  );
}
