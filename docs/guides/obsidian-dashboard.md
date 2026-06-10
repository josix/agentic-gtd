# Obsidian Dashboard

An interactive visual dashboard that renders your open tasks as a ranked Board and Table inside Obsidian.

## Overview

The dashboard reads and writes the same `tasks/*.md` files that the slash-commands use — markdown remains the single source of truth. It requires the Dataview plugin with JavaScript Queries enabled.

## What it Is

The dashboard (`tasks/templates/Dashboard.md`) is a DataviewJS block that renders:

- A **Summary bar** with stat pills: total open, overdue, due this week, per-domain counts
- A **Status Board** with three columns — TODO (auto-populated from today's plan), IN PROGRESS (drag or select), DONE / WON'T FIX (today's resolutions)
- A **Board** grouped by priority tier, each card with Move reprioritize, Done, Won't Fix, and Block/Unblock controls
- A **Table** grouped by domain (collapsible), each row with inline priority, due, effort, and context editors plus resolve and Block/Unblock buttons
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
- **Won't Fix** — marks the checkbox `[-]`, appends `resolution:wontfix` and `resolved:<date>` tags
- **Recurring tasks** — Done leaves the checkbox `[ ]` and updates only the `last:` tag to today, rolling the cycle forward (mirrors `/clear-tasks` semantics). The task appears in the DONE / WON'T FIX column for the rest of the day with a ♻ Recurring badge showing the next cycle interval.

### 2. Inline Field Editing (Table)

Each row exposes live controls:

- `<select>` for priority (seven tiers)
- Date picker for `due:`
- Text input for `effort:` (validated against `\d+(\.\d+)?[hm]`)
- Text input for `context:`

Changing any control rewrites only that field token in the source line. Clearing a field removes the token entirely.

### 3. Reprioritize via Board

Each board card has a "Move" select listing the seven priority tiers. Changing it rewrites `prio:` in the source line; on auto-refresh the card moves to the new column.

### 4. Block / Unblock Toggle

Every board card and table row has a "🚫 Block" / "🚫 Unblock" button (compact "🚫" in the table). Clicking it toggles the `blocked:true` tag directly in the source line — no confirmation dialog. Blocked tasks display a red "🚫 Blocked" badge in the card meta row and next to the task title in the table. Plan panel rows show the badge read-only. Blocked tasks are not hidden or reordered; they remain in their normal position. Dataview auto-refreshes the view after the write.

### 5. Status Board (Drag-and-Drop Execution Tracking)

The **Status Board** sits below the Plan panels and above Quick capture. It has three columns:

- **TODO** — auto-populated from tasks that appear in any active plan panel (Today, Tomorrow, This Week, or Weekend), via `scheduledTitles`. Tasks move out of this column automatically when marked In Progress.
- **IN PROGRESS** — open tasks with `status:in-progress`. Drag a card from TODO here, or use the "Status ▸" select on any card.
- **DONE / WON'T FIX** — tasks resolved today (checkbox `[x]` or `[-]` with `resolved:<today>`) plus recurring tasks whose cycle was completed today. This column is read-only; cards show a ✓ Done, ✕ Won't Fix, or ♻ Recurring marker. The column clears at midnight rollover.

**Drag-and-drop behaviour:**
- Drag a TODO card → drop on IN PROGRESS: sets `status:in-progress` in the source line; checkbox stays `[ ]`.
- Drag an IN PROGRESS card → drop on TODO: clears `status:` from the source line.
- Drag any card → drop on DONE / WON'T FIX: marks the task done (sets checkbox `[x]`, appends `resolution:done` and `resolved:<date>`, clears `status:`). No confirm dialog on drag. For recurring tasks, dropping on DONE bumps `last:` to today and rolls the cycle forward — the card appears in the DONE column for the rest of the day with a ♻ Recurring badge, while the underlying line stays `- [ ]` with `last:` updated (consistent with `/clear-tasks` semantics).

**Select fallback:** each TODO and IN PROGRESS card has a compact "Status ▸" select with options: To do, In progress, Done, Won't fix. Done and Won't fix routes through the standard resolve handler (includes confirm dialog). Won't fix sets checkbox `[-]` and `resolution:wontfix`. For recurring tasks, selecting Done fires a "cycle completed" notice and shows the task in DONE for the rest of the day.

The dashboard auto-rebuilds after every write so columns recompute from the source markdown immediately.

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
