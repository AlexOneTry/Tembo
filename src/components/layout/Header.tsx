import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/store/theme';
import { useAuth } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 px-4 md:px-6 pt-4">
      <div className="glass-card flex items-center gap-3 px-4 py-2.5">
        <button
          onClick={onMenuClick}
          className="md:hidden text-soft hover:text-strong"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-soft pointer-events-none" />
          <input
            type="search"
            placeholder="Поиск по объявлениям, тестам, проектам..."
            className="input-base pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            className="btn-ghost h-9 w-9 p-0"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setNotifOpen(true)}
            className="btn-ghost h-9 w-9 p-0 relative"
            aria-label="Уведомления"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-rose-400" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-white/[0.06] transition"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-[11px] font-semibold text-white">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-strong leading-tight">
                  {user?.name ?? 'Гость'}
                </div>
                <div className="text-[10px] text-soft">{user?.plan ?? 'free'} план</div>
              </div>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 glass-card p-1.5"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/app/profile');
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-white/[0.06] transition"
                >
                  Профиль
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/app/settings');
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-white/[0.06] transition"
                >
                  Настройки
                </button>
                <div className="my-1 border-t divider" />
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-md text-rose-300 hover:bg-rose-500/10 transition"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Уведомления"
        description="Последние события по вашим проектам"
      >
        <div className="space-y-3">
          {[
            { title: 'Тест «Цифры в заголовке» определил победителя', time: '2 мин назад', tone: 'brand' },
            { title: 'Конкурент изменил цену на 12%', time: '1 ч назад', tone: 'warning' },
            { title: 'AI: 4 новых рекомендации', time: 'сегодня', tone: 'info' },
            { title: 'Импорт Excel завершён (124 строки)', time: 'вчера', tone: 'success' },
          ].map((n, i) => (
            <div key={i} className="surface p-3 flex items-start gap-3">
              <span className="h-2 w-2 mt-1.5 rounded-full bg-brand-400" />
              <div className="flex-1">
                <div className="text-sm font-medium text-strong">{n.title}</div>
                <div className="text-xs text-soft mt-0.5">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </header>
  );
}
