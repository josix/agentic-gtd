# Using /plan-week

Build a 7-day rolling plan bucketed by each task's effective due date.

## Overview

`/plan-week` reads all five domain files and distributes open tasks across today and the next six days based on their `due:` tag (or computed effective due for recurring tasks), applying a greedy fill per day against your hours budget.

**Source of truth:** [`../../commands/plan-week.md`](../../commands/plan-week.md)

## Basic Usage

```
/plan-week
/plan-week 6
```

## Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `hours-per-day` | 8 | Available hours for each day in the window |

## Bucketing Rules

| Task condition | Lands in |
|----------------|----------|
| Overdue (due < today) | Today |
| No due date | Today |
| Due within 7-day window | Its due day |
| Due after the window | Deferred (chat-only) |
| Recurring (`recurs:` + `last:`) | Computed effective due (`last + interval`) |

## Output

```
## Week Plan — 2026-06-09 through 2026-06-15

### Today (2026-06-09)
1. [fulltime] ...

### 2026-06-10
1. [side] ...

...

## Deferred
- ...
```

## Persistence

The plan is saved to `tasks/plans/<date>.md` with `mode: week`. It includes:

- `## Today` — tasks for today
- `## Following days` — one `### YYYY-MM-DD` section per day
- `## Comments` — auto-captured decisions

The Obsidian dashboard's **Plan panel** renders this note showing Today and Following days.

## Related

- [Using /plan-day](../guides/using-plan-day.md) — single-day plan with energy and context filters
- [Using /plan-weekend](../guides/using-plan-weekend.md) — GTD Weekly Review and weekend plan
- [Ranking](../concepts/ranking.md) — how tasks are ordered within each day bucket
