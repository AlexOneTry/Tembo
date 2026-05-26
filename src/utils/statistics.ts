import type { TestVariant } from '@/types';

function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface ConversionTest {
  conversions: number;
  visitors: number;
}

export interface TestResult {
  uplift: number;
  confidence: number;
  significant: boolean;
  winner: 'A' | 'B' | null;
  pValue: number;
}

/**
 * Two-proportion z-test comparing conversion rates between variant A and B.
 * Returns confidence (0..1), uplift relative to A and significance at 95%.
 */
export function compareConversionRates(a: ConversionTest, b: ConversionTest): TestResult {
  const pA = a.visitors > 0 ? a.conversions / a.visitors : 0;
  const pB = b.visitors > 0 ? b.conversions / b.visitors : 0;
  const pooled =
    (a.conversions + b.conversions) / Math.max(1, a.visitors + b.visitors);
  const se = Math.sqrt(
    pooled * (1 - pooled) * (1 / Math.max(1, a.visitors) + 1 / Math.max(1, b.visitors))
  );
  const z = se > 0 ? (pB - pA) / se : 0;
  const confidence = 2 * Math.abs(normalCdf(z) - 0.5);
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const uplift = pA > 0 ? (pB - pA) / pA : 0;
  return {
    uplift,
    confidence,
    significant: confidence >= 0.95 && a.visitors >= 100 && b.visitors >= 100,
    winner: pB > pA ? 'B' : pB < pA ? 'A' : null,
    pValue,
  };
}

export function variantCtr(v: TestVariant): number {
  return v.views > 0 ? (v.clicks / v.views) * 100 : 0;
}

export function variantConversion(v: TestVariant): number {
  return v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0;
}

export function variantCpa(v: TestVariant): number {
  return v.conversions > 0 ? v.cost / v.conversions : 0;
}

export function variantRoi(v: TestVariant): number {
  return v.cost > 0 ? ((v.revenue - v.cost) / v.cost) * 100 : 0;
}

export interface VariantComparison {
  ctr: TestResult;
  conversion: TestResult;
  cpa: { winner: 'A' | 'B' | null; improvement: number };
  bestVariant: 'A' | 'B' | null;
  confidence: number;
}

export function compareVariants(a: TestVariant, b: TestVariant): VariantComparison {
  const ctr = compareConversionRates(
    { conversions: a.clicks, visitors: a.views },
    { conversions: b.clicks, visitors: b.views }
  );
  const conversion = compareConversionRates(
    { conversions: a.conversions, visitors: Math.max(1, a.clicks) },
    { conversions: b.conversions, visitors: Math.max(1, b.clicks) }
  );

  const cpaA = variantCpa(a);
  const cpaB = variantCpa(b);
  const cpaWinner: 'A' | 'B' | null =
    cpaA === 0 && cpaB === 0 ? null : cpaA === 0 ? 'B' : cpaB === 0 ? 'A' : cpaA < cpaB ? 'A' : 'B';
  const cpaImprovement =
    cpaA && cpaB ? Math.abs(cpaA - cpaB) / Math.max(cpaA, cpaB) : 0;

  let score = 0;
  if (ctr.winner === 'B') score++;
  if (ctr.winner === 'A') score--;
  if (conversion.winner === 'B') score++;
  if (conversion.winner === 'A') score--;
  if (cpaWinner === 'B') score++;
  if (cpaWinner === 'A') score--;

  const bestVariant: 'A' | 'B' | null = score > 0 ? 'B' : score < 0 ? 'A' : null;
  const confidence = Math.max(ctr.confidence, conversion.confidence);

  return { ctr, conversion, cpa: { winner: cpaWinner, improvement: cpaImprovement }, bestVariant, confidence };
}
