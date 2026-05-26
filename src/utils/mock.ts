import type {
  ABTest,
  Ad,
  AIRecommendation,
  AvitoStatRow,
  Competitor,
  Project,
  Subscription,
  TestVariant,
  User,
} from '@/types';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-3)}`;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function daysAgoISO(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
}

export const DEMO_USER: User = {
  id: 'usr_demo',
  email: 'demo@avitoboost.ai',
  name: 'Алексей Иванов',
  plan: 'pro',
  createdAt: daysAgoISO(120),
  company: 'BoostAds Agency',
  phone: '+7 (999) 123-45-67',
};

const PROJECT_COLORS = [
  '#5b88ff',
  '#84cc16',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
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

const CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск'];

const TITLE_POOL = [
  'iPhone 15 Pro 256GB в идеале',
  'Студия в центре — без посредников',
  'Toyota Camry 2021 на гарантии',
  'Услуги частного риелтора',
  'Курс «Авитолог за 14 дней»',
  'Зимняя резина Michelin R18',
  'MacBook Air M2 2024',
  'Сдам квартиру посуточно у метро',
  'PlayStation 5 Slim 1TB',
  'Diesel Watch Mr Daddy 2.0',
];

export function generateProjects(): Project[] {
  const names = [
    'Недвижимость Москва',
    'Автозапчасти SPB',
    'Электроника опт',
    'Услуги клининга',
  ];
  return names.map((name, i) => ({
    id: uid('prj'),
    name,
    category: CATEGORIES[i % CATEGORIES.length],
    city: CITIES[i % CITIES.length],
    description: 'Демонстрационный проект с реальными метриками',
    createdAt: daysAgoISO(randInt(30, 200)),
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));
}

function buildVariant(testId: string, label: 'A' | 'B', boost: number): TestVariant {
  const views = randInt(800, 4500);
  const ctrPct = (3 + Math.random() * 4 + boost) / 100;
  const clicks = Math.round(views * ctrPct);
  const convPct = (8 + Math.random() * 12 + boost * 6) / 100;
  const conversions = Math.round(clicks * convPct);
  const contacts = Math.round(clicks * (0.6 + Math.random() * 0.2));
  const cost = randInt(2000, 9000);
  const revenue = conversions * randInt(1500, 6000);
  return {
    id: uid('var'),
    testId,
    label,
    value: label === 'A' ? 'Контрольный вариант' : 'Тестовый вариант',
    views,
    clicks,
    contacts,
    conversions,
    cost,
    revenue,
  };
}

export function generateTests(projects: Project[]): ABTest[] {
  const types: ABTest['type'][] = ['title', 'price', 'photo', 'text', 'category', 'time'];
  const tests: ABTest[] = [];
  for (let i = 0; i < 8; i++) {
    const project = projects[i % projects.length];
    const type = types[i % types.length];
    const id = uid('tst');
    const variantA = buildVariant(id, 'A', 0);
    const variantB = buildVariant(id, 'B', Math.random() * 0.8 - 0.2);
    const status: ABTest['status'] =
      i < 2 ? 'finished' : i < 6 ? 'running' : 'draft';
    tests.push({
      id,
      projectId: project.id,
      name: testNameByType(type, i),
      goal: 'Увеличить CTR и конверсию в контакты',
      type,
      status,
      startedAt: daysAgoISO(randInt(2, 30)),
      finishedAt: status === 'finished' ? daysAgoISO(randInt(0, 3)) : undefined,
      variants: [variantA, variantB],
    });
  }
  return tests;
}

function testNameByType(type: ABTest['type'], i: number): string {
  const names: Record<ABTest['type'], string[]> = {
    title: [
      'Цифры в заголовке vs обычный',
      'Эмодзи в заголовке: тест влияния',
      'Длинный vs короткий заголовок',
    ],
    price: ['Цена 24990 vs 25000', 'Цена с -5% от рынка'],
    photo: ['Фон белый vs студийный', 'Главное фото: товар vs упаковка'],
    text: ['Короткое описание vs длинное', 'Структурированное vs сплошное'],
    category: ['Категория «Авто» vs «Запчасти»'],
    time: ['Публикация утром vs вечером'],
  };
  return names[type][i % names[type].length];
}

export function generateAds(projects: Project[]): Ad[] {
  const ads: Ad[] = [];
  for (let i = 0; i < 18; i++) {
    const project = projects[i % projects.length];
    const views = randInt(120, 8200);
    const contacts = Math.round(views * (0.03 + Math.random() * 0.05));
    ads.push({
      id: uid('ad'),
      projectId: project.id,
      title: TITLE_POOL[i % TITLE_POOL.length],
      category: project.category,
      city: project.city,
      price: randInt(2500, 89000),
      url: `https://www.avito.ru/example_${i}`,
      publishedAt: daysAgoISO(randInt(0, 45)),
      views,
      contacts,
      favorites: Math.round(views * 0.04),
      cost: randInt(1500, 7800),
      status: i % 7 === 0 ? 'paused' : i % 11 === 0 ? 'archived' : 'active',
    });
  }
  return ads;
}

export function generateAvitoStats(projects: Project[]): AvitoStatRow[] {
  const rows: AvitoStatRow[] = [];
  for (const project of projects) {
    for (let d = 29; d >= 0; d--) {
      const base = randInt(180, 1100);
      const seasonal = Math.sin((d / 30) * Math.PI * 2) * 60;
      const views = Math.max(40, Math.round(base + seasonal));
      const contacts = Math.round(views * (0.03 + Math.random() * 0.04));
      rows.push({
        id: uid('row'),
        projectId: project.id,
        adId: `ad_${project.id.slice(-4)}_${d}`,
        title: TITLE_POOL[d % TITLE_POOL.length],
        category: project.category,
        price: randInt(3500, 78000),
        date: daysAgoISO(d),
        views,
        contacts,
        favorites: Math.round(views * 0.03),
        cost: randInt(800, 3500),
        city: project.city,
      });
    }
  }
  return rows;
}

export function generateRecommendations(): AIRecommendation[] {
  const items: Omit<AIRecommendation, 'id' | 'createdAt'>[] = [
    {
      type: 'title',
      severity: 'warning',
      message: 'Заголовок длиннее оптимального',
      suggestion:
        'Сократите заголовок до 40–50 символов. Уберите общие слова, оставьте цифры и выгоду.',
      expectedLift: 12,
    },
    {
      type: 'price',
      severity: 'critical',
      message: 'Цена выше рынка на 12%',
      suggestion:
        'Снизьте цену на 1500–2000 ₽ или добавьте бонус (доставка/гарантия) в описание.',
      expectedLift: 18,
    },
    {
      type: 'photo',
      severity: 'warning',
      message: 'Фото имеет низкий контраст',
      suggestion:
        'Замените главное фото на студийное с белым фоном — контраст выше, CTR вырастет.',
      expectedLift: 9,
    },
    {
      type: 'ctr',
      severity: 'info',
      message: 'Добавьте цифры в заголовок',
      suggestion:
        'Тесты показывают, что числа («1 год», «-20%», «3 в 1») увеличивают CTR на 14–22%.',
      expectedLift: 16,
    },
    {
      type: 'text',
      severity: 'info',
      message: 'Описание слабо структурировано',
      suggestion:
        'Используйте маркеры, разбейте на 3 блока: «что», «кому», «как купить». Увеличит время на странице.',
      expectedLift: 7,
    },
    {
      type: 'category',
      severity: 'warning',
      message: 'Подходящая категория «Аксессуары» вместо «Электроника»',
      suggestion:
        'В выбранной категории высокая конкуренция. Альтернативная подкатегория даст +20% к видимости.',
      expectedLift: 20,
    },
  ];
  return items.map((it) => ({
    ...it,
    id: uid('rec'),
    createdAt: daysAgoISO(randInt(0, 6)),
  }));
}

export function generateCompetitors(projects: Project[]): Competitor[] {
  const names = [
    'Quick Sale Pro',
    'Top Realtor MSK',
    'Auto Service 24',
    'Tech Outlet',
  ];
  return names.map((name, i) => {
    const project = projects[i % projects.length];
    const snapshots = Array.from({ length: 14 }).map((_, d) => ({
      date: daysAgoISO(13 - d),
      price: randInt(20000, 35000) + d * 80,
      title: `${name} — ${TITLE_POOL[d % TITLE_POOL.length]}`,
      raised: Math.random() > 0.6,
    }));
    return {
      id: uid('cmp'),
      projectId: project.id,
      url: `https://www.avito.ru/competitor_${i + 1}`,
      name,
      category: project.category,
      city: project.city,
      currentPrice: snapshots[snapshots.length - 1].price,
      raisesPerWeek: randInt(3, 12),
      lastChange: snapshots[snapshots.length - 1].date,
      snapshots,
    };
  });
}

export const DEMO_SUBSCRIPTION: Subscription = {
  plan: 'pro',
  renewsAt: daysAgoISO(-22),
  price: 2490,
  limits: {
    projects: 10,
    tests: 50,
    aiRequests: 500,
    competitors: 30,
  },
  used: {
    projects: 4,
    tests: 8,
    aiRequests: 134,
    competitors: 4,
  },
};
