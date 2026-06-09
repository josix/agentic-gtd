# Priority Ladder

The `prio:` tag is the single field that sets a task's ranking position — it is never overridden.

## Overview

`agentic-gtd` uses a fixed seven-tier priority ladder to rank tasks across all five domains. The ladder reflects real-world urgency: job deliverables rank above personal learning, commitments to others rank above nice-to-haves. The rank is used as the primary sort key in every plan.

## Ladder

| prio value | rank | Natural meaning |
|------------|------|-----------------|
| `fulltime` | 1 | Deliverables that directly drive your full-time job performance |
| `parttime` | 2 | Deliverables that directly drive your part-time job performance |
| `side` | 3 | Active side-project work moving toward launch or revenue |
| `trust` | 4 | Tasks affecting credit/trust — commitments others are waiting on |
| `long` | 5 | High-leverage long-term investments (compounds over months) |
| `short` | 6 | Low-stakes quick wins |
| `tedious` | 7 | Necessary but mechanical tasks |
| missing | 99 | Sorts last; emits a warning naming the file and task title |

## Rules

- The `prio` rank is the **primary sort key** in both daily and weekend plans. No other field overrides it.
- A missing `prio` tag is a warning condition, not an error. The task still appears in plans at rank 99.
- Use `/add-task` or the Triage agent to ensure every task has a valid `prio` tag.

## Related

- [Task Line Format](../concepts/task-line-format.md) — full tag reference
- [Ranking](../concepts/ranking.md) — how tiebreaks work after `prio`
- [GTD Methodology](../concepts/gtd-methodology.md) — how the ladder maps to GTD pillars
