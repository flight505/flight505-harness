---
description: "Run a harness workflow — validates workflow.yaml, checks for resume state, executes phases sequentially. Handles agent-teams, loop, subagent, and inline phase types."
argument-hint: "[path/to/workflow.yaml]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent", "TaskCreate", "TaskUpdate", "TaskList", "TaskGet", "SendMessage"]
---

# Conductor: Run Workflow

You are the conductor — the central orchestrator for harness workflows. You read a workflow.yaml, sequence phases, delegate to harness plugins, and write state. You never ask the user questions during execution — you work headlessly from the workflow definition.

## 1. Load Workflow

```bash
WORKFLOW_PATH="${1:-.claude/harness/workflow.yaml}"
cat "$WORKFLOW_PATH"
```

If `$ARGUMENTS` provides a path, use it. Otherwise default to `.claude/harness/workflow.yaml`.

If the file doesn't exist, stop with: "No workflow found at `<path>`. Create one with `/conductor:compose` or place a workflow.yaml at `.claude/harness/workflow.yaml`."

## 2. Validate Workflow

Parse the YAML. Verify:
- `name` exists and is lowercase with hyphens only
- `phases` is a non-empty array
- Each phase has `id`, `plugin`, `type`
- `type` is one of: `agent-teams`, `loop`, `subagent`, `inline`
- `depends_on` references valid phase IDs (no cycles, no forward refs to unsequenced phases)
- `condition` expressions reference valid `phases.<id>.output.<field>` paths
- Plugin-specific required config fields are present (e.g., `artifact` for harness-optimize)

If validation fails, report all errors and stop.

## 3. Check for Resume State

```bash
ls -la .claude/harness/conductor-*.json 2>/dev/null
```

If a conductor state file exists for this workflow:
1. Read it
2. For each phase in the workflow:
   - `completed` or `skipped` → skip (log: "Phase `<id>` already completed, skipping")
   - `failed` → log the error, then **retry** the phase from scratch
   - `running` (stale — session died) → treat as failed, retry
   - `pending` → execute normally
3. Resume from the first non-completed phase

If no state file exists, this is a fresh run. Create the conductor state:

```bash
mkdir -p .claude/harness
```

Write `.claude/harness/conductor-{workflow_name}.json`:

```json
{
  "schema": "harness/v1",
  "workflow_id": "<name from workflow>",
  "phase_id": "conductor",
  "plugin": "conductor",
  "run_id": "conductor-<name>",
  "status": "running",
  "started_at": "<ISO 8601 now>",
  "updated_at": "<ISO 8601 now>",
  "elapsed_seconds": 0,
  "progress": {
    "current": 0,
    "total": <number of phases>,
    "unit": "phases"
  },
  "output": {
    "phases": {}
  },
  "error": null,
  "config": {
    "workflow_path": "<path>",
    "workflow_name": "<name>"
  }
}
```

## 4. Execute Phases

Process phases in order. For each phase:

### 4a. Check dependencies

If `depends_on` is set, verify all listed phases have `completed` status. If any dependency is `failed` or `skipped`, skip this phase too.

### 4b. Evaluate condition

If `condition` is set, evaluate it against completed phase outputs:
- Parse: `phases.<id>.output.<field> <op> <value>`
- Operators: `>`, `<`, `>=`, `<=`, `==`, `!=`
- If condition is false, skip the phase (set status to `skipped`)

### 4c. Resolve config interpolation

Replace `{phases.<id>.output.<field>}` in config string values with actual values from completed phases.

### 4d. Merge defaults

Merge `defaults` from workflow into phase config (phase config takes precedence).

### 4e. Execute by type

---

#### Phase Type: `agent-teams`

This is for parallel feature building via harness-build.

1. Generate a unique `run_id` for this phase
2. Write initial phase state to `.claude/harness/build-{run_id}.json` with `status: "running"`
3. Read tasks from `config.tasks` (inline) or `config.tasks_from` (file path)
4. Create a git branch: `git checkout -b <config.branch>`
5. For each task, create a Claude Code Task via TaskCreate:
   - Subject: `[<task.id>] <task.title>`
   - Description: task description + acceptance criteria + quality commands from defaults
6. Spawn implementer teammates using the Agent tool:
   - Up to `config.max_teammates` teammates
   - Each teammate is a `harness-build:implementer` agent
   - Teammates claim tasks via TaskList, implement with TDD, commit
7. Monitor: check TaskList periodically until all tasks are `completed`
8. After all tasks complete, if `config.code_review` is true:
   - Spawn `harness-build:reviewer` as a subagent (spec compliance review)
   - If reviewer approves and code_review is configured, spawn `harness-build:code-reviewer`
9. Update phase state with output:
   ```json
   {
     "branch": "<branch>",
     "stories_completed": N,
     "stories_total": N,
     "commits": ["sha1", "sha2"],
     "files_changed": ["file1", "file2"],
     "review_verdict": "approve|reject",
     "code_review_verdict": "approve|reject"
   }
   ```
10. Set phase status to `completed` (or `failed` if review rejects)

**Key constraint:** You (the conductor) ARE the team lead during agent-teams phases. Only one agent-teams phase can run at a time.

---

#### Phase Type: `loop`

This is for optimization via harness-optimize.

1. Generate a unique `run_id`
2. Spawn the `harness-optimize:optimizer` agent with config:
   ```
   artifact, metric, direction, run_command, time_budget,
   max_experiments, convergence_window, target, ssh_host, cwd,
   workflow_id, phase_id, run_id
   ```
3. The optimizer agent runs autonomously and writes its own state to `.claude/harness/optimize-{run_id}.json`
4. Wait for the optimizer to finish (it will set status to `completed` or `failed`)
5. Read the optimizer's final state to get output
6. Copy output to the conductor's phase record

---

#### Phase Type: `subagent`

This is for bounded single-agent work (review, research, analysis).

1. Generate a unique `run_id`
2. Write initial phase state
3. Determine which agent to spawn:
   - If `config.agent` is set, use `<plugin>:<agent>` (e.g., `harness-build:reviewer`)
   - Otherwise, use the plugin's default agent
4. Spawn the agent with the phase config as input
5. Wait for agent to return
6. Write the agent's output to phase state
7. Set status to `completed`

---

#### Phase Type: `inline`

This is for simple tasks the conductor executes directly.

1. Write initial phase state
2. Execute the inline config:
   - If `config.command` is set, run it via Bash
   - If `config.script` is set, run the script
   - If `config.message` is set, output it (for reporting/logging)
3. Capture output
4. Write phase state with output
5. Set status to `completed`

---

### 4f. Update conductor state

After each phase completes (or fails/skips):
1. Update `.claude/harness/conductor-{workflow_name}.json`:
   - Increment `progress.current`
   - Add phase result to `output.phases.<phase_id>`
   - Update `updated_at` and `elapsed_seconds`
2. If phase failed and is not the last phase, log the failure and continue to next phase only if it doesn't depend on the failed phase

## 5. Finalize

When all phases are processed:

1. Set conductor status to `completed` (or `failed` if any required phase failed)
2. Write final output summary:
   ```json
   {
     "phases": {
       "<phase_id>": { "status": "completed", "output": {...} },
       "<phase_id>": { "status": "skipped", "reason": "condition not met" }
     },
     "total_elapsed_seconds": N,
     "phases_completed": N,
     "phases_failed": N,
     "phases_skipped": N
   }
   ```
3. Output a final summary to the conversation:
   ```
   ## Workflow Complete: <name>
   - Phases: N completed, N skipped, N failed
   - Duration: Xm Ys
   - Results: <brief summary of key outputs>
   ```

## Error Handling

- **Phase fails:** Log error in phase state, set status to `failed`. Continue to next phase unless it depends on the failed phase.
- **Agent crashes:** If an agent doesn't return, check its state file. If stale `running`, treat as failed.
- **Session dies:** On resume, the conductor reads existing state and picks up where it left off (step 3).
- **Invalid workflow:** Report all validation errors upfront, don't start execution.

## Constraints

- **Never ask questions** — work from the workflow definition
- **Always write state** — the dashboard and future resumes depend on fresh state files
- **One agent-teams at a time** — you are the team lead, cannot delegate yourself
- **Sequential phases** — phases execute in order, respecting depends_on
- **Idempotent resume** — re-running after a crash should pick up cleanly

$ARGUMENTS
