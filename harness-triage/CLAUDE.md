# harness-triage

Issue diagnosis and auto-fix. No standalone equivalent — built from scratch for harness workflows.

## Agents

| Agent | Purpose | Phase |
|-------|---------|-------|
| `diagnostician` | Reads issue/error, searches codebase, identifies root cause | Read-only analysis |
| `fixer` | Writes minimal fix with regression test | Creates fix branch |
| `verifier` | Verifies fix addresses the issue, creates PR | Quality gate |

## Agent Chain

```
diagnostician → fixer → verifier
  (read-only)    (edit)    (read-only, creates PR)
```

## State Output

Writes to `.harness/triage-{run_id}.json` following `schema/state-v1.schema.json`.

Output includes: issue_url, diagnosis, fix_branch, pr_url, tests_added, tests_passing.

## Hooks

| Event | Script | Purpose |
|-------|--------|---------|
| `TaskCompleted` | `validate-fix.sh` | Runs test suite to verify fix doesn't break anything |

## Workflow Config

```yaml
- id: triage
  plugin: harness-triage
  type: subagent
  config:
    issue_url: "https://github.com/owner/repo/issues/42"
    fix_branch_prefix: "fix/"
    create_pr: true
```

## Trigger Patterns

- **Manual:** Conductor runs a triage workflow
- **Batch:** Workflow with multiple triage phases for a backlog of issues
- **Conditional:** Only triage if a previous phase detected issues
