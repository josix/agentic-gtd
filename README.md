# task-manager

A Claude Code plugin that ingests tasks from local markdown files across five domains, produces ranked daily and weekend plans using a fixed GTD priority ladder, and one-way syncs tasks into a private GitHub Project.

---

## What it is

`task-manager` is a GTD-grounded productivity plugin that lives entirely in your local repository. Markdown files are the source of truth. The plugin provides Claude Code commands to:

- Build a ranked, filtered **daily plan** from your open tasks
- Run a **GTD Weekly Review** and generate a **weekend plan** with appropriate domain weighting
- **Capture** new tasks with well-formed metadata
- **One-way sync** tasks into a private GitHub Project for visibility

---

## The five domains

| Domain          | File                      | What belongs here                                    |
|-----------------|---------------------------|------------------------------------------------------|
| `fulltime`      | `tasks/fulltime.md`       | Work directly for your full-time employer            |
| `parttime`      | `tasks/parttime.md`       | Work for your part-time job                          |
| `side-projects` | `tasks/side-projects.md`  | Personal projects you are building or running        |
| `open-source`   | `tasks/open-source.md`    | Contributions to public repos, community work        |
| `knowledge`     | `tasks/knowledge.md`      | Learning, reading, research, note synthesis          |

There is also `tasks/inbox.md` — a raw-capture inbox that is **never** read by planning or sync commands.

---

## Task line format

Every task is a single line in one of the domain files:

```
- [ ] <next action>  prio:<value>  project:<name>  effort:<Xh|Xm>  impact:<long|short>  due:<YYYY-MM-DD>  context:<@tag,...>
```

Completed tasks use `- [x]` instead of `- [ ]`.

### Full tag reference

| Tag        | Required | Values / format                                                        | Notes                                          |
|------------|----------|------------------------------------------------------------------------|------------------------------------------------|
| `prio`     | Yes*     | `fulltime`, `parttime`, `side`, `trust`, `long`, `short`, `tedious`    | Sets the priority ladder rank. *Missing = rank 99 + warning |
| `project`  | No       | any string (no spaces)                                      | Groups tasks by project/area                   |
| `effort`   | No       | `30m`, `1h`, `2h`, `1.5h`, etc.                             | Used for greedy time-filling; missing = unknown (sorts last) |
| `impact`   | No       | `long`, `short`                                             | Informational only; not used in ranking        |
| `due`      | No       | `YYYY-MM-DD`                                                | ISO date; missing or malformed = no-due (sorts last) |
| `context`  | No       | `@computer`, `@phone`, `@errand`, etc. (comma-separated)   | Used for context filter in /plan-day           |

---

## The priority ladder

The `prio:` tag is the **only** field that sets ranking position. It is never overridden.

| prio value | rank | Natural meaning                                                      |
|------------|------|----------------------------------------------------------------------|
| `fulltime` | 1    | Deliverables that directly drive your full-time job performance      |
| `parttime` | 2    | Deliverables that directly drive your part-time job performance      |
| `side`     | 3    | Active side-project work moving toward launch or revenue             |
| `trust`    | 4    | Tasks affecting credit/trust — commitments others are waiting on     |
| `long`     | 5    | High-leverage long-term investments (compounds over months)          |
| `short`    | 6    | Low-stakes quick wins                                                |
| `tedious`  | 7    | Necessary but mechanical tasks                                       |
| missing    | 99   | Sorts last; emits a warning naming file and task title               |

---

## Commands

### `/plan-day`

Build today's ranked daily plan, filtered by available time, energy, and context.

```
/plan-day
/plan-day 4
/plan-day 6 energy:low context:@computer,@phone
/plan-day 8 energy:high
```

**Arguments** (all optional):
- `hours` — available hours (default: 8)
- `energy:high|med|low` — energy level filter (default: med)
  - `low`: drops fulltime tasks and large-effort tasks; prefers tedious and small tasks
- `context:@tag,...` — only include tasks matching these contexts (default: any)

**Output**: numbered ranked task list, then `## Deferred / filtered out`, then `## Warnings`.

---

### `/plan-weekend`

Run a GTD Weekly Review sweep and build a weekend plan that favors side projects, open source, and knowledge over full-time work.

```
/plan-weekend
/plan-weekend 8
```

**Arguments** (all optional):
- `hours` — available hours (default: 12)

**Output**: `## Weekly Review sweep` (overdue / stale / missing metadata), then a ranked plan with reversed domain weighting, then `## Full-time (optional this weekend)` for non-overdue fulltime tasks.

---

### `/add-task`

Capture a new task and append it to the correct domain file.

```
/add-task fulltime Write onboarding doc for new team member  prio:long  effort:2h  context:@computer
/add-task side Publish blog post announcing v1.0  prio:side  project:saas-app  effort:1h  due:2026-06-20
/add-task knowledge Read "Shape Up" chapter 2  prio:long  effort:1h
```

**Arguments**:
- `domain` (required, first token): `fulltime`, `side` / `side-projects`, `oss` / `open-source`, `knowledge`
- task description: free-form text before any `key:value` tags
- optional tags: `prio:`, `project:`, `effort:`, `due:`, `context:`

Appends exactly one `- [ ] ...` line. Never reorders or rewrites existing lines.

---

### `/sync-github`

One-way push of all `tasks/*.md` into a private GitHub Project.

```
/sync-github --init          # create GitHub Project + fields (idempotent)
/sync-github --init --dry-run  # preview what --init would do
/sync-github                 # sync all tasks
/sync-github --dry-run       # preview sync without mutations
```

See [GitHub Project sync](#github-project-sync-one-way-push) for full details.

---

## The Triage agent

The `Triage` agent is a GTD Clarify specialist. Invoke it when you have raw, vague, or under-specified items in `tasks/inbox.md`.

**What it does**:
- Converts raw notes into concrete next-action task lines
- Assigns `prio:` by reasoning about the priority ladder
- Infers domain and appends clarified tasks to the appropriate domain file
- Flags ambiguous items in a `## Needs human decision` section instead of guessing
- Never invents due dates

**How to use**:
```
@Triage  (or: use the Triage agent)
```

Clarified tasks become sync-eligible. Items left in `tasks/inbox.md` are never read by planning or sync.

---

## How ranking works

### Daily vs weekend differences

| Aspect                   | Daily (`/plan-day`)                                  | Weekend (`/plan-weekend`)                              |
|--------------------------|------------------------------------------------------|--------------------------------------------------------|
| Domain tie-break order   | fulltime < side-projects < open-source < knowledge   | side-projects < open-source < knowledge < fulltime     |
| Fulltime sectioning      | fulltime tasks rank normally                         | non-overdue fulltime → `## Full-time (optional this weekend)` |
| Weekly Review sweep      | not included                                         | runs first; surfaces overdue/stale/incomplete metadata  |
| Default hours            | 8                                                    | 12                                                     |
| Energy filter            | yes (high/med/low)                                   | not applicable                                          |
| Context filter           | yes                                                  | not applicable                                          |

The **primary sort key** (prio rank) is identical in both modes.

### Ranking tiebreaks (both modes, in order)

1. `prio` rank ascending (NEVER overridden)
2. due-date proximity (earlier first; no-due after all dated tasks)
3. effort ascending (smaller effort first; unknown last)
4. domain order (per mode above)
5. alphabetical by title (guarantees total order)

---

## GTD pillar mapping

| Pillar      | How this plugin addresses it                                                       |
|-------------|------------------------------------------------------------------------------------|
| **Capture** | Raw items go to `tasks/inbox.md`; domain files hold clarified tasks               |
| **Clarify** | Triage agent converts inbox items to concrete next-action lines with proper tags   |
| **Organize**| Tasks filed in domain files; priority ladder provides the organizational backbone  |
| **Reflect** | `/plan-weekend` Weekly Review sweep surfaces overdue, stale, under-specified tasks |
| **Engage**  | `/plan-day` filters by hours/energy/context and produces a greedy-filled action list |

---

## GitHub Project sync (one-way push)

### Prerequisites

- `gh` CLI installed and authenticated: `gh auth login`
- Optional: `personal-github` MCP server configured (used for identity resolution and issue listing)
- Projects v2 field writes use GraphQL via `gh api graphql`

### The --init flow

1. Resolves your GitHub owner identity
2. Checks `.task-manager.local.md` — if `projectId` already set, exits without recreating
3. Creates a private GitHub Project titled "Task Manager"
4. Creates custom fields: `Priority` (single-select), `Domain` (single-select), `Due` (date), `Project/Area` (text); ensures Status has `Todo` and `Done` options
5. Resolves and records every `fieldId` and option ID
6. Writes all IDs to `.task-manager.local.md` at repo root
7. Adds `.task-manager.local.md` to `.gitignore`

### Field mapping table

| Markdown source              | GitHub Project field | Values                                              |
|------------------------------|----------------------|-----------------------------------------------------|
| filename stem                | `Domain`             | fulltime, side-projects, open-source, knowledge     |
| `prio:` tag                  | `Priority`           | fulltime, side, trust, long, short, tedious         |
| `due:` tag                   | `Due`                | YYYY-MM-DD (empty if absent/malformed)              |
| checkbox `[ ]` / `[x]`       | `Status`             | Todo / Done                                         |
| task title                   | item title           | trimmed, whitespace collapsed                       |
| `project:` tag               | `Project/Area`       | text (omitted if tag absent)                        |

### One-way push invariants

- Markdown is always the source of truth
- Sync never pulls from GitHub, never resolves conflicts, never deletes GitHub items
- `tasks/inbox.md` is never synced
- **Rename limitation (IMPORTANT)**: **Renaming a task in markdown creates a duplicate in GitHub. The old item is orphaned. One-way push never deletes. Remove orphans manually in the GitHub Project UI.**

### Config file

`.task-manager.local.md` at repo root stores:
- `projectId`, `projectNumber`, `owner`
- All `fieldId` and option ID mappings

**This file must not be committed.** It is added to `.gitignore` during `--init`.

---

## Obsidian view (interactive local UI)

### What it is

An interactive visual dashboard that renders your open tasks as a ranked Board + Table directly inside Obsidian, with in-place editing capabilities. It reads and writes the same `tasks/*.md` files that the slash-commands use — markdown remains the single source of truth.

### Capture → triage loop

The dashboard includes a **➕ Quick capture** form at the top. Type any raw thought and click "Add to inbox" (or press Enter) — the item is appended to `tasks/inbox.md` immediately. The **📥 Inbox · needs triage** section below the form lists all open inbox items so you can see what is waiting.

To clarify and file those items:

1. Click **"Copy triage command"** in the dashboard — it copies `/triage-inbox` to your clipboard.
2. Paste `/triage-inbox` in Claude Code and run it.

`/triage-inbox` delegates each raw inbox item to the Triage agent, batches the proposals into a single confirmation, and — after you confirm — appends the well-formed task lines to the correct domain files and marks the corresponding inbox lines `[x]` in place.

**Invariants:**
- `tasks/inbox.md` is raw capture only — append-only, never read by planning or sync commands.
- Inbox lines are marked, never deleted. The append-only audit trail is always preserved.
- Markdown stays the single source of truth throughout.

**Three edit capabilities:**

1. **Resolve (Done / Won't Fix)** — every board card and every table row has ✓ Done and ✗ Won't Fix buttons. Clicking confirms with a dialog, then rewrites the source task line in place: marks the checkbox `[x]` or `[-]`, appends `resolution:` and `resolved:` tags. Recurring tasks (`recurs:` present) handle Done differently: the checkbox stays `[ ]` and only `last:` is updated to today (rolling the cycle forward), mirroring `/clear-tasks` semantics exactly.
2. **Edit fields inline (table rows)** — each row exposes live controls: a `<select>` for priority (7 tiers), a date picker for `due:`, a text input for `effort:` (validated against `\d+(\.\d+)?[hm]`), and a text input for `context:`. Changing any control rewrites only that field token in the source line. Clearing a field removes the token entirely.
3. **Reprioritize via board** — each board card has a "Move ▸" `<select>` listing the 7 priority tiers. Changing it rewrites `prio:` in the source line; on auto-refresh the card moves to the new column.

All writes go directly to the source `.md` file via `app.vault.process` (atomic) or `app.vault.modify`. Dataview auto-rerenders the block after each write. No hard-delete control exists anywhere — resolve tasks via the buttons, never by deleting lines.

### Prerequisites

- **Dataview plugin with DataviewJS enabled** (required) — install via Settings → Community plugins → Browse → search "Dataview", then go to Dataview settings and turn on **"Enable JavaScript Queries"**. Without this setting the interactive block will not execute.
- **Tasks** (optional, recommended) — enables checkbox status cycling directly inside Obsidian notes.

### Setup

**Step (a) — Open the vault**

Open the repo root folder (or just the `tasks/` sub-folder) as an Obsidian vault.

**Step (b) — Install community plugins**

Install Dataview and enable JavaScript Queries as described above.

**Step (c) — Open the dashboard**

Open `tasks/templates/Dashboard.md`. Dataview renders it live. The dashboard shows:
- A **Summary bar** with stat pills (total open, overdue, due this week, per-domain counts).
- A **Board** grouped by priority tier, each card with Move ▸ reprioritize + ✓ Done + ✗ Won't Fix controls.
- A **Table** grouped by domain (collapsible), each row with inline priority, due, effort, context editors plus ✓ / ✗ resolve buttons.

The dashboard is git-tracked and safe to push. Live task data (`tasks/*.md`) remains gitignored.

### MCP integration

This plugin ships `.mcp.json` at the repo root, which declares an `obsidian` MCP server using MarkusPfundstein's [`mcp-obsidian`](https://github.com/MarkusPfundstein/mcp-obsidian) package. When active, Claude can read and append to vault notes via `mcp__obsidian__*` tools (e.g. `obsidian_get_file_contents`, `obsidian_patch_content`).

**To enable:**

1. Install the **Local REST API** community plugin in Obsidian and enable it. It will display an API key.
2. Copy that API key.
3. Export it in your shell environment before launching Claude Code:
   ```sh
   export OBSIDIAN_API_KEY="<your-key-here>"
   ```
   The key must never be committed. It is read at runtime from `${OBSIDIAN_API_KEY}` in `.mcp.json`.

Default connection: host `127.0.0.1`, port `27124` (Local REST API defaults). Change these via the same plugin's settings if needed.

Claude Code auto-discovers `.mcp.json` at the repo root, so no further plugin.json wiring is required.

### Caveats

- **No hard-deletes.** Obsidian lets you delete lines freely — resist the urge. This plugin's convention is **append-only + resolve buttons (or `/clear-tasks`) to retire tasks**. Deleting a task line loses history and breaks the append-only audit trail. The dashboard exposes no delete control.
- **Single-colon tag format.** The dashboard's DataviewJS parses `key:value` (single colon, double-space-separated). Vanilla Dataview field auto-parse requires `key:: value` (double colon). Do **not** switch to double-colon format unless you intend to change every planning command that reads the files.
- **Line-drift guard.** The write primitive validates that the target line still looks like a task checkbox before applying any edit. If the dashboard was open while you edited the source file externally and lines shifted, writes are safely aborted with a notice to reopen the dashboard.

---

## FAQ: missing tags

**What happens if `prio:` is missing?**
The task gets rank 99 (sorts after all valid-prio tasks) and a warning is emitted naming the file and task. Use `/add-task` or the Triage agent to add the tag.

**What happens if `due:` is missing?**
The task has no due date and sorts after all dated tasks in the due-date tiebreak. No warning for a missing due — only for a malformed due (e.g. `due:next-friday`).

**What happens if `effort:` is missing?**
The task is treated as unknown effort. It passes effort-based filters unless there is clearly no capacity. In the ranked list it sorts last in the effort tiebreak. In `/plan-day` greedy fill it is treated as large (240m) for filtering purposes.

**Can I have tasks in multiple domains?**
No. Each task lives in exactly one domain file. Domain is determined by filename, not by any tag.

**What is `tasks/inbox.md` for?**
It is a frictionless capture inbox for raw, unrefined thoughts. Dump anything there. The Triage agent clarifies items and migrates them to the correct domain file. Inbox items are never read by planning or sync commands.
