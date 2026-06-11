# agentic-gtd

A Claude Code plugin that ingests tasks from local markdown files across configurable domains (five built-in, extensible via `/add-domain`), produces ranked daily and weekend plans using a fixed GTD priority ladder, and one-way syncs tasks into a private GitHub Project.

---

## What it is

`agentic-gtd` is a GTD-grounded productivity plugin that lives entirely in your local repository. Markdown files are the source of truth.

- Build a ranked, filtered **daily plan** from open tasks (`/plan-day`)
- Build a **7-day rolling plan** bucketed by due date (`/plan-week`)
- Run a **GTD Weekly Review** and generate a **weekend plan** with reversed domain weighting (`/plan-weekend`)
- **Capture** new tasks with well-formed metadata (`/add-task`, `/triage-inbox`)
- **One-way sync** tasks into a private GitHub Project for visibility (`/sync-github`)

---

## The built-in domains

| Domain | File | What belongs here |
|--------|------|-------------------|
| `fulltime` | `tasks/fulltime.md` | Work directly for your full-time employer |
| `parttime` | `tasks/parttime.md` | Work for your part-time job |
| `side-projects` | `tasks/side-projects.md` | Personal projects you are building or running |
| `open-source` | `tasks/open-source.md` | Contributions to public repos, community work |
| `knowledge` | `tasks/knowledge.md` | Learning, reading, research, note synthesis |

`tasks/inbox.md` is a raw-capture inbox that is **never** read by planning or sync commands.

Domains are an extensible registry in `tasks/domains.md`; `/add-domain` registers new ones (creates the task file, ranking order, color, sync flag).

---

## Commands

| Command | Purpose | Details |
|---------|---------|---------|
| `/add-domain` | Register a new domain (creates task file + registry row) | [Commands](docs/reference/commands.md) |
| `/add-task` | Append a new well-formed task to a domain file | [Capturing Tasks](docs/guides/capturing-tasks.md) |
| `/clear-tasks` | Mark completed or abandoned tasks as resolved | [Commands](docs/reference/commands.md) |
| `/layout` | Render a structured view of all tasks across domains | [Commands](docs/reference/commands.md) |
| `/plan-day` | Build a ranked, filtered daily plan | [Using /plan-day](docs/guides/using-plan-day.md) |
| `/plan-week` | Build a 7-day rolling plan bucketed by due date | [Using /plan-week](docs/guides/using-plan-week.md) |
| `/plan-weekend` | GTD Weekly Review sweep + weekend plan | [Using /plan-weekend](docs/guides/using-plan-weekend.md) |
| `/review-tasks` | Surface overdue, stale, or under-tagged tasks | [Commands](docs/reference/commands.md) |
| `/sync-github` | One-way push to a private GitHub Project | [GitHub Sync](docs/guides/github-sync.md) |
| `/triage-inbox` | Clarify and file open inbox items | [Capturing Tasks](docs/guides/capturing-tasks.md) |

---

## Prerequisites

- **gh CLI** — required for `/sync-github`: `brew install gh && gh auth login`
- **Obsidian + Dataview** — required for the interactive dashboard: install Dataview, then enable **"Enable JavaScript Queries"** in its settings
- **Obsidian MCP** (optional) — install the Local REST API plugin in Obsidian and export `OBSIDIAN_API_KEY` before launching Claude Code

See [Installation](docs/getting-started/installation.md) for full setup instructions.

---

## Documentation

### Getting Started
- [Installation](docs/getting-started/installation.md) — prerequisites, plugin install, and building the docs site
- [Quick Start](docs/getting-started/quick-start.md) — add a task and build your first plan in 5 minutes

### Concepts
- [Domains](docs/concepts/five-domains.md) — how tasks are partitioned by life area
- [Task Line Format](docs/concepts/task-line-format.md) — full tag reference
- [Priority Ladder](docs/concepts/priority-ladder.md) — the seven-tier ranking system
- [Ranking](docs/concepts/ranking.md) — tiebreak chain and daily vs weekend differences
- [GTD Methodology](docs/concepts/gtd-methodology.md) — how GTD pillars map to plugin commands

### Guides
- [Using /plan-day](docs/guides/using-plan-day.md)
- [Using /plan-week](docs/guides/using-plan-week.md)
- [Using /plan-weekend](docs/guides/using-plan-weekend.md)
- [Capturing Tasks](docs/guides/capturing-tasks.md) — `/add-task`, inbox, `/triage-inbox`
- [GitHub Sync](docs/guides/github-sync.md) — `/sync-github` setup and field mapping
- [Obsidian Dashboard](docs/guides/obsidian-dashboard.md) — interactive board, inline editing, MCP

### Reference
- [Commands](docs/reference/commands.md) — all ten commands at a glance
- [Skills](docs/reference/skills.md) — the two plugin skills (gtd-prioritization, github-sync)
- [Triage Agent](docs/reference/triage-agent.md) — Triage agent specification
- [FAQ](docs/reference/faq.md) — missing tags and common questions

---

## License

MIT
