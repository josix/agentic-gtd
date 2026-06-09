# Commands

Complete index of all nine `agentic-gtd` commands.

## Overview

Each command is a slash-command loaded from its source file in `commands/`. The table below gives a one-line purpose and links to the source of truth for arguments, output format, and behavioral details.

## Command Index

| Command | One-line purpose | Source of truth |
|---------|-----------------|-----------------|
| `/add-task` | Append a new well-formed task line to a domain file | [`../../commands/add-task.md`](../../commands/add-task.md) |
| `/clear-tasks` | Mark completed or abandoned tasks as resolved and archive them | [`../../commands/clear-tasks.md`](../../commands/clear-tasks.md) |
| `/layout` | Render a structured view of all tasks across domains | [`../../commands/layout.md`](../../commands/layout.md) |
| `/plan-day` | Build a ranked, filtered daily plan from open tasks | [`../../commands/plan-day.md`](../../commands/plan-day.md) |
| `/plan-week` | Build a 7-day rolling plan bucketed by due date | [`../../commands/plan-week.md`](../../commands/plan-week.md) |
| `/plan-weekend` | Run a GTD Weekly Review sweep and build a weekend plan | [`../../commands/plan-weekend.md`](../../commands/plan-weekend.md) |
| `/review-tasks` | Surface overdue, stale, or under-tagged tasks for review | [`../../commands/review-tasks.md`](../../commands/review-tasks.md) |
| `/sync-github` | One-way push of all domain tasks into a private GitHub Project | [`../../commands/sync-github.md`](../../commands/sync-github.md) |
| `/triage-inbox` | Clarify and file all open items in `tasks/inbox.md` | [`../../commands/triage-inbox.md`](../../commands/triage-inbox.md) |

## User Guides

For usage patterns and examples, see the Guides section:

- [Using /plan-day](../guides/using-plan-day.md)
- [Using /plan-week](../guides/using-plan-week.md)
- [Using /plan-weekend](../guides/using-plan-weekend.md)
- [Capturing Tasks](../guides/capturing-tasks.md) — covers `/add-task` and `/triage-inbox`
- [GitHub Sync](../guides/github-sync.md) — covers `/sync-github`
