import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number;
  previousValue?: number;
  hint?: string;
  compact?: boolean;
};

export function MetricCard({
  label,
  value,
  previousValue,
  hint,
  compact = false,
}: MetricCardProps) {
  const delta =
    previousValue && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

  return (
    <Card className="border-border/70 bg-white/75">
      <CardHeader className="space-y-3">
        <div className="metric-chip">{label}</div>
        <CardTitle className="text-3xl">
          {compact ? formatCompactCurrency(value) : formatCurrency(value)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">{hint ?? "Periode berjalan"}</p>
        {delta !== undefined ? (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${
              delta > 0
                ? "bg-emerald-50 text-emerald-700"
                : delta < 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : delta < 0 ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span>{delta.toFixed(1)}%</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
