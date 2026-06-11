# Quick Start

Get from zero to your first ranked daily plan in five minutes.

## Overview

This guide walks the shortest path: add a task, generate a daily plan, and optionally push to GitHub.

## Step 1 — Add a Task

```
/add-task fulltime Write onboarding doc for new hire  prio:fulltime  effort:2h  context:@computer
```

The task is appended to `tasks/fulltime.md` as a single `- [ ]` line with the tags you supplied. The file is never reordered.

- [ ] Your task now lives in `tasks/fulltime.md`.

## Step 2 — Build Today's Plan

```
/plan-day 6
```

`agentic-gtd` reads every domain file listed in `tasks/domains.md`, ranks every open task by the priority ladder (see [Priority Ladder](../concepts/priority-ladder.md)), applies a greedy time-fill against your 6-hour budget, and prints a numbered plan.

The plan is also saved to `tasks/plans/<today's date>.md` so the Obsidian dashboard can display it.

- [ ] You have a ranked plan for the day.

## Step 3 — (Optional) Sync to GitHub

If you want a board view in GitHub Projects:

```sh
# First time only — creates the Project and custom fields
/sync-github --init

# Push all tasks
/sync-github
```

- [ ] Tasks are visible in your private GitHub Project.

## What's Next?

- [Task Line Format](../concepts/task-line-format.md) — understand every supported tag
- [Using /plan-day](../guides/using-plan-day.md) — energy and context filters
- [Using /plan-weekend](../guides/using-plan-weekend.md) — GTD Weekly Review
- [Capturing Tasks](../guides/capturing-tasks.md) — fast inbox capture and triage
- [Obsidian Dashboard](../guides/obsidian-dashboard.md) — interactive board and inline editing
