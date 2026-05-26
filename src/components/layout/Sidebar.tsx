import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  FlaskConical,
  BarChart3,
  Megaphone,
  Upload,
  Sparkles,
  Users,
  Settings,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';

const NAV = [
  { to: '/app', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/app/projects', label: 'Проекты', icon: FolderKanban },
  { to: '/app/tests', label: 'A/B тесты', icon: FlaskConical },
  { to: '/app/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/app/ads', label: 'Объявления', icon: Megaphone },
  { to: '/app/import', label: 'Импорт Excel', icon: Upload },
  { to: '/app/ai', label: 'AI-рекомендации', icon: Sparkles },
  { to: '/app/competitors', label: 'Конкуренты', icon: Users },
] as const;

const FOOTER_NAV = [
  { to: '/app/settings', label: 'Настройки', icon: Settings },
  { to: '/app/profile', label: 'Профиль', icon: User },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -320 }}
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className={cn(
          'fixed md:static top-0 left-0 z-40 h-screen w-72 shrink-0 p-4 md:translate-x-0 md:!transform-none'
        )}
      >
        <div className="glass-card h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-glow">
                A
              </div>
              <div>
                <div className="text-sm font-semibold text-strong leading-tight">AvitoBoost</div>
                <div className="text-[10px] uppercase tracking-wider text-brand-300 font-semibold">AI</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden text-soft hover:text-strong"
              aria-label="Закрыть меню"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 flex flex-col gap-1 px-1 overflow-y-auto">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} onSelect={onClose} />
            ))}
          </nav>

          <div className="mt-4 pt-4 border-t divider flex flex-col gap-1">
            {FOOTER_NAV.map((item) => (
              <NavItem key={item.to} {...item} onSelect={onClose} />
            ))}
          </div>

          <div className="mt-4 surface p-3.5">
            <div className="text-xs text-soft mb-1">Тариф</div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-strong">Pro</div>
              <span className="chip bg-brand-500/15 text-brand-300 border-brand-500/30">
                активен
              </span>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onSelect,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  onSelect: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onSelect}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
          isActive
            ? 'bg-brand-500/15 text-brand-200 shadow-[inset_0_0_0_1px_rgba(91,136,255,0.25)]'
            : 'text-ink-300 hover:text-strong hover:bg-white/[0.04]'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
