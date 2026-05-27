import { useState } from 'react';
import { Check, CreditCard, Database, Moon, Sparkles, Sun } from 'lucide-react';
import { useData } from '@/store/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/store/theme';
import { useAuth } from '@/store/auth';
import { formatDate, formatMoney, formatNumber } from '@/utils/format';

const PLANS = [
  { id: 'free' as const, name: 'Free', price: 0, perks: ['1 проект', '5 AI-запросов', 'Базовый дашборд'] },
  { id: 'pro' as const, name: 'Pro', price: 2490, perks: ['10 проектов', '50 тестов', '500 AI-запросов'] },
  { id: 'business' as const, name: 'Business', price: 7990, perks: ['Безлимит проектов', 'API', 'Менеджер'] },
];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const subscription = useData((s) => s.subscription);
  const resetDemo = useData((s) => s.resetDemo);
  const toast = useToast();
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [aiNotif, setAiNotif] = useState(true);

  return (
    <div>
      <PageHeader title="Настройки" description="Тема, уведомления, тариф и данные" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Внешний вид" description="Тема и плотность интерфейса" />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`surface p-4 text-left transition ${
                theme === 'dark' ? 'border-brand-500/50 bg-brand-500/[0.06]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <Moon className="h-5 w-5 text-brand-300" />
                {theme === 'dark' && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <div className="text-sm font-semibold text-strong mt-2">Тёмная</div>
              <div className="text-xs text-soft mt-1">По умолчанию</div>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`surface p-4 text-left transition ${
                theme === 'light' ? 'border-brand-500/50 bg-brand-500/[0.06]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <Sun className="h-5 w-5 text-amber-400" />
                {theme === 'light' && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <div className="text-sm font-semibold text-strong mt-2">Светлая</div>
              <div className="text-xs text-soft mt-1">Для дневного света</div>
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Уведомления" description="Что присылать на почту и в браузер" />
          <div className="space-y-3">
            <Switch label="Email-уведомления" value={emailNotif} onChange={setEmailNotif} hint="Сводки и важные события" />
            <Switch label="Push-уведомления" value={pushNotif} onChange={setPushNotif} hint="В браузере" />
            <Switch label="AI-инсайты" value={aiNotif} onChange={setAiNotif} hint="Новые рекомендации каждый день" />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Тариф и лимиты"
            description={`Подписка ${subscription.plan.toUpperCase()} — продление ${formatDate(subscription.renewsAt)}`}
            action={<Badge tone="brand" dot>активна</Badge>}
          />
          <UsageRow
            label="Проекты"
            used={subscription.used.projects}
            limit={subscription.limits.projects}
          />
          <UsageRow label="A/B тесты" used={subscription.used.tests} limit={subscription.limits.tests} />
          <UsageRow
            label="AI-запросы"
            used={subscription.used.aiRequests}
            limit={subscription.limits.aiRequests}
          />
          <UsageRow
            label="Конкуренты"
            used={subscription.used.competitors}
            limit={subscription.limits.competitors}
          />
          <div className="mt-4 text-xs text-soft">
            Стоимость: {formatMoney(subscription.price)} / мес. Следующее списание {formatDate(subscription.renewsAt)}.
          </div>
        </Card>

        <Card>
          <CardHeader title="Доступные тарифы" description="Переход в один клик" />
          <div className="space-y-2.5">
            {PLANS.map((p) => {
              const isCurrent = subscription.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={`surface p-3 flex items-center justify-between gap-3 ${
                    isCurrent ? 'border-brand-500/40 bg-brand-500/[0.06]' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-strong">{p.name}</span>
                      {isCurrent && <Badge tone="brand">текущий</Badge>}
                    </div>
                    <div className="text-xs text-soft mt-0.5">{p.perks.join(' · ')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-strong">{formatMoney(p.price)}</div>
                    <Button
                      variant={isCurrent ? 'secondary' : 'primary'}
                      size="sm"
                      className="mt-1"
                      disabled={isCurrent}
                      leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                      onClick={() => {
                        if (!user) return;
                        updateProfile({ plan: p.id });
                        toast.success('Тариф изменён', `Активирован план ${p.name}`);
                      }}
                    >
                      Перейти
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Данные" description="Демонстрационные данные и сброс" />
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="surface p-3 flex items-center gap-3 flex-1">
              <div className="h-9 w-9 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center">
                <Database className="h-4 w-4" />
              </div>
              <div className="text-sm text-soft">
                Демо-данные хранятся локально (LocalStorage). Сброс восстановит исходный набор.
              </div>
            </div>
            <Button
              variant="secondary"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => {
                resetDemo();
                toast.success('Демо данные восстановлены');
              }}
            >
              Сбросить демо
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const tone = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'brand';
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-strong">{label}</span>
        <span className="text-soft tabular-nums text-xs">
          {formatNumber(used)} / {formatNumber(limit)}
        </span>
      </div>
      <Progress value={used} max={limit} tone={tone} />
    </div>
  );
}

function Switch({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div>
        <div className="text-sm text-strong">{label}</div>
        {hint && <div className="text-xs text-soft mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`h-6 w-11 rounded-full transition relative ${
          value ? 'bg-brand-500' : 'bg-white/10'
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}
