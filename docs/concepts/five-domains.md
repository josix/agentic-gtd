# Five Domains

Tasks in `agentic-gtd` are partitioned into five life-area domains, each backed by a separate markdown file.

## Overview

Domain separation keeps different types of work from colliding in your ranked plans. The domain is determined solely by the file a task lives in — there is no domain tag. This also means a task can only ever belong to one domain.

## Domain Definitions

| Domain | File | What belongs here |
|--------|------|-------------------|
| `fulltime` | `tasks/fulltime.md` | Work directly for your full-time employer |
| `parttime` | `tasks/parttime.md` | Work for your part-time job |
| `side-projects` | `tasks/side-projects.md` | Personal projects you are building or running |
| `open-source` | `tasks/open-source.md` | Contributions to public repos, community work |
| `knowledge` | `tasks/knowledge.md` | Learning, reading, research, note synthesis |

### The Inbox

`tasks/inbox.md` is a sixth file but is **not** a domain. It is a raw-capture buffer that is never read by planning or sync commands. Items must be clarified and filed into a domain file before they become plan-eligible. See [Capturing Tasks](../guides/capturing-tasks.md).

## Domain Weighting in Plans

The domain is the fourth tiebreaker in ranking (after `prio`, due date, and effort). Its weight differs between daily and weekend modes:

- **Daily** (`/plan-day`): fulltime ranks first in ties
- **Weekend** (`/plan-weekend`): side-projects rank first; fulltime tasks are sectioned out as optional

See [Ranking](../concepts/ranking.md) for the full tiebreak order.

## Adding a Task to a Domain

Use `/add-task` with the domain as the first argument:

```
/add-task knowledge Read chapter 3 of "Shape Up"  prio:long  effort:1h
```

See [Capturing Tasks](../guides/capturing-tasks.md) for the full capture and triage workflow.
