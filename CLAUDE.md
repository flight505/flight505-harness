# flight505-harness

Composable harness engineering for Claude Code. 5 plugins as git submodules, webhook-driven auto-updates.

**Repository:** https://github.com/flight505/flight505-harness

---

## Design Principles

- **Headless first** — no AskUserQuestion, no wizards. Config in, state out.
- **Self-contained** — no cross-marketplace dependencies. Never needs flight505-plugins.
- **Shared state contract** — every plugin writes JSON to `.claude/harness/` following `schema/state-v1.schema.json`
- **Single-session orchestration** — conductor runs as team lead in one Claude Code session
- **Resume from state** — phases write checkpoints; sessions can crash and restart

---

## Plugin Structure

```
flight505-harness/
├── conductor/             # Workflow orchestrator — sequences phases, manages Agent Teams
├── harness-build/         # Headless parallel feature builder (from SDK Bridge)
├── harness-optimize/      # Keep/revert optimization loop (from autoresearch)
├── harness-research/      # Literature search + synthesis (from ai-frontier)
├── harness-triage/        # Issue diagnosis + auto-fix (new)
├── harness-dashboard/     # Next.js monitoring app (not a plugin)
└── schema/                # Shared JSON schemas
    ├── state-v1.schema.json
    └── workflow-v1.schema.json
```

**Each plugin has:** `CLAUDE.md`, `.claude-plugin/plugin.json`, `agents/`, optionally `hooks/`, `skills/`, `scripts/`

---

## Orchestration Model

The conductor reads `workflow.yaml` and runs phases sequentially:

| Phase Type | Execution Model | Use When |
|------------|----------------|----------|
| `agent-teams` | Conductor spawns N teammates | Parallel work: multiple stories |
| `loop` | Conductor runs keep/revert inline | Optimization: edit → measure → keep/revert |
| `subagent` | Conductor spawns one subagent | Review, research, analysis |
| `inline` | Conductor executes directly | Simple tasks: git ops, file transforms |

**Key constraint:** Only one `agent-teams` phase at a time. Conductor IS the team lead.

---

## State Contract

All plugins write to `.claude/harness/<plugin>-<run_id>.json` following `schema/state-v1.schema.json`.

**Status values:** `pending`, `running`, `completed`, `failed`, `skipped`, `cancelled`

**Resume:** Conductor reads existing state → skips completed/skipped → retries or aborts failed → executes pending.

---

## Workflow Format

Workflows live at `.claude/harness/workflow.yaml`, validated against `schema/workflow-v1.schema.json`.

**Conditions:** `phases.<id>.output.<field> <op> <value>`
**Interpolation:** `{phases.<id>.output.<field>}` in config strings

---

## Component Types

| Component | Location | Notes |
|-----------|----------|-------|
| Skills | `skills/` | `SKILL.md` files — interactive entry points (setup, compose) |
| Agents | `agents/` | `.md` with YAML frontmatter — headless workers |
| Hooks | `hooks/hooks.json` | Auto-discovered — **never** add `"hooks"` to plugin.json |
| Schemas | `schema/` | Shared at marketplace root, plugin-specific in plugin dirs |

---

## marketplace.json

**Location:** `.claude-plugin/marketplace.json`

**Rules:**
- `source` paths must be relative (`"./conductor"`)
- Plugin `name` must match submodule directory name
- Semantic versioning (X.Y.Z), hyphens not underscores
- Don't manually update after version bumps — webhook handles it
- Only edit directly when adding/removing plugins

---

## Webhook System

Version bump in plugin → push to main → `notify-marketplace.yml` → `repository_dispatch` → `auto-update-plugins.yml` → marketplace.json + submodule updated.

**Each plugin repo needs:** `.github/workflows/notify-marketplace.yml` + `MARKETPLACE_UPDATE_TOKEN` secret.

---

## Relationship to flight505-plugins

Both marketplaces can be installed simultaneously. They don't conflict.

| | flight505-plugins (standalone) | flight505-harness |
|---|---|---|
| **User** | Human at keyboard | Conductor agent or trigger |
| **Interface** | Interactive wizard | JSON config, headless |
| **State** | Plugin-specific (prd.json, results.tsv) | Shared contract (.claude/harness/) |
| **Resume** | Plugin-specific | Conductor handles all |

---

## External Repos (Not Plugins)

These are experiment targets for harness-optimize, not dependencies:

| Repo | Hardware |
|------|----------|
| `flight505/autoresearch-blackwell` | NVIDIA RTX 20xx–50xx |
| `trevin-creator/autoresearch-mlx` | Apple Silicon (M3–M5) |
| `karpathy/autoresearch` | H100 (datacenter) |

---

## Gotchas

- `hooks.json` is auto-discovered — adding `"hooks"` to plugin.json causes duplicate hooks error
- Agent Teams cannot nest — only one `agent-teams` phase at a time
- State files in `.claude/harness/` are runtime artifacts, not committed to git
- `workflow.yaml` IS committed — it's the input definition
- Plugins update on restart only, not mid-session

---

## Common Operations

```bash
# Run a workflow
/conductor:run .claude/harness/workflow.yaml

# Validate schemas
npx ajv validate -s schema/state-v1.schema.json -d .claude/harness/*.json

# Sync submodules
git submodule update --remote --merge

# Add new plugin
git submodule add https://github.com/flight505/<plugin>.git <plugin>
# Then add entry to .claude-plugin/marketplace.json
```

---

**Maintained by:** Jesper Vang (@flight505)
