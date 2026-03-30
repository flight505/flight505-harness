# harness-research

Headless literature search and synthesis. Absorbs search and analysis from ai-frontier.

## Agents

| Agent | Purpose | Spawned By |
|-------|---------|------------|
| `searcher` | Searches arXiv, Semantic Scholar, HF Papers, Perplexity | Conductor (subagent) |
| `synthesizer` | Synthesizes findings into structured output | Conductor (subagent) |
| `method-analyst` | Compares methods/architectures with tradeoff analysis | Conductor (subagent) |

## State Output

Writes to `.claude/harness/research-{run_id}.json` following `schema/state-v1.schema.json`.

Output includes: query, findings, papers, recommendations.

## Workflow Config

```yaml
- id: research
  plugin: harness-research
  type: subagent
  config:
    query: "Why did reducing connection pool size improve latency?"
    sources: ["arxiv", "semantic-scholar", "hf-papers", "perplexity"]
    max_papers: 10
```

## Typical Usage

1. **Standalone research:** Conductor runs a single research phase
2. **Post-optimization:** Research why an optimization worked, using `{phases.optimize.output.best_description}` interpolation
3. **Method comparison:** Use method-analyst to choose between approaches before building
