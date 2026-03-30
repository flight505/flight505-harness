"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MetricEntry } from "@/lib/state";

export function MetricChart({
  history,
  direction,
  metricName,
}: {
  history: MetricEntry[];
  direction: "lower" | "higher";
  metricName: string;
}) {
  if (!history || history.length === 0) return null;

  const baseline = history[0]?.value;
  const best = history.reduce(
    (acc, e) => {
      if (e.status === "baseline" || e.status === "kept") {
        if (direction === "lower" ? e.value < acc : e.value > acc) return e.value;
      }
      return acc;
    },
    direction === "lower" ? Infinity : -Infinity
  );

  const data = history.map((e) => ({
    experiment: e.experiment,
    value: e.value,
    status: e.status,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{metricName}</span>
        <span>
          {direction === "lower" ? "lower is better" : "higher is better"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis
            dataKey="experiment"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
          />
          {baseline != null && (
            <ReferenceLine
              y={baseline}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              label={{
                value: "baseline",
                position: "right",
                fill: "var(--color-muted-foreground)",
                fontSize: 10,
              }}
            />
          )}
          {best != null && isFinite(best) && (
            <ReferenceLine
              y={best}
              stroke="var(--color-success)"
              strokeDasharray="3 3"
              label={{
                value: "best",
                position: "right",
                fill: "var(--color-success)",
                fontSize: 10,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-running)"
            strokeWidth={2}
            dot={(props: Record<string, unknown>) => {
              const entry = data[props.index as number];
              if (!entry) return <circle key={props.index as number} />;
              const fill =
                entry.status === "kept"
                  ? "var(--color-success)"
                  : entry.status === "reverted"
                    ? "var(--color-destructive)"
                    : "var(--color-muted-foreground)";
              return (
                <circle
                  key={props.index as number}
                  cx={props.cx as number}
                  cy={props.cy as number}
                  r={3}
                  fill={fill}
                  stroke="none"
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
