"use client";

import { useId } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Dashboard chart primitives — thin, token-themed wrappers over Recharts.
 *
 * Colours are passed as CSS custom properties (e.g. `var(--color-primary)`) so
 * every chart tracks the design tokens and flips automatically in dark mode.
 * All are client-only (Recharts measures the DOM); parents give them a fixed
 * height via {@link ChartCard} so layout never shifts on hydration.
 */

/** A colour drawn from the design tokens — safe in light and dark themes. */
export const CHART_COLORS = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  primary700: "var(--color-primary-700)",
  accent600: "var(--color-accent-600)",
  info: "#3b82f6",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  teal: "#14b8a6",
} as const;

const GRID_STROKE = "var(--color-line)";
const AXIS_TICK = { fontSize: 12, fill: "var(--color-muted)" } as const;

/** Compact number for axis ticks, e.g. 486200 → "486k", 1_284 → "1.3k". */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

export interface ChartSeries {
  /** Key into each datum. */
  key: string;
  /** Legend/tooltip label. */
  label: string;
  /** A `CHART_COLORS` value or any CSS colour. */
  color: string;
  /** How to draw this series in a trend chart. Default "area". */
  type?: "area" | "line" | "bar";
  /** Which Y axis to bind to (dual-axis charts). Default "left". */
  axis?: "left" | "right";
  /** Formats this series' value in the tooltip. */
  format?: (value: number) => string;
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  series: ChartSeries[];
  labelFormatter?: (label: string | number) => string;
}

/** Shared token-styled tooltip used across every dashboard chart. */
function ChartTooltip({
  active,
  label,
  payload,
  series,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-field border border-line bg-surface px-3 py-2 shadow-card">
      {label != null && (
        <p className="mb-1 text-xs font-medium text-muted">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => {
          const meta = series.find(
            (s) => s.key === entry.dataKey || s.key === entry.name,
          );
          if (!meta) return null;
          const raw = typeof entry.value === "number" ? entry.value : Number(entry.value);
          return (
            <li key={meta.key} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden="true"
              />
              <span className="text-body">{meta.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-ink">
                {meta.format ? meta.format(raw) : raw.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface TrendChartProps<T extends object> {
  data: T[];
  /** Key for the X axis (category/time). */
  xKey: string;
  series: ChartSeries[];
  height?: number;
  xTickFormatter?: (value: string | number) => string;
  leftTickFormatter?: (value: number) => string;
  rightTickFormatter?: (value: number) => string;
  /** Show a right-hand Y axis (needed when a series sets `axis: "right"`). */
  dualAxis?: boolean;
  labelFormatter?: (label: string | number) => string;
}

/**
 * TrendChart — a composed time-series chart. Each series draws as an area, line
 * or bar and can bind to a left or right axis, so it serves single-series area
 * trends as well as dual-axis "revenue + bookings" style panels.
 */
export function TrendChart<T extends object>({
  data,
  xKey,
  series,
  height = 260,
  xTickFormatter,
  leftTickFormatter = compactNumber,
  rightTickFormatter = compactNumber,
  dualAxis = false,
  labelFormatter,
}: TrendChartProps<T>) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: dualAxis ? 4 : 8, left: -8, bottom: 0 }}>
        <defs>
          {series
            .filter((s) => (s.type ?? "area") === "area")
            .map((s) => (
              <linearGradient
                key={s.key}
                id={`${gradientId}-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={s.color} stopOpacity={0.26} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          tickMargin={8}
          tickFormatter={xTickFormatter}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          width={48}
          tickFormatter={leftTickFormatter}
        />
        {dualAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            width={40}
            tickFormatter={rightTickFormatter}
          />
        )}
        <Tooltip
          cursor={{ stroke: GRID_STROKE, strokeWidth: 1 }}
          content={<ChartTooltip series={series} labelFormatter={labelFormatter} />}
        />
        {series.map((s) => {
          const type = s.type ?? "area";
          const axisId = s.axis ?? "left";
          if (type === "line") {
            return (
              <Line
                key={s.key}
                yAxisId={axisId}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            );
          }
          if (type === "bar") {
            return (
              <Bar
                key={s.key}
                yAxisId={axisId}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            );
          }
          return (
            <Area
              key={s.key}
              yAxisId={axisId}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              fill={`url(#${gradientId}-${s.key})`}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface CategoryBarChartProps<T extends object> {
  data: T[];
  /** Category label key. */
  xKey: string;
  /** Value key. */
  valueKey: string;
  color?: string;
  height?: number;
  /** Render bars horizontally (good for long category names). */
  horizontal?: boolean;
  valueFormatter?: (value: number) => string;
  label?: string;
}

/** CategoryBarChart — a single-series bar chart for breakdowns by category. */
export function CategoryBarChart<T extends object>({
  data,
  xKey,
  valueKey,
  color = CHART_COLORS.primary,
  height = 260,
  horizontal = false,
  valueFormatter,
  label = "Value",
}: CategoryBarChartProps<T>) {
  const series: ChartSeries[] = [
    { key: valueKey, label, color, type: "bar", format: valueFormatter },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 8, left: horizontal ? 8 : -8, bottom: 0 }}
      >
        <CartesianGrid
          horizontal={!horizontal}
          vertical={horizontal}
          stroke={GRID_STROKE}
          strokeDasharray="3 3"
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              tickFormatter={compactNumber}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              width={110}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              width={48}
              tickFormatter={compactNumber}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--color-surface-muted)" }}
          content={<ChartTooltip series={series} />}
        />
        <Bar dataKey={valueKey} name={label} fill={color} radius={4} maxBarSize={34} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  height?: number;
  valueFormatter?: (value: number) => string;
  /** Big number rendered in the ring's centre. */
  centerValue?: string;
  centerLabel?: string;
}

/** DonutChart — a labelled ring for share/composition breakdowns. */
export function DonutChart({
  data,
  height = 260,
  valueFormatter,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const series: ChartSeries[] = data.map((d) => ({
    key: d.name,
    label: d.name,
    color: d.color,
    format: valueFormatter,
  }));
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--color-surface)"
            strokeWidth={2}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip series={series} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <span className="text-2xl font-bold text-ink">{centerValue}</span>
          )}
          {centerLabel && <span className="text-xs text-muted">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
