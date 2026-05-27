export type ID = string;

export type Plan = 'free' | 'pro' | 'business';

export interface User {
  id: ID;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: Plan;
  createdAt: string;
  company?: string;
  phone?: string;
}

export interface Project {
  id: ID;
  name: string;
  category: string;
  description?: string;
  city?: string;
  createdAt: string;
  color: string;
}

export type TestType = 'title' | 'price' | 'photo' | 'text' | 'category' | 'time';
export type TestStatus = 'draft' | 'running' | 'finished';

export interface TestVariant {
  id: ID;
  testId: ID;
  label: 'A' | 'B';
  value: string;
  views: number;
  clicks: number;
  contacts: number;
  conversions: number;
  cost: number;
  revenue: number;
}

export interface ABTest {
  id: ID;
  projectId: ID;
  name: string;
  goal: string;
  type: TestType;
  status: TestStatus;
  startedAt: string;
  finishedAt?: string;
  variants: TestVariant[];
}

export interface AvitoStatRow {
  id: ID;
  projectId: ID;
  adId: string;
  title: string;
  category: string;
  price: number;
  date: string;
  views: number;
  contacts: number;
  favorites: number;
  cost: number;
  city?: string;
  photo?: string;
}

export interface Ad {
  id: ID;
  projectId: ID;
  title: string;
  category: string;
  city?: string;
  price: number;
  url?: string;
  publishedAt: string;
  photoUrl?: string;
  views: number;
  contacts: number;
  favorites: number;
  cost: number;
  status: 'active' | 'paused' | 'archived';
}

export type AIRecommendationType =
  | 'title'
  | 'text'
  | 'price'
  | 'photo'
  | 'category'
  | 'ctr';

export interface AIRecommendation {
  id: ID;
  type: AIRecommendationType;
  adId?: ID;
  projectId?: ID;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion: string;
  expectedLift?: number;
  createdAt: string;
}

export interface CompetitorSnapshot {
  date: string;
  price: number;
  title: string;
  raised: boolean;
}

export interface Competitor {
  id: ID;
  projectId: ID;
  url: string;
  name: string;
  category: string;
  city?: string;
  currentPrice: number;
  raisesPerWeek: number;
  lastChange: string;
  snapshots: CompetitorSnapshot[];
}

export interface Subscription {
  plan: Plan;
  renewsAt: string;
  price: number;
  limits: {
    projects: number;
    tests: number;
    aiRequests: number;
    competitors: number;
  };
  used: {
    projects: number;
    tests: number;
    aiRequests: number;
    competitors: number;
  };
}

export interface MetricSummary {
  views: number;
  clicks: number;
  ctr: number;
  contacts: number;
  conversion: number;
  cpa: number;
  cpc: number;
  cpl: number;
  roi: number;
  romi: number;
  revenuePerView: number;
  revenuePerContact: number;
  totalCost: number;
  totalRevenue: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface ToastMessage {
  id: ID;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info' | 'warning';
}
