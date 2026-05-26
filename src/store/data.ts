import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ABTest,
  Ad,
  AIRecommendation,
  AvitoStatRow,
  Competitor,
  DateRange,
  Project,
  Subscription,
  TestVariant,
} from '@/types';
import {
  DEMO_SUBSCRIPTION,
  generateAds,
  generateAvitoStats,
  generateCompetitors,
  generateProjects,
  generateRecommendations,
  generateTests,
  uid,
} from '@/utils/mock';

interface Filters {
  projectId: string | 'all';
  category: string | 'all';
  range: DateRange;
}

interface DataState {
  initialized: boolean;
  projects: Project[];
  tests: ABTest[];
  ads: Ad[];
  stats: AvitoStatRow[];
  recommendations: AIRecommendation[];
  competitors: Competitor[];
  subscription: Subscription;
  filters: Filters;

  initialize: () => void;
  resetDemo: () => void;

  // Projects
  addProject: (input: Omit<Project, 'id' | 'createdAt' | 'color'>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tests
  createTest: (input: Omit<ABTest, 'id' | 'variants' | 'startedAt' | 'status'> & {
    variantA: string;
    variantB: string;
  }) => ABTest;
  updateTestStatus: (id: string, status: ABTest['status']) => void;
  updateVariant: (testId: string, variantId: string, patch: Partial<TestVariant>) => void;
  deleteTest: (id: string) => void;

  // Stats / import
  appendStats: (rows: AvitoStatRow[]) => void;
  clearStats: (projectId?: string) => void;

  // Ads
  addAd: (ad: Omit<Ad, 'id'>) => Ad;
  updateAd: (id: string, patch: Partial<Ad>) => void;

  // Recommendations
  addRecommendations: (recs: AIRecommendation[]) => void;
  dismissRecommendation: (id: string) => void;

  // Competitors
  addCompetitor: (
    input: Omit<Competitor, 'id' | 'snapshots' | 'currentPrice' | 'lastChange' | 'raisesPerWeek'> & {
      currentPrice?: number;
    }
  ) => Competitor;
  removeCompetitor: (id: string) => void;

  // Filters
  setFilter: (patch: Partial<Filters>) => void;
}

function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString(), to: to.toISOString() };
}

const PROJECT_COLORS = [
  '#5b88ff',
  '#84cc16',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
];

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      initialized: false,
      projects: [],
      tests: [],
      ads: [],
      stats: [],
      recommendations: [],
      competitors: [],
      subscription: DEMO_SUBSCRIPTION,
      filters: { projectId: 'all', category: 'all', range: defaultRange() },

      initialize: () => {
        if (get().initialized) return;
        const projects = generateProjects();
        const tests = generateTests(projects);
        const ads = generateAds(projects);
        const stats = generateAvitoStats(projects);
        const recommendations = generateRecommendations();
        const competitors = generateCompetitors(projects);
        set({
          projects,
          tests,
          ads,
          stats,
          recommendations,
          competitors,
          initialized: true,
        });
      },
      resetDemo: () => {
        set({ initialized: false });
        get().initialize();
      },

      addProject: (input) => {
        const project: Project = {
          ...input,
          id: uid('prj'),
          createdAt: new Date().toISOString(),
          color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tests: s.tests.filter((t) => t.projectId !== id),
          ads: s.ads.filter((a) => a.projectId !== id),
          stats: s.stats.filter((r) => r.projectId !== id),
          competitors: s.competitors.filter((c) => c.projectId !== id),
        })),

      createTest: (input) => {
        const id = uid('tst');
        const test: ABTest = {
          id,
          projectId: input.projectId,
          name: input.name,
          goal: input.goal,
          type: input.type,
          status: 'running',
          startedAt: new Date().toISOString(),
          variants: [
            {
              id: uid('var'),
              testId: id,
              label: 'A',
              value: input.variantA,
              views: 0,
              clicks: 0,
              contacts: 0,
              conversions: 0,
              cost: 0,
              revenue: 0,
            },
            {
              id: uid('var'),
              testId: id,
              label: 'B',
              value: input.variantB,
              views: 0,
              clicks: 0,
              contacts: 0,
              conversions: 0,
              cost: 0,
              revenue: 0,
            },
          ],
        };
        set((s) => ({ tests: [test, ...s.tests] }));
        return test;
      },
      updateTestStatus: (id, status) =>
        set((s) => ({
          tests: s.tests.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  finishedAt: status === 'finished' ? new Date().toISOString() : t.finishedAt,
                }
              : t
          ),
        })),
      updateVariant: (testId, variantId, patch) =>
        set((s) => ({
          tests: s.tests.map((t) =>
            t.id === testId
              ? {
                  ...t,
                  variants: t.variants.map((v) =>
                    v.id === variantId ? { ...v, ...patch } : v
                  ),
                }
              : t
          ),
        })),
      deleteTest: (id) =>
        set((s) => ({ tests: s.tests.filter((t) => t.id !== id) })),

      appendStats: (rows) => set((s) => ({ stats: [...rows, ...s.stats] })),
      clearStats: (projectId) =>
        set((s) => ({
          stats: projectId ? s.stats.filter((r) => r.projectId !== projectId) : [],
        })),

      addAd: (ad) => {
        const created: Ad = { ...ad, id: uid('ad') };
        set((s) => ({ ads: [created, ...s.ads] }));
        return created;
      },
      updateAd: (id, patch) =>
        set((s) => ({ ads: s.ads.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      addRecommendations: (recs) =>
        set((s) => ({ recommendations: [...recs, ...s.recommendations] })),
      dismissRecommendation: (id) =>
        set((s) => ({
          recommendations: s.recommendations.filter((r) => r.id !== id),
        })),

      addCompetitor: (input) => {
        const now = new Date().toISOString();
        const price = input.currentPrice ?? 0;
        const cmp: Competitor = {
          id: uid('cmp'),
          projectId: input.projectId,
          url: input.url,
          name: input.name,
          category: input.category,
          city: input.city,
          currentPrice: price,
          lastChange: now,
          raisesPerWeek: 0,
          snapshots: [{ date: now, price, title: input.name, raised: false }],
        };
        set((s) => ({ competitors: [cmp, ...s.competitors] }));
        return cmp;
      },
      removeCompetitor: (id) =>
        set((s) => ({ competitors: s.competitors.filter((c) => c.id !== id) })),

      setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
    }),
    {
      name: 'avb_data',
      partialize: (state) => ({
        initialized: state.initialized,
        projects: state.projects,
        tests: state.tests,
        ads: state.ads,
        stats: state.stats,
        recommendations: state.recommendations,
        competitors: state.competitors,
        subscription: state.subscription,
      }),
    }
  )
);

export function applyFilters<T extends { projectId?: string; category?: string; date?: string; publishedAt?: string }>(
  items: T[],
  filters: Filters
): T[] {
  const fromMs = new Date(filters.range.from).getTime();
  const toMs = new Date(filters.range.to).getTime();
  return items.filter((it) => {
    if (filters.projectId !== 'all' && it.projectId && it.projectId !== filters.projectId) return false;
    if (filters.category !== 'all' && it.category && it.category !== filters.category) return false;
    const ts = it.date ?? it.publishedAt;
    if (ts) {
      const t = new Date(ts).getTime();
      if (t < fromMs || t > toMs) return false;
    }
    return true;
  });
}
