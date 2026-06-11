# Domains

Tasks in `agentic-gtd` are partitioned into life-area domains, each backed by a separate markdown file. Domains are extensible — the plugin ships with five defaults and you can add more with `/add-domain`.

## Overview

Domain separation keeps different types of work from colliding in your ranked plans. The domain is determined solely by the file a task lives in — there is no domain tag. This also means a task can only ever belong to one domain.

The authoritative domain list lives in `tasks/domains.md`. All commands that enumerate or validate domains read that file. Adding a new domain with `/add-domain` immediately makes it usable across `/add-task`, `/plan-day`, `/review-tasks`, and all other commands.

## Default Domains

The plugin ships with five built-in domains:

| Domain | File | What belongs here |
|--------|------|-------------------|
| `fulltime` | `tasks/fulltime.md` | Work directly for your full-time employer |
| `parttime` | `tasks/parttime.md` | Work for your part-time job |
| `side-projects` | `tasks/side-projects.md` | Personal projects you are building or running |
| `open-source` | `tasks/open-source.md` | Contributions to public repos, community work |
| `knowledge` | `tasks/knowledge.md` | Learning, reading, research, note synthesis |

### The Inbox

`tasks/inbox.md` is a special file but is **not** a domain. It is a raw-capture buffer that is never read by planning or sync commands. Items must be clarified and filed into a domain file before they become plan-eligible. See [Capturing Tasks](../guides/capturing-tasks.md).

## The Domain Registry

`tasks/domains.md` is the single source of truth for all domains. Its columns:

| Column | Purpose |
|--------|---------|
| `canonical` | The filename stem — `tasks/<canonical>.md` is the task file |
| `aliases` | Short alternate names accepted by all commands |
| `daily_order` | Tiebreak weight in daily plans (lower = higher priority) |
| `weekend_order` | Tiebreak weight in weekend plans |
| `color` | Badge color used by the Obsidian Dashboard |
| `github_sync` | Whether `/sync-github` pushes tasks from this domain |

`tasks/templates/domains.md` is the fresh-vault seed copy — copy it to `tasks/domains.md` when bootstrapping a new vault.

## Adding a New Domain

Run `/add-domain <name>` and the command will:

1. Validate the name and check for collisions.
2. Ask for aliases, color, ordering, and GitHub sync preference.
3. Create `tasks/<name>.md` and `tasks/templates/<name>.md`.
4. Append the domain row to `tasks/domains.md` and the template registry.
5. Update the Obsidian Dashboard's `domainOrder` and `domainColors` arrays.
6. Print a GitHub-sync reminder.

## Domain Weighting in Plans

The domain is the fifth tiebreaker in ranking (after `prio`, manual `order:`, due date, and effort). Its weight differs between daily and weekend modes:

- **Daily** (`/plan-day`): domains ordered by `daily_order` in the registry (fulltime = 1, first in ties by default)
- **Weekend** (`/plan-weekend`): domains ordered by `weekend_order` (side-projects = 1, first in ties; fulltime tasks sectioned out as optional)

See [Ranking](../concepts/ranking.md) for the full tiebreak order.

## Adding a Task to a Domain

Use `/add-task` with the domain as the first argument:

```
/add-task knowledge Read chapter 3 of "Shape Up"  prio:long  effort:1h
```

See [Capturing Tasks](../guides/capturing-tasks.md) for the full capture and triage workflow.
