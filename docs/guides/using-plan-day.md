# Using /plan-day

Build a ranked, filtered daily plan from your open tasks.

## Overview

`/plan-day` reads all five domain files, ranks every open task using the priority ladder and tiebreak chain, applies your time/energy/context filters, and outputs a greedy-filled numbered plan for today.

**Source of truth:** [`../../commands/plan-day.md`](../../commands/plan-day.md)

## Basic Usage

```
/plan-day
/plan-day 4
/plan-day 6 energy:low context:@computer,@phone
/plan-day 8 energy:high
```

## Arguments

All arguments are optional.

| Argument | Default | Description |
|----------|---------|-------------|
| `hours` | 8 | Available hours for the day |
| `energy:high\|med\|low` | `med` | Energy level filter |
| `context:@tag,...` | any | Only include tasks matching these contexts |

**Energy filter behavior:**

- `energy:low` — drops `fulltime`-prio tasks and large-effort tasks; prefers `tedious` and small tasks
- `energy:med` — standard ranking, no filter
- `energy:high` — no filter applied

## Output

```
## Today's Plan — 2026-06-09 (6h available)

1. [fulltime] Write onboarding doc  effort:2h
2. [side] Merge PR #42  effort:1h
3. [trust] Reply to design review  effort:30m
...

## Deferred / filtered out
- ...

## Warnings
- tasks/knowledge.md: "Read Shape Up ch 4" is missing prio: tag
```

## Persistence

The ranked plan is saved to `tasks/plans/<date>.md` with `mode: day`. It includes:

- `## Today` — the ranked task list
- `## Comments` — auto-captured salient decisions from the conversation

`## Deferred / filtered out` and `## Warnings` remain chat-only. The Obsidian dashboard's **Plan panel** renders this note.

## Related

- [Priority Ladder](../concepts/priority-ladder.md) — ranking values
- [Ranking](../concepts/ranking.md) — tiebreak chain and greedy fill algorithm
- [Task Line Format](../concepts/task-line-format.md) — `effort:` and `context:` tag formats
- [Obsidian Dashboard](../guides/obsidian-dashboard.md) — Plan panel display
