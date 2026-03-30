# harness-optimize

Headless keep/revert optimization loop. Any artifact + metric, local or remote via SSH.

Self-contained — absorbs all autoresearch capabilities. No dependency on the standalone autoresearch plugin.

## Agents

| Agent | Purpose | Spawned By |
|-------|---------|------------|
| `optimizer` | The keep/revert experiment loop | Conductor (loop phase) or direct spawn |
| `advisor` | Analyzes projects for optimization opportunities | Conductor (subagent phase) or direct spawn |

## Skill

`/harness-optimize:setup` — interactive hardware target configuration. The ONE interactive entry point.

## State Output

Writes to `.claude/harness/optimize-{run_id}.json` following `schema/state-v1.schema.json`.

Updated after every experiment. Contains:
- Progress (current/total experiments)
- Metric history (value, kept/reverted, description per experiment)
- Best result and improvement percentage

## Config

Hardware targets persist at `${CLAUDE_PLUGIN_DATA}/config.json`.

Schema:
```json
{
  "version": 1,
  "targets": {
    "local":  { "enabled": bool, "path": str, "backend": "mlx"|"cuda"|"cpu", "description": str },
    "server": { "enabled": bool, "ssh_host": str, "path": str, "backend": "cuda", "gpu_type": str },
    "runpod": { "enabled": bool, "api_key": str, "gpu_type": str }
  }
}
```

## Workflow Config

```yaml
- id: optimize
  plugin: harness-optimize
  type: loop
  config:
    artifact: "train.py"       # required: file to edit
    metric: "val_bpb"          # required: metric to extract
    direction: lower           # required: "lower" or "higher"
    run_command: "uv run train.py"  # required: command to run
    time_budget: "5m"          # optional: timeout per experiment
    max_experiments: 20        # optional: default 20
    target: "local"            # optional: "local", "server", "runpod"
    ssh_host: "user@host"      # required if target=server
    cwd: "/path/to/project"    # optional: working directory
```

## Scripts

| Script | Purpose |
|--------|---------|
| `detect-hardware.sh` | Auto-detect Apple Silicon / NVIDIA / CPU |
| `test-ssh.sh <host> [path]` | Test SSH connectivity + detect remote GPU |
| `clone-target.sh <type> <dest>` | Clone autoresearch repo (mlx, cuda-consumer, cuda-datacenter) |
| `write-config.sh` | Write config.json from stdin |

## Hooks

- **SessionStart** `inject-targets` — injects hardware config into session context
- **PostToolUse** `validate-experiment` — warns if metric parsing fails during optimization

## Differences from Standalone Autoresearch

| Standalone (`/autoresearch:run`) | Harness (`harness-optimize`) |
|---|---|
| Interactive setup wizard | Headless — config from workflow.yaml |
| Commands: `/run`, `/status`, `/setup` | Agents + one setup skill |
| results.tsv output | JSON state contract |
| Plugin-specific resume | Conductor handles resume |
| ML-specific (train.py + val_bpb) | Generalized: any artifact + metric |
