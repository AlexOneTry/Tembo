import type { Ad, AIRecommendation } from '@/types';
import { uid } from '@/utils/mock';

const TITLE_TEMPLATES = [
  '{name} — {benefit} за {price} ₽',
  '{name} {year} | Гарантия 12 месяцев',
  'Топ-{n} причин выбрать {name}',
  '{name} со скидкой -{discount}% сегодня',
  '{name} — {benefit}, доставка по РФ',
];

const TEXT_TEMPLATES = [
  'Кому подходит:\n• новичкам\n• опытным пользователям\n• для бизнеса\n\nЧто получите:\n— {benefit_1}\n— {benefit_2}\n— Поддержка 24/7\n\nКак купить: напишите в чат — отвечу в течение 5 минут.',
  '{name} — это {benefit_1}. Используем для {usecase}.\n\nПреимущества:\n1. {benefit_1}\n2. {benefit_2}\n3. Экономия времени и денег\n\nЦена выгоднее рынка на 15%. Доставим сегодня.',
];

const BENEFITS = ['экономия времени', 'быстрая окупаемость', 'бесплатная доставка', 'гарантия 1 год'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateTitleSuggestions(ad: Ad, count = 4): string[] {
  const base = ad.title.split(/[\s,—-]+/).slice(0, 2).join(' ') || 'Товар';
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = pick(TITLE_TEMPLATES);
    const filled = tpl
      .replace('{name}', base)
      .replace('{benefit}', pick(BENEFITS))
      .replace('{price}', ad.price.toLocaleString('ru-RU'))
      .replace('{year}', new Date().getFullYear().toString())
      .replace('{n}', String(Math.floor(Math.random() * 5) + 3))
      .replace('{discount}', String(Math.floor(Math.random() * 25) + 5));
    if (!out.includes(filled)) out.push(filled);
  }
  return out;
}

export function generateTextSuggestion(ad: Ad): string {
  return pick(TEXT_TEMPLATES)
    .replace(/\{name\}/g, ad.title)
    .replace('{benefit_1}', pick(BENEFITS))
    .replace('{benefit_2}', pick(BENEFITS))
    .replace('{usecase}', ad.category.toLowerCase());
}

export function analyzeAd(ad: Ad): AIRecommendation[] {
  const recs: AIRecommendation[] = [];
  const ctr = ad.views > 0 ? (ad.contacts / ad.views) * 100 : 0;

  if (ad.title.length > 55) {
    recs.push({
      id: uid('rec'),
      type: 'title',
      adId: ad.id,
      projectId: ad.projectId,
      severity: 'warning',
      message: `Заголовок слишком длинный — ${ad.title.length} симв.`,
      suggestion: 'Сократите до 40–50 символов. Перенесите детали в описание.',
      expectedLift: 11,
      createdAt: new Date().toISOString(),
    });
  }

  if (!/\d/.test(ad.title)) {
    recs.push({
      id: uid('rec'),
      type: 'title',
      adId: ad.id,
      projectId: ad.projectId,
      severity: 'info',
      message: 'В заголовке нет цифр',
      suggestion: 'Добавьте число (год, размер, скидку) — это повысит CTR на 12–18%.',
      expectedLift: 14,
      createdAt: new Date().toISOString(),
    });
  }

  if (ctr < 2 && ad.views > 200) {
    recs.push({
      id: uid('rec'),
      type: 'ctr',
      adId: ad.id,
      projectId: ad.projectId,
      severity: 'critical',
      message: `Низкий CTR — ${ctr.toFixed(1)}%`,
      suggestion: 'Замените главное фото и протестируйте новый заголовок (A/B тест).',
      expectedLift: 22,
      createdAt: new Date().toISOString(),
    });
  }

  if (ad.price > 50000 && ad.contacts === 0) {
    recs.push({
      id: uid('rec'),
      type: 'price',
      adId: ad.id,
      projectId: ad.projectId,
      severity: 'critical',
      message: 'Высокая цена при нулевых контактах',
      suggestion: 'Сравните с конкурентами. Возможно, цена выше рынка на 10–15%.',
      expectedLift: 19,
      createdAt: new Date().toISOString(),
    });
  }

  if (!ad.photoUrl) {
    recs.push({
      id: uid('rec'),
      type: 'photo',
      adId: ad.id,
      projectId: ad.projectId,
      severity: 'warning',
      message: 'Нет качественной обложки',
      suggestion: 'Загрузите минимум 3 студийных фото на белом фоне.',
      expectedLift: 16,
      createdAt: new Date().toISOString(),
    });
  }

  return recs;
}
