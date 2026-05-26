# AvitoBoost AI

SaaS-сервис аналитики и A/B тестирования объявлений для платформы Авито.

## Возможности

- Импорт Excel-выгрузок Авито (.xlsx) с автоматическим распознаванием колонок
- Дашборды с CTR, CPA, CPL, ROI, ROMI и динамикой просмотров
- A/B тесты заголовков, цен, фото, текстов с автоматическим определением победителя
- AI-рекомендации по заголовкам, фото, цене и тексту
- Анализ конкурентов: цены, поднятия, история изменений
- Дарк / лайт тема, адаптивный интерфейс, glassmorphism
- Авторизация, регистрация, онбординг, тарифные планы

## Стек

- React 18 + Vite 6 + TypeScript
- TailwindCSS 3 + кастомные UI-компоненты в духе Shadcn/UI
- Recharts (графики), Framer Motion (анимации), Lucide (иконки)
- Zustand (стор), TanStack Query (data fetching), React Router 6
- SheetJS (xlsx) для импорта/экспорта Excel

## Запуск

```bash
pnpm install
pnpm dev      # development
pnpm build    # production build
pnpm preview  # preview build
```

Сервис открывается на `http://localhost:5173`.

## Демо-данные

При первом входе автоматически создаются 4 демо-проекта с 30 днями статистики,
объявлениями, A/B тестами и AI-рекомендациями. Сброс — в Настройках.

## Структура

```
src/
  components/    # UI, layout, charts, dashboard
  pages/         # все страницы приложения
  services/      # excel, ai, metrics
  store/         # zustand: auth, data, theme + ToastProvider
  utils/         # format, statistics, mock data
  types/         # типы данных
  lib/           # хелперы (cn)
```
