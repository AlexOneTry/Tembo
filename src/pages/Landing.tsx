import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Check,
  FlaskConical,
  LineChart,
  Sparkles,
  Upload,
  Users,
  Zap,
} from 'lucide-react';

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'A/B тесты заголовков и цен',
    text: 'Тестируйте заголовки, фото, цены и текст — победитель определяется автоматически с расчётом confidence score.',
  },
  {
    icon: BarChart3,
    title: 'Дашборды и аналитика',
    text: 'CTR, CPA, CPL, ROI, ROMI — всё в одной панели. Сравнивайте проекты, категории и временные отрезки.',
  },
  {
    icon: Upload,
    title: 'Импорт Excel в один клик',
    text: 'Загрузите выгрузку Авито (.xlsx) — мы сами распознаем колонки и обновим все графики.',
  },
  {
    icon: Sparkles,
    title: 'AI-рекомендации',
    text: 'Генерация заголовков, советы по цене и фото, разбор слабых мест объявления.',
  },
  {
    icon: Users,
    title: 'Анализ конкурентов',
    text: 'Отслеживайте изменение цены, поднятия и заголовки у конкурентов. История за 14 дней.',
  },
  {
    icon: LineChart,
    title: 'Когорты и тренды',
    text: 'Динамика просмотров, конверсий и стоимости заявок — без подключения внешних BI.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '0 ₽',
    period: 'навсегда',
    perks: ['1 проект', 'Импорт Excel', 'Базовый дашборд', '5 AI-рекомендаций'],
    cta: 'Попробовать',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '2 490 ₽',
    period: 'в месяц',
    perks: ['10 проектов', '50 A/B тестов', '500 AI-запросов', 'Анализ конкурентов'],
    cta: 'Выбрать Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '7 990 ₽',
    period: 'в месяц',
    perks: ['Безлимит проектов', 'Безлимит тестов', 'API-доступ', 'Личный менеджер'],
    cta: 'Связаться',
    highlight: false,
  },
];

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-glow">
            A
          </div>
          <div className="font-semibold text-strong">AvitoBoost <span className="text-brand-300">AI</span></div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-soft">
          <a href="#features" className="hover:text-strong transition">Возможности</a>
          <a href="#pricing" className="hover:text-strong transition">Тарифы</a>
          <a href="#faq" className="hover:text-strong transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">Войти</Link>
          <Link to="/register" className="btn-primary">Начать бесплатно</Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center relative">
        <div className="absolute inset-0 -z-10 bg-grid-dark opacity-30" style={{ backgroundSize: '40px 40px' }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 chip mb-6"
        >
          <Zap className="h-3.5 w-3.5 text-brand-300" />
          Аналитика + A/B тесты Авито на базе AI
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-strong leading-[1.05] max-w-4xl mx-auto">
          Увеличьте CTR и заявки на Авито на <span className="bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-transparent">+34%</span> за 14 дней
        </h1>
        <p className="text-lg text-soft mt-6 max-w-2xl mx-auto">
          AvitoBoost AI — это SaaS-платформа для бизнеса, авитологов и предпринимателей.
          A/B тесты, аналитика, AI-генерация заголовков, разбор конкурентов.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="btn-primary text-base px-6 py-3">
            Начать бесплатно <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="btn-secondary text-base px-6 py-3">
            Возможности
          </a>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { v: '+34%', l: 'средний рост CTR' },
            { v: '−22%', l: 'к стоимости заявки' },
            { v: '500+', l: 'бизнесов с нами' },
            { v: '4.9', l: 'средняя оценка' },
          ].map((s) => (
            <div key={s.l} className="glass-card p-4 text-center">
              <div className="text-2xl font-semibold text-strong">{s.v}</div>
              <div className="text-xs text-soft mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-strong">Всё, что нужно для роста</h2>
          <p className="text-soft mt-3 max-w-xl mx-auto">
            Импорт, аналитика, тесты и AI-инсайты — в одной платформе уровня Stripe и Linear.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <div className="h-10 w-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-strong">{f.title}</h3>
              <p className="text-sm text-soft mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-strong">Простые тарифы</h2>
          <p className="text-soft mt-3">Начните бесплатно, апгрейд в один клик.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`glass-card p-6 relative ${p.highlight ? 'ring-2 ring-brand-500/40 shadow-glow' : ''}`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-6 chip bg-brand-500/20 text-brand-200 border-brand-500/40">
                  Популярный
                </span>
              )}
              <div className="text-sm font-semibold text-strong">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <div className="text-3xl font-semibold text-strong">{p.price}</div>
                <div className="text-xs text-soft">/ {p.period}</div>
              </div>
              <ul className="mt-5 space-y-2.5">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-soft">
                    <Check className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-6 inline-flex w-full justify-center ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t divider mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-soft">© {new Date().getFullYear()} AvitoBoost AI. Аналитика и A/B тесты Авито.</div>
          <div className="flex items-center gap-4 text-xs text-soft">
            <a href="#" className="hover:text-strong">Условия</a>
            <a href="#" className="hover:text-strong">Конфиденциальность</a>
            <a href="#" className="hover:text-strong">Контакты</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
