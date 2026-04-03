# harness-build

Headless parallel feature builder. Forked from SDK Bridge, stripped of wizard UX.

Self-contained — no dependency on the standalone SDK Bridge plugin.

## Agents

| Agent | Role | Model | Purpose |
|-------|------|-------|---------|
| `implementer` | teammate | inherit | Claim tasks, TDD, commit |
| `reviewer` | subagent | haiku | Full-branch spec compliance review |
| `code-reviewer` | subagent | sonnet | Full-branch code quality review |

## No Commands or Skills

harness-build is purely agent-driven. The conductor creates tasks and spawns teammates.

## State Output

Writes to `.harness/build-{run_id}.json` following `schema/state-v1.schema.json`.

Output includes: branch, stories completed/total, commits, files changed, review verdicts.

## Hooks

| Event | Script | Purpose |
|-------|--------|---------|
| `TaskCreated` | `validate-task-name.sh` | Enforces `[XX-NNN]: Title` naming |
| `TaskCompleted` | `validate-task.sh` | Runs test/build/typecheck from state config |
| `TeammateIdle` | `check-idle.sh` | Blocks idle if tasks remain |

## Workflow Config

```yaml
- id: build
  plugin: harness-build
  type: agent-teams
  config:
    branch: "feat/new-api"
    max_teammates: 3
    code_review: true
    tasks:
      - id: "US-001"
        title: "Set up project structure"
        description: "As a developer, I want..."
        criteria:
          - "package.json has express dependency"
```

## Differences from Standalone SDK Bridge

| SDK Bridge (`/sdk-bridge:start`) | harness-build |
|---|---|
| Interactive 6-checkpoint wizard | No commands, no interaction |
| PRD generator + converter skills | Tasks come pre-structured from workflow |
| prd.json as source of truth | Task list + state contract |
| progress.jsonl for patterns | State contract only |
| Plugin-specific resume | Conductor handles resume |
| AskUserQuestion for decisions | No questions — works from config |

## What Stays the Same

- Implementer TDD discipline (RED-GREEN-REFACTOR)
- TaskCompleted validation hook (test/build/typecheck gate)
- TeammateIdle prevention hook
- Two-stage post-completion review (spec + code quality)
- Adversarial code reviewer with structured issue taxonomy
