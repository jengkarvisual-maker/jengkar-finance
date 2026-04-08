"use client";

import {
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const CHART_COLORS = [
  "#355E3B",
  "#A76A4A",
  "#7F8C57",
  "#3B6C85",
  "#685B8C",
  "#9B6A5A",
  "#D4A373",
  "#5E8B7E",
];

type Point = {
  label: string;
  value?: number;
  omzet?: number;
  pengeluaran?: number;
  labaBersih?: number;
  cashFlow?: number;
};

type TooltipValue =
  | string
  | number
  | null
  | undefined
  | readonly (string | number)[];

function toNumber(value: TooltipValue): number {
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "number" && Number.isFinite(first)) {
      return first;
    }
    if (typeof first === "string") {
      const parsed = Number(first);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatTooltipValue(value: TooltipValue): string {
  return formatCurrency(toNumber(value));
}

function formatAxisCurrency(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value) || 0;
  return `${Math.round(amount / 1000000)} jt`;
}

export function TrendLineChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Point[];
}) {
  return (
    <Card className="border-border/70 bg-white/75">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="h-[320px] pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#E6DFC9" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={formatAxisCurrency}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            <Line
              type="monotone"
              dataKey="omzet"
              stroke="#355E3B"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="labaBersih"
              stroke="#A76A4A"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pengeluaran"
              stroke="#685B8C"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function BrandBarChart({
  title,
  description,
  data,
  color = "#355E3B",
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  return (
    <Card className="border-border/70 bg-white/75">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="h-[320px] pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#E6DFC9" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={formatAxisCurrency}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="value" fill={color} radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CompositionPieChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number }>;
}) {
  return (
    <Card className="border-border/70 bg-white/75">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="h-[320px] pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={76}
              outerRadius={112}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}