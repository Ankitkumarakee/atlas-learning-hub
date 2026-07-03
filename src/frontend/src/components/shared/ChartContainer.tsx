import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
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
} from "recharts";

type ChartType = "area" | "line" | "bar" | "pie";

interface ChartContainerProps {
  title: string;
  description?: string;
  type: ChartType;
  data: Array<Record<string, unknown>>;
  /** X-axis data key. */
  xKey: string;
  /** Series config: each entry renders one Y series. */
  series: Array<{ key: string; name: string; color?: string }>;
  /** For pie charts: data key holding the value. */
  valueKey?: string;
  /** For pie charts: data key holding the label. */
  labelKey?: string;
  height?: number;
  className?: string;
  /** Stable marker id. */
  ocid?: string;
  /** Optional content rendered below the chart (legend, summary). */
  footer?: ReactNode;
}

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ChartContainer({
  title,
  description,
  type,
  data,
  xKey,
  series,
  valueKey,
  labelKey,
  height = 260,
  className,
  ocid,
  footer,
}: ChartContainerProps) {
  return (
    <Card className={cn("border-border/60", className)} data-ocid={ocid}>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart({ type, data, xKey, series, valueKey, labelKey })}
        </ResponsiveContainer>
        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}

function renderChart({
  type,
  data,
  xKey,
  series,
  valueKey,
  labelKey,
}: {
  type: ChartType;
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; name: string; color?: string }>;
  valueKey?: string;
  labelKey?: string;
}) {
  const grid = (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="var(--border)"
      vertical={false}
    />
  );
  const xAxis = (
    <XAxis
      dataKey={xKey}
      stroke="var(--muted-foreground)"
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={false}
    />
  );
  const yAxis = (
    <YAxis
      stroke="var(--muted-foreground)"
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={false}
    />
  );
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        color: "var(--foreground)",
        fontSize: "0.75rem",
      }}
    />
  );

  if (type === "area") {
    return (
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={s.key}
              id={`grad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={s.color ?? palette[i]}
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor={s.color ?? palette[i]}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? palette[i]}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    );
  }

  if (type === "line") {
    return (
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? palette[i]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    );
  }

  if (type === "bar") {
    return (
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color ?? palette[i]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    );
  }

  // pie
  const pieData = data.map((d) => ({
    name: String(d[labelKey ?? xKey]),
    value: Number(d[valueKey ?? series[0]?.key ?? "value"]),
  }));
  return (
    <PieChart>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        innerRadius={45}
        paddingAngle={2}
      >
        {pieData.map((_, i) => (
          <Cell key={`cell-${i}`} fill={palette[i % palette.length]} />
        ))}
      </Pie>
      {tooltip}
      <Legend wrapperStyle={{ fontSize: 12 }} />
    </PieChart>
  );
}
