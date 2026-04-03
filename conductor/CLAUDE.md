# conductor

Workflow orchestrator for flight505-harness. Reads workflow.yaml, sequences phases, manages Agent Teams, handles resume.

## Command

`/conductor:run [path]` — execute a workflow. Default path: `.harness/workflow.yaml`

## Skill

`/conductor:compose` — interactive workflow builder. The ONE interactive entry point.

## Phase Types

| Type | Execution | Conductor's Role |
|------|-----------|-----------------|
| `agent-teams` | Spawns N implementer teammates | IS the team lead — creates tasks, monitors, gates quality |
| `loop` | Spawns optimizer agent | Delegates — waits for agent to complete, reads state |
| `subagent` | Spawns one agent | Delegates — waits for result |
| `inline` | Executes directly | Runs commands/scripts itself |

**Key constraint:** Only one `agent-teams` phase at a time. Conductor IS the team lead.

## State Management

Conductor state: `.harness/conductor-{workflow_name}.json`
Phase states: `.harness/{plugin}-{run_id}.json` (written by plugin agents)

### Resume Protocol

1. Read existing conductor state
2. Skip `completed`/`skipped` phases
3. Retry `failed` or stale `running` phases
4. Execute `pending` phases normally

## Orchestration Flow

```
workflow.yaml → validate → check resume → execute phases sequentially
                                            ├─ agent-teams: create tasks → spawn teammates → monitor → review
                                            ├─ loop: spawn optimizer → wait → read output
                                            ├─ subagent: spawn agent → wait → read output
                                            └─ inline: execute command → capture output
```

## Condition Evaluation

- Expression: `phases.<id>.output.<field> <op> <value>`
- Operators: `>`, `<`, `>=`, `<=`, `==`, `!=`
- If condition is false, phase is `skipped`

## Config Interpolation

String values support `{phases.<id>.output.<field>}` replacement from completed phase outputs.

## Hook

**SessionStart** `inject-status` — shows workflow progress on session start/resume.

## No Agents

The conductor has no agents — it IS the orchestrator. It uses:
- `harness-build:implementer` agents (for agent-teams phases)
- `harness-build:reviewer` / `harness-build:code-reviewer` (for review subagent phases)
- `harness-optimize:optimizer` (for loop phases)
- `harness-research:*` agents (for research subagent phases)
- `harness-triage:*` agents (for triage subagent phases)
