# Using /plan-weekend

Run a GTD Weekly Review sweep and build a weekend plan that favors personal work over full-time obligations.

## Overview

`/plan-weekend` does two things in sequence: it runs a Weekly Review sweep to surface overdue, stale, and under-tagged tasks, then it builds a ranked plan with reversed domain weighting so side-projects, open-source, and knowledge tasks rank above full-time work.

**Source of truth:** [`../../commands/plan-weekend.md`](../../commands/plan-weekend.md)

## Basic Usage

```
/plan-weekend
/plan-weekend 8
```

## Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `hours` | 12 | Available hours for the weekend |

## The Weekly Review Sweep

Before building the plan, `/plan-weekend` scans all domain files and surfaces:

- Overdue tasks (due date in the past)
- Stale tasks (unchanged for an extended period)
- Tasks missing required metadata (no `prio:` tag)

The sweep output appears in `## Weekly Review sweep` in the chat. It stays chat-only — it is not persisted to the plan file.

## Domain Weighting

Weekend mode reverses the domain order used for tiebreaks:

| Mode | Domain tiebreak order (ascending priority in ties) |
|------|----------------------------------------------------|
| Daily | fulltime < parttime < side-projects < open-source < knowledge |
| Weekend | side-projects < open-source < knowledge < parttime < fulltime |

Non-overdue `fulltime` tasks are sectioned out into `## Full-time (optional this weekend)` rather than removed.

## Output

```
## Weekly Review sweep
- Overdue: ...
- Stale: ...

## Weekend Plan — 2026-06-14 (12h available)

1. [side] ...
2. [open-source] ...
...

## Full-time (optional this weekend)
- ...

## Warnings
- ...
```

## Persistence

The plan is saved to `tasks/plans/<date>.md` with `mode: weekend`. It includes:

- `## Today` — the weekend plan
- `## Full-time (optional)` — sectioned-out fulltime tasks
- `## Comments` — auto-captured decisions

The Weekly Review sweep and Warnings remain chat-only.

## Related

- [GTD Methodology](../concepts/gtd-methodology.md) — how Reflect maps to this command
- [Ranking](../concepts/ranking.md) — full tiebreak chain and domain ordering
- [Using /plan-day](../guides/using-plan-day.md) — daily plan with energy/context filters
