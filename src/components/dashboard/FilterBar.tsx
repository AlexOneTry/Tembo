import { Calendar, Filter, RefreshCw } from 'lucide-react';
import { useData } from '@/store/data';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const PRESETS: { label: string; days: number }[] = [
  { label: '7д', days: 7 },
  { label: '14д', days: 14 },
  { label: '30д', days: 30 },
  { label: '90д', days: 90 },
];

const CATEGORIES = [
  'Недвижимость',
  'Авто',
  'Электроника',
  'Услуги',
  'Работа',
  'Одежда',
  'Хобби',
];

export function FilterBar() {
  const filters = useData((s) => s.filters);
  const projects = useData((s) => s.projects);
  const setFilter = useData((s) => s.setFilter);

  const applyDays = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    setFilter({ range: { from: from.toISOString(), to: to.toISOString() } });
  };

  const rangeDays = Math.round(
    (new Date(filters.range.to).getTime() - new Date(filters.range.from).getTime()) /
      86_400_000
  ) + 1;

  return (
    <div className="glass-card p-3 flex flex-col md:flex-row md:items-center gap-3 mb-6">
      <div className="flex items-center gap-2 text-xs text-soft px-1">
        <Filter className="h-3.5 w-3.5" />
        Фильтры
      </div>

      <div className="grid grid-cols-2 md:flex md:flex-1 gap-2">
        <Select
          value={filters.projectId}
          onChange={(e) => setFilter({ projectId: e.target.value as 'all' | string })}
          className="text-xs py-2"
        >
          <option value="all">Все проекты</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.category}
          onChange={(e) => setFilter({ category: e.target.value as 'all' | string })}
          className="text-xs py-2"
        >
          <option value="all">Все категории</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-1 surface p-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyDays(p.days)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              rangeDays === p.days
                ? 'bg-brand-500/20 text-brand-200'
                : 'text-soft hover:text-strong'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-2 text-xs text-soft">
        <Calendar className="h-3.5 w-3.5" />
        <span>{rangeDays} дн.</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        onClick={() => applyDays(30)}
      >
        Сбросить
      </Button>
    </div>
  );
}
