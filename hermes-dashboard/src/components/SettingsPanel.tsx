import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { useEffect } from 'react';

const ACCENT_COLORS = [
  '#7c5cfc',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#f472b6',
];

const HOTKEYS = [
  { keys: '⌘ N', label: 'Новая сессия' },
  { keys: '⌘ W', label: 'Закрыть сессию' },
  { keys: '⌘ K', label: 'Поиск по сессиям' },
  { keys: '⌘ /', label: 'Открыть настройки' },
  { keys: 'Esc', label: 'Закрыть модалку / панель' },
  { keys: 'Enter', label: 'Отправить сообщение' },
  { keys: '⇧ Enter', label: 'Перенос строки' },
];

export function SettingsPanel() {
  const open = useSessionStore((s) => s.settingsOpen);
  const close = useSessionStore((s) => s.closeSettings);
  const settings = useSessionStore((s) => s.settings);
  const updateSettings = useSessionStore((s) => s.updateSettings);

  // Apply theme & accent live
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--color-accent', settings.accentColor);
    document.documentElement.style.setProperty(
      '--color-accent-soft',
      settings.accentColor + '33',
    );
    document.documentElement.style.fontSize = settings.fontSize + 'px';
  }, [settings.theme, settings.accentColor, settings.fontSize]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-50 flex justify-end backdrop-blur-sm"
          style={{ background: 'color-mix(in oklab, #000 45%, transparent)' }}
        >
          <motion.div
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-[min(420px,100vw)] bg-card border-l border-strong shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Настройки"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-default">
              <h3 className="text-base font-semibold text-primary">Настройки</h3>
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="w-8 h-8 grid place-items-center rounded-lg text-secondary hover:bg-card-hover hover:text-primary transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
              <Section title="Внешний вид">
                <Row label="Тема">
                  <div className="flex gap-1 p-0.5 rounded-lg bg-app border border-default">
                    {(['dark', 'light'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateSettings({ theme: t })}
                        className={
                          'px-3 py-1 text-[12px] rounded-md transition ' +
                          (settings.theme === t
                            ? 'bg-card text-primary border border-default'
                            : 'text-secondary hover:text-primary')
                        }
                      >
                        {t === 'dark' ? 'Тёмная' : 'Светлая'}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label="Акцент">
                  <div className="flex items-center gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateSettings({ accentColor: c })}
                        aria-label={`Цвет ${c}`}
                        className="w-6 h-6 rounded-full border-2 transition"
                        style={{
                          background: c,
                          borderColor:
                            settings.accentColor === c
                              ? 'var(--color-text)'
                              : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </Row>
                <Row label="Размер шрифта">
                  <input
                    type="range"
                    min={12}
                    max={18}
                    value={settings.fontSize}
                    onChange={(e) =>
                      updateSettings({ fontSize: Number(e.target.value) })
                    }
                    className="w-32 accent-[var(--color-accent)]"
                  />
                  <span className="text-[12px] text-secondary font-mono w-9 text-right">
                    {settings.fontSize}px
                  </span>
                </Row>
              </Section>

              <Section title="Подключение">
                <Row label="API endpoint" stacked>
                  <input
                    type="url"
                    placeholder="https://api.example.com"
                    value={settings.apiEndpoint}
                    onChange={(e) => updateSettings({ apiEndpoint: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-app border border-default text-sm text-primary outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </Row>
                <Row label="Модель" stacked>
                  <input
                    type="text"
                    value={settings.model}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-app border border-default text-sm font-mono text-primary outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                </Row>
              </Section>

              <Section title="Горячие клавиши">
                <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-default overflow-hidden">
                  {HOTKEYS.map((h) => (
                    <li
                      key={h.keys}
                      className="flex items-center justify-between px-3 py-2 bg-app"
                    >
                      <span className="text-[13px] text-primary">{h.label}</span>
                      <kbd className="font-mono text-[11px] text-secondary px-1.5 py-0.5 rounded bg-card border border-default">
                        {h.keys}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10.5px] uppercase tracking-wider font-semibold text-muted mb-3">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
  stacked = false,
}: {
  label: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] text-secondary">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-primary">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
