import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export type PhaseStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export interface MetricEntry {
  experiment: number;
  value: number;
  status: "baseline" | "kept" | "reverted";
  description?: string;
}

export interface HarnessState {
  schema: "harness/v1";
  workflow_id: string;
  phase_id: string;
  plugin: string;
  run_id: string;
  status: PhaseStatus;
  started_at: string;
  updated_at: string;
  elapsed_seconds?: number;
  progress?: {
    current: number;
    total: number;
    unit: string;
  };
  metric?: {
    name: string;
    direction: "lower" | "higher";
    baseline: number | null;
    current: number | null;
    best: number | null;
    history?: MetricEntry[];
  };
  output?: Record<string, unknown>;
  error?: { message: string; code?: string } | null;
  config?: Record<string, unknown>;
}

export interface WorkflowSummary {
  conductor: HarnessState | null;
  phases: HarnessState[];
  workflow_path: string | null;
}

const DEFAULT_HARNESS_DIR = join(process.cwd(), "..", ".harness");

export function getHarnessDir(): string {
  const envDir = process.env.HARNESS_STATE_DIR;
  if (envDir && existsSync(envDir)) return envDir;
  if (existsSync(DEFAULT_HARNESS_DIR)) return DEFAULT_HARNESS_DIR;
  return DEFAULT_HARNESS_DIR;
}

export function readAllStates(): HarnessState[] {
  const dir = getHarnessDir();
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const states: HarnessState[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.schema === "harness/v1") {
        states.push(parsed);
      }
    } catch {
      // skip invalid files
    }
  }

  return states;
}

export function getWorkflowSummary(): WorkflowSummary {
  const states = readAllStates();
  const conductor = states.find((s) => s.plugin === "conductor") ?? null;
  const phases = states.filter((s) => s.plugin !== "conductor");

  const dir = getHarnessDir();
  const workflowPath = existsSync(join(dir, "workflow.yaml"))
    ? join(dir, "workflow.yaml")
    : null;

  return { conductor, phases, workflow_path: workflowPath };
}
