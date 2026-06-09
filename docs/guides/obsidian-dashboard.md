# Obsidian Dashboard

An interactive visual dashboard that renders your open tasks as a ranked Board and Table inside Obsidian.

## Overview

The dashboard reads and writes the same `tasks/*.md` files that the slash-commands use — markdown remains the single source of truth. It requires the Dataview plugin with JavaScript Queries enabled.

## What it Is

The dashboard (`tasks/templates/Dashboard.md`) is a DataviewJS block that renders:

- A **Summary bar** with stat pills: total open, overdue, due this week, per-domain counts
- A **Board** grouped by priority tier, each card with Move reprioritize, Done, and Won't Fix controls
- A **Table** grouped by domain (collapsible), each row with inline priority, due, effort, and context editors plus resolve buttons
- A **Quick capture** form for raw inbox entries
- An **Inbox needs triage** section listing all open inbox items

## Prerequisites

- Dataview plugin with **"Enable JavaScript Queries"** turned on (Settings → Dataview). Without this the interactive block will not execute.
- Optional: Obsidian Tasks plugin — enables checkbox status cycling directly inside notes.

## Setup

**Step 1 — Open the vault**

Open the repo root folder (or just the `tasks/` sub-folder) as an Obsidian vault.

**Step 2 — Install community plugins**

Install Dataview and enable JavaScript Queries as described in [Installation](../getting-started/installation.md).

**Step 3 — Open the dashboard**

Open `tasks/templates/Dashboard.md`. Dataview renders it live.

The dashboard file is git-tracked and safe to push. Live task data (`tasks/*.md`) remains gitignored.

## Edit Capabilities

### 1. Resolve (Done / Won't Fix)

Every board card and table row has Done and Won't Fix buttons. Clicking confirms with a dialog, then rewrites the source task line in place:

- **Done** — marks the checkbox `[x]`, appends `resolution:done` and `resolved:<date>` tags
- **Won't Fix** — marks the checkbox `[-]`, appends `resolution:wont-fix` and `resolved:<date>` tags
- **Recurring tasks** — Done leaves the checkbox `[ ]` and updates only the `last:` tag to today, rolling the cycle forward (mirrors `/clear-tasks` semantics)

### 2. Inline Field Editing (Table)

Each row exposes live controls:

- `<select>` for priority (seven tiers)
- Date picker for `due:`
- Text input for `effort:` (validated against `\d+(\.\d+)?[hm]`)
- Text input for `context:`

Changing any control rewrites only that field token in the source line. Clearing a field removes the token entirely.

### 3. Reprioritize via Board

Each board card has a "Move" select listing the seven priority tiers. Changing it rewrites `prio:` in the source line; on auto-refresh the card moves to the new column.

## Capture to Triage Loop

1. Type a raw thought in the Quick capture form and click "Add to inbox" — appended to `tasks/inbox.md` immediately.
2. The Inbox section shows all open items.
3. Click "Copy triage command" — `/triage-inbox` is copied to your clipboard.
4. Paste and run `/triage-inbox` in Claude Code.

## MCP Integration

The plugin ships `.mcp.json` at the repo root, declaring an `obsidian` MCP server using [`mcp-obsidian`](https://github.com/MarkusPfundstein/mcp-obsidian). When active, Claude can read and append to vault notes via `mcp__obsidian__*` tools.

To enable: install the **Local REST API** community plugin in Obsidian, copy its API key, and export it:

```sh
export OBSIDIAN_API_KEY="<your-key-here>"
```

Default connection: `127.0.0.1:27124`. Change via the Local REST API plugin settings if needed.

## Caveats

- **No hard-deletes.** This plugin's convention is append-only — retire tasks with resolve buttons or `/clear-tasks`. Deleting a line loses history and breaks the audit trail. The dashboard exposes no delete control.
- **Single-colon tag format.** The dashboard parses `key:value` (single colon, double-space-separated). Do not switch to Dataview's `key:: value` double-colon format unless you intend to update every planning command.
- **Line-drift guard.** Write operations validate that the target line still looks like a task checkbox before applying any edit. If lines shifted due to external edits while the dashboard was open, writes are safely aborted with a notice to reopen the dashboard.

## Related

- [Installation](../getting-started/installation.md) — Dataview and MCP prerequisites
- [Capturing Tasks](../guides/capturing-tasks.md) — Quick capture and triage workflow
- [Task Line Format](../concepts/task-line-format.md) — tag format the dashboard reads and writes
