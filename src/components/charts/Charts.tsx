import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '@/store/theme';

type SeriesPoint = Record<string, unknown>;

interface BaseProps {
  data: SeriesPoint[];
  xKey?: string;
  height?: number;
}

function gridColor(theme: string) {
  return theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,22,38,0.08)';
}

function axisColor(theme: string) {
  return theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(15,22,38,0.6)';
}

interface SeriesDef {
  key: string;
  name: string;
  color: string;
}

export function AreaTrendChart({
  data,
  series,
  xKey = 'date',
  height = 280,
  formatY,
}: BaseProps & { series: SeriesDef[]; formatY?: (v: number) => string }) {
  const { theme } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={gridColor(theme)} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={axisColor(theme)}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={axisColor(theme)}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (formatY ? formatY(v) : Intl.NumberFormat('ru-RU', { notation: 'compact' }).format(v))}
          width={48}
        />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrendChart({
  data,
  series,
  xKey = 'date',
  height = 280,
  formatY,
}: BaseProps & { series: SeriesDef[]; formatY?: (v: number) => string }) {
  const { theme } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={gridColor(theme)} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={axisColor(theme)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          stroke={axisColor(theme)}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (formatY ? formatY(v) : v)}
          width={48}
        />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({
  data,
  series,
  xKey = 'name',
  height = 280,
  formatY,
  layout = 'horizontal',
}: BaseProps & {
  series: SeriesDef[];
  formatY?: (v: number) => string;
  layout?: 'horizontal' | 'vertical';
}) {
  const { theme } = useTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 10, right: 16, left: layout === 'vertical' ? 80 : 0, bottom: 0 }}
      >
        <CartesianGrid stroke={gridColor(theme)} strokeDasharray="3 3" vertical={false} />
        {layout === 'vertical' ? (
          <>
            <XAxis type="number" stroke={axisColor(theme)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis dataKey={xKey} type="category" stroke={axisColor(theme)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} stroke={axisColor(theme)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke={axisColor(theme)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatY} width={48} />
          </>
        )}
        <Tooltip cursor={{ fill: gridColor(theme) }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export function DonutChart({ data, height = 260 }: { data: PieDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={2}
          stroke="transparent"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
