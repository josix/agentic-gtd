# FAQ

Answers to common questions about missing tags and task behavior.

## Overview

This page covers the most frequent questions about how `agentic-gtd` handles absent or malformed tags, and clarifies the inbox and domain design.

## Missing Tags

### What happens if `prio:` is missing?

The task gets rank 99 (sorts after all valid-prio tasks) and a warning is emitted naming the file and task. Use `/add-task` or the Triage agent to add the tag. The warning appears in the `## Warnings` section of the plan output and in `/review-tasks`.

### What happens if `due:` is missing?

The task has no due date and sorts after all dated tasks in the due-date tiebreak. There is no warning for a missing `due:` — only for a malformed one (e.g. `due:next-friday`).

### What happens if `effort:` is missing?

The task is treated as unknown effort. It passes effort-based filters unless there is clearly no capacity. In the ranked list it sorts last in the effort tiebreak. In `/plan-day` greedy fill it is treated as 240 minutes for filtering purposes.

## Domain and Inbox Questions

### Can I have a task in multiple domains?

No. Each task lives in exactly one domain file. Domain is determined by filename, not by any tag. If a task spans domains, put it in the primary domain and note the other in the description or a `project:` tag.

### What is `tasks/inbox.md` for?

It is a frictionless capture inbox for raw, unrefined thoughts. Dump anything there — the Triage agent clarifies items and migrates them to the correct domain file. Inbox items are never read by planning or sync commands.

### Why are inbox lines marked `[x]` instead of deleted?

`agentic-gtd` is append-only by convention. Marking preserves the audit trail. The Obsidian dashboard and the triage flow both follow this invariant.

## Sync Questions

### What happens if I rename a task in markdown?

Renaming a task creates a duplicate in GitHub. The old item is orphaned — one-way push never deletes. Remove orphans manually in the GitHub Project UI.

### Can I edit tasks in GitHub and have changes come back to markdown?

No. The sync is strictly one-way: markdown → GitHub. GitHub edits are ignored and will be overwritten on the next sync.

## Related

- [Task Line Format](../concepts/task-line-format.md) — full tag reference
- [Priority Ladder](../concepts/priority-ladder.md) — prio rank values
- [GitHub Sync](../guides/github-sync.md) — one-way push invariants
