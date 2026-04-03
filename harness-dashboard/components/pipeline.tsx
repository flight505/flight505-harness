"use client";

import { useState, useEffect } from "react";
import { PhaseCard } from "./phase-card";
import { MetricChart } from "./metric-chart";
import { ExperimentTable } from "./experiment-table";
import type { HarnessState, WorkflowSummary } from "@/lib/state";
import { cn } from "@/lib/cn";

function formatElapsed(seconds?: number): string {
  if (!seconds) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function Pipeline() {
  const [data, setData] = useState<WorkflowSummary | null>(null);
  const [selected, setSelected] = useState<HarnessState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch state");
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No harness state found. Run a workflow first:
        </p>
        <code className="mt-2 block font-mono text-xs text-muted-foreground">
          /conductor:run .harness/workflow.yaml
        </code>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-3 w-3 animate-pulse rounded-full bg-running" />
        Loading state...
      </div>
    );
  }

  const { conductor, phases } = data;

  return (
    <div className="space-y-6">
      {/* Conductor header */}
      {conductor && (
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-muted-foreground">
            workflow: {conductor.workflow_id}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              conductor.status === "completed" && "bg-success/20 text-success",
              conductor.status === "running" && "bg-running/20 text-running",
              conductor.status === "failed" &&
                "bg-destructive/20 text-destructive"
            )}
          >
            {conductor.status}
          </span>
          {conductor.progress && (
            <span className="text-xs text-muted-foreground">
              {conductor.progress.current}/{conductor.progress.total} phases
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatElapsed(conductor.elapsed_seconds)}
          </span>
        </div>
      )}

      {/* Phase cards */}
      {phases.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No phase state files found.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {phases
            .sort(
              (a, b) =>
                new Date(a.started_at).getTime() -
                new Date(b.started_at).getTime()
            )
            .map((phase) => (
              <PhaseCard
                key={phase.run_id}
                state={phase}
                onClick={() =>
                  setSelected(selected?.run_id === phase.run_id ? null : phase)
                }
              />
            ))}
        </div>
      )}

      {/* Expanded detail */}
      {selected && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm font-medium">
              {selected.phase_id} — {selected.plugin}
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              close
            </button>
          </div>

          {/* Optimize view */}
          {selected.metric && selected.metric.history && (
            <div className="space-y-4">
              <MetricChart
                history={selected.metric.history}
                direction={selected.metric.direction}
                metricName={selected.metric.name}
              />
              <ExperimentTable history={selected.metric.history} />
            </div>
          )}

          {/* Build view */}
          {selected.plugin === "harness-build" && selected.output && (() => {
            const out = selected.output as Record<string, string>;
            return (
              <div className="space-y-2 text-xs">
                {out.branch && (
                  <div>
                    <span className="text-muted-foreground">Branch: </span>
                    <span className="font-mono">{out.branch}</span>
                  </div>
                )}
                {out.review_verdict && (
                  <div>
                    <span className="text-muted-foreground">Review: </span>
                    <span
                      className={cn(
                        "font-mono",
                        out.review_verdict === "approve"
                          ? "text-success"
                          : "text-destructive"
                      )}
                    >
                      {out.review_verdict}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Raw output */}
          {selected.output &&
            Object.keys(selected.output).length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Raw output
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-muted/30 p-3 font-mono text-[10px] text-muted-foreground">
                  {JSON.stringify(selected.output, null, 2)}
                </pre>
              </details>
            )}

          {/* Error */}
          {selected.error && (
            <div className="rounded bg-destructive/10 p-3 text-xs text-destructive">
              {selected.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
