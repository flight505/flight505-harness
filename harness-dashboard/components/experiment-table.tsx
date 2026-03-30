"use client";

import { cn } from "@/lib/cn";
import type { MetricEntry } from "@/lib/state";

export function ExperimentTable({ history }: { history: MetricEntry[] }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2 text-left font-mono font-medium text-muted-foreground">
              #
            </th>
            <th className="px-3 py-2 text-left font-mono font-medium text-muted-foreground">
              Value
            </th>
            <th className="px-3 py-2 text-left font-mono font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-2 text-left font-mono font-medium text-muted-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr
              key={entry.experiment}
              className="border-b border-border last:border-0"
            >
              <td className="px-3 py-1.5 font-mono text-muted-foreground">
                {entry.experiment}
              </td>
              <td className="px-3 py-1.5 font-mono">{entry.value}</td>
              <td className="px-3 py-1.5">
                <span
                  className={cn(
                    "inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-medium",
                    entry.status === "kept" && "bg-success/20 text-success",
                    entry.status === "reverted" &&
                      "bg-destructive/20 text-destructive",
                    entry.status === "baseline" && "bg-muted text-muted-foreground"
                  )}
                >
                  {entry.status}
                </span>
              </td>
              <td className="max-w-xs truncate px-3 py-1.5 text-muted-foreground">
                {entry.description ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
