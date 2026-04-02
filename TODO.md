# flight505-harness — TODO

Issues and improvements from test round 1 (2026-03-31 — 2026-04-01).

---

## High Priority

### 1. Move state directory from `.claude/harness/` to `.harness/`

**Problem:** `.claude/` is a protected directory in `bypassPermissions` mode — writes always prompt for confirmation, even with `--dangerously-skip-permissions`. The exemptions (`.claude/commands`, `.claude/agents`, `.claude/skills`) are hardcoded and cannot be extended by plugins or user settings.

**Impact:** Every state file write triggers a permission prompt, breaking headless operation. This is the #1 UX friction.

**Fix:**
- [ ] Change all state file paths from `.claude/harness/` to `.harness/`
- [ ] Update `schema/state-v1.schema.json` docs
- [ ] Update `schema/workflow-v1.schema.json` — workflow.yaml still lives at `.harness/workflow.yaml`
- [ ] Update conductor `run.md` — all state paths
- [ ] Update conductor `compose/SKILL.md` — output path
- [ ] Update conductor `inject-status` hook — reads from `.harness/`
- [ ] Update optimizer agent — state write path
- [ ] Update harness-build hooks (`validate-task.sh`, `check-idle.sh`) — reads from `.harness/`
- [ ] Update harness-triage hooks (`validate-fix.sh`)
- [ ] Update harness-dashboard `lib/state.ts` — default path
- [ ] Update harness-dashboard `launch-dashboard.sh` — default path
- [ ] Update `CLAUDE.md` (marketplace root + all plugin CLAUDE.md files)
- [ ] Update `examples/` — mock state file paths
- [ ] Conductor auto-adds `.harness/` to `.gitignore` if missing

**Note:** Plugins cannot ship permission allow rules in `plugin.json` — there is no `permissions` field in the plugin schema. Users would have to manually add `Write(.claude/harness/*)` and `Edit(.claude/harness/*)` to their settings.json. Moving to `.harness/` eliminates this entirely.

### 2. Reduce optimizer overhead (4 min/experiment → <1 min)

**Problem:** The optimizer spends ~4 min per experiment on overhead (reading files via SSH, agent thinking, connection setup) vs ~5 min on actual training. That's 44% overhead, meaning 100 overnight experiments waste ~400 min.

**Fix:**
- [ ] SSH ControlMaster — add to optimizer agent protocol:
  ```
  ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=600
  ```
  Or instruct users to add this to `~/.ssh/config` for their ml-server host
- [ ] Read artifact ONCE at loop start, not every experiment. Already in optimizer.md as a guideline — enforce it more strongly
- [ ] Use `sed` for targeted edits instead of rewriting full files via heredoc
- [ ] Reduce agent verbosity — tell it to be fast and decisive, not thorough and analytical
- [ ] Consider running experiment SSH command with `run_in_background: true` and checking output file, to avoid blocking the agent context while training runs

### 3. Dashboard real-time updates during long experiments

**Problem:** During 5-10 min SSH commands, the dashboard is frozen — shows stale elapsed time and no progress. Users can't tell if it's working or stuck.

**Implemented (not re-tested):**
- [x] Interim state writes before each SSH command (optimizer.md updated)
- [x] Heartbeat daemon (`heartbeat.mjs`) updates `elapsed_seconds` every 1.5s
- [x] Heartbeat auto-launches with dashboard

**Still needed:**
- [ ] Re-test live with a real optimization run to verify the fixes work
- [ ] Add `current_experiment_description` field to interim state so dashboard shows what's being tried
- [ ] Dashboard: show "running experiment N: <description>" when experiment is in progress
- [ ] Dashboard: animate the elapsed time counter client-side between polls (don't wait for server update)

---

## Medium Priority

### 4. Add completion notification

**Problem:** Long-running pipelines (45+ min) complete silently. User must check terminal or dashboard manually.

**Fix:** Add a `Notification` hook to the conductor plugin. The `Notification` event fires when Claude is waiting for input — this includes after a pipeline completes.

- [ ] Add to `conductor/hooks/hooks.json`:
  ```json
  "Notification": [{
    "hooks": [{
      "type": "command",
      "command": "osascript -e 'display notification \"Workflow complete\" with title \"flight505-harness\"'"
    }]
  }]
  ```
- [ ] Cross-platform: detect OS and use `osascript` (macOS), `notify-send` (Linux), or PowerShell (Windows)
- [ ] Include workflow name and result in the notification text

### 5. Dashboard improvements

**Problem:** Dashboard shows basic state but lacks timestamps, predictions, and useful context.

**Fix:**
- [ ] Add wall-clock timestamps: when did each phase start/end (not just elapsed seconds)
- [ ] Add predicted completion time based on progress rate (experiments/min × remaining)
- [ ] Show total token usage per phase (from agent return metadata)
- [ ] Show experiment descriptions in the chart tooltip (not just values)
- [ ] Add a "skipped" visual state for phases that didn't run (condition false)
- [ ] Show the workflow.yaml content in a collapsible panel
- [ ] Add a "last updated" timestamp to the header so users know data is fresh

### 6. Generalize harness-research beyond AI/ML

**Problem:** harness-research was built from ai-frontier (an AI research plugin). The prompts, examples, and language are ML-specific. The harness should support any domain.

**What's missing vs ai-frontier:**
- No router skill (auto-detects when to use research)
- No validation hooks (enforce output structure)
- No implementation-guide agent (paper → pseudocode)
- No architecture-evaluator agent (codebase → SOTA gap)
- No markdown prose output (only JSON state)
- Perplexity integration is vague ("if configured")

**Fix — Phase 1 (generalize):**
- [ ] Remove ML-specific language from agent prompts and descriptions
- [ ] Add domain-agnostic examples (engineering, economics, medicine)
- [ ] Formalize Perplexity integration — document when it's needed and how to configure `OPENROUTER_API_KEY`
- [ ] Add validation hooks (port from ai-frontier's `validate-research-output.py`)

**Fix — Phase 2 (feature parity):**
- [ ] Add implementation-guide agent (translate research → actionable code/architecture)
- [ ] Add architecture-evaluator agent (compare codebase against current SOTA)
- [ ] Add markdown prose output alongside JSON state
- [ ] Add router skill for natural invocation ("what does research say about X?")

### 7. API source reliability

**Problem:** arXiv API was unavailable during one test (searcher fell back to web search). Semantic Scholar has rate limits on the free tier.

**Fix:**
- [ ] Add graceful fallback: if arXiv API fails, use web search for arxiv.org
- [ ] Document optional `S2_API_KEY` for higher Semantic Scholar rate limits
- [ ] Report which sources succeeded/failed in the state output (ai-frontier does this with `## DATA SOURCES`)
- [ ] Add retry logic for transient API failures

---

## Low Priority

### 8. Stale background task notifications

**Problem:** After the optimizer agent completes, late `task-notification` messages appear for already-handled experiments. Cosmetic only — doesn't affect results.

**Fix:**
- [ ] Investigate whether `run_in_background` tasks can be cleaned up when the parent agent finishes
- [ ] Or just suppress/ignore — this is Claude Code platform behavior, not harness-specific

### 9. Agent-teams task coordination edge cases

**Problem:** When US-004 changed the index API, US-003 (CLI) had to adapt. The teammates handled it naturally (read the updated code), but there's no explicit coordination mechanism.

**Observations:**
- Task-based coordination via TaskList/TaskUpdate is sufficient for independent stories
- For stories that modify shared APIs, `blockedBy` dependencies should be used in the workflow
- Consider adding a "shared patterns" mechanism (like SDK Bridge's `progress.jsonl`) for cross-teammate learning

**Fix:**
- [ ] Document best practice: use `blockedBy` for stories that modify shared interfaces
- [ ] Consider a lightweight pattern-sharing mechanism between teammates

### 10. Improve workflow.yaml validation

**Problem:** Current validation checks structure but not semantic correctness.

**Fix:**
- [ ] Validate that `depends_on` references don't create cycles
- [ ] Validate that `condition` expressions reference fields that the dependency's plugin actually outputs
- [ ] Validate that `agent` field in subagent phases matches a real agent in the plugin
- [ ] Warn if `max_teammates` > number of tasks (wasted teammates)

---

## Performance Reference

From test round 1 (2026-03-31 — 2026-04-01):

| Workload | Duration | Tokens | Per-unit |
|----------|----------|--------|----------|
| Optimize: 5 experiments, SSH | 47 min | ~57K | ~9 min/experiment |
| Optimize: 3 experiments, SSH | 28 min | ~49K | ~9 min/experiment |
| Research: 5 papers | 2 min | ~22K | — |
| Build: 2 stories, 1 teammate | 12.5 min | ~39K | ~6 min/story |
| Build: 3 stories, 2 teammates | 36 min | ~122K | ~12 min/story |
| Review (spec compliance) | 1.5 min | ~35K | — |
| Code review (quality) | 8 min | ~37K | — |
| Full pipeline (build+review+code-review) | 45 min | ~194K | — |

**Baselines:** Simple story ~6 min, moderate story ~12 min, optimizer overhead ~4 min/experiment.
