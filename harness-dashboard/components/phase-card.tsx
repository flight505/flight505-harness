"use client";

import { cn } from "@/lib/cn";
import type { HarnessState, PhaseStatus } from "@/lib/state";

const statusColors: Record<PhaseStatus, string> = {
  pending: "bg-pending/20 text-pending",
  running: "bg-running/20 text-running",
  completed: "bg-success/20 text-success",
  failed: "bg-destructive/20 text-destructive",
  skipped: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const statusDot: Record<PhaseStatus, string> = {
  pending: "bg-pending",
  running: "bg-running animate-pulse",
  completed: "bg-success",
  failed: "bg-destructive",
  skipped: "bg-muted-foreground",
  cancelled: "bg-muted-foreground",
};

function formatElapsed(seconds?: number): string {
  if (!seconds) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function PhaseCard({
  state,
  onClick,
}: {
  state: HarnessState;
  onClick?: () => void;
}) {
  const progress = state.progress;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-64 flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50",
        state.status === "running" && "border-running/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          {state.plugin}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            statusColors[state.status]
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", statusDot[state.status])}
          />
          {state.status}
        </span>
      </div>

      <h3 className="text-sm font-medium">{state.phase_id}</h3>

      {progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {progress.current}/{progress.total} {progress.unit}
            </span>
            {pct !== null && <span>{pct}%</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-running transition-all"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {state.metric && (
        <div className="text-xs text-muted-foreground">
          {state.metric.name}: {state.metric.current ?? "—"}{" "}
          {state.metric.best != null && (
            <span className="text-success">(best: {state.metric.best})</span>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {formatElapsed(state.elapsed_seconds)}
      </div>

      {state.error && (
        <div className="truncate text-xs text-destructive">
          {state.error.message}
        </div>
      )}
    </button>
  );
}
