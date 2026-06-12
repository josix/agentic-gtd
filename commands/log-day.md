---
description: Log what you did today in free text; reconcile it against open tasks (mark DONE/IN-PROGRESS/WON'T FIX), capture unlisted work as new tasks, and mirror the changes into today's plan note.
argument-hint: "<free-text recap of what you worked on today>"
allowed-tools: Read, Edit, Write, Glob, Grep, Task, AskUserQuestion
---

# /log-day — Log Your Day and Close the GTD Loop

## Overview

`/log-day` closes the GTD capture/plan loop: you describe in natural language what you worked on today, and the command reconciles that recap against your open tasks. It marks tasks DONE, IN-PROGRESS, or WON'T FIX using the same non-destructive resolution grammar as `/clear-tasks` (lines stay as records; checkbox and tags are updated in place). Additionally, `/log-day` removes any existing `status:` token when a task is resolved as DONE or WON'T FIX, following the Dashboard convention that resolution clears status — this step is not part of `/clear-tasks`. Work you did that had no pre-existing task is captured as new tasks via the Triage agent in RECAP-CLARIFY mode. Finally, all changes are mirrored into `tasks/plans/<today>.md` if that plan note exists. This command never reads or writes `tasks/inbox.md`. Plan writes only touch `tasks/plans/<today>.md`.

## Argument Parsing

`$ARGUMENTS` is the user's free-text recap of what they worked on today. It may be a single sentence or several paragraphs. No structured flags are expected. If `$ARGUMENTS` is empty, ask the user to provide their recap before proceeding.

## Execution Steps

### Step 1 — Discover & read open tasks

Use Glob to find all `tasks/*.md`. ALWAYS exclude any file whose basename is `inbox.md`. Also exclude any path containing `templates/` or `plans/`. Read `tasks/domains.md` for the canonical domain list.

Parse every line in the discovered files matching `^- \[ \] (.+)$` (open tasks only; ignore `- [x]`, `- [-]`, comment lines, and headers). For each matched line record:

- **file** — the source path
- **verbatim line** — the full exact line as it appears in the file (used as `old_string` in later edits)
- **title** — the text BEFORE the first `key:value` token
- **tags** — all `(\w+):(\S+)` pairs extracted from the line; note whether `recurs:` and/or `status:` are present

### Step 2 — Match recap fragments to open tasks

Segment `$ARGUMENTS` into discrete work fragments (one per described activity or project). Matching is model-driven and semantic — do NOT use regex alone.

For each fragment, compare it against the titles and project tags of all open tasks (fuzzy/semantic match). Assign each fragment to one of three buckets:

| Bucket | Condition |
|--------|-----------|
| **Matched** | Exactly one open task is a plausible match |
| **Ambiguous** | Two or more open tasks are plausible matches |
| **Unmatched** | No open task maps to this fragment |

For Matched fragments, infer a proposed outcome from the fragment's language:

| Language signals | Proposed outcome |
|-----------------|-----------------|
| "finished", "shipped", "done", "completed", "fixed", "closed" | DONE |
| "worked on", "spent time on", "debugged", "continued", "started", "in progress" | IN-PROGRESS |
| "dropped", "abandoned", "not doing", "cancelling", "won't fix" | WON'T FIX |
| Neutral / unclear | NO-CHANGE (show to user for confirmation) |

### Step 3 — Present reconciliation summary (display-only)

Before asking any questions, display a read-only reconciliation summary in chat. No writes occur in this step.

```
Reconciliation for <today>:

Matched (N):
  - "<fragment>" → [<domain>] "<task title>"  proposed: <DONE|IN-PROGRESS|WON'T FIX|NO-CHANGE>

Ambiguous (N):
  - "<fragment>" → candidates:
      a) [<domain>] "<task title>"
      b) [<domain>] "<task title>"

Unmatched (N):
  - "<fragment>" → no open task found (will be captured as new)
```

### Step 4 — Confirm via AskUserQuestion (GATE — no write before this step completes)

All writes are gated behind explicit user confirmation. Use `AskUserQuestion` with at most 4 questions per call; issue successive calls for additional questions.

**Resolve ambiguities first.** For each ambiguous fragment, ask one question listing the candidate task titles plus a "None of these — treat as new work" option. Move resolved candidates into the Matched bucket (or Unmatched if "None of these").

**Confirm outcomes for Matched tasks.** For each matched task, ask the user to confirm or override the proposed outcome. Present the model's inference as the first option labeled "(Recommended)":

- DONE
- IN PROGRESS
- WON'T FIX
- No change

Optionally also ask a free-text **Note** for the task: if provided, append as `note:"<text>"`.

Because `AskUserQuestion` allows at most 4 questions per call, batch up to 4 task confirmations per call. For more than 4 matched tasks, issue successive calls.

### Step 5 — Apply status edits

For each confirmed task (outcome is not "No change"), use Edit to update ONLY that task's line. The `old_string` MUST be the exact full existing line to guarantee a unique match. Never touch any other line.

Resolution grammar (mirrors `/clear-tasks`):

| Outcome | Checkbox change | Tags appended / modified |
|---------|-----------------|-------------------------|
| DONE (non-recurring) | `- [ ]` → `- [x]` | append `  resolution:done  resolved:<today>` at end of line; remove any existing `status:` token |
| DONE (recurring — `recurs:` present) | stays `- [ ]` | set/update `last:<today>` (replace existing value or append `  last:<today>`); remove any `status:` token; do NOT append `resolution:`/`resolved:` |
| WON'T FIX | `- [ ]` → `- [-]` | append `  resolution:wontfix  resolved:<today>` at end of line; remove any existing `status:` token |
| IN-PROGRESS | stays `- [ ]` | add `status:in-progress` if absent, keep if present; no resolution tags |
| No change | no edit | — |

- `<today>` is the runtime system date in `YYYY-MM-DD` format.
- Use double-space separators between tags (same as all other task lines).
- If a note was given, append `  note:"<text>"` immediately after the resolution tags.

### Step 6 — Capture unmatched work via Triage RECAP-CLARIFY mode

If there are unmatched fragments, invoke the Triage subagent using the **Task** tool. Pass all unmatched fragments inline and include this verbatim instruction:

> "You are in RECAP-CLARIFY mode. Do NOT read tasks/inbox.md and do NOT write any file. Return a triage-proposals block, one proposal per fragment."

Parse the returned `triage-proposals` fenced block. Each proposal has fields: `raw_text`, `reworded_title`, `domain`, `prio`, `project`, `impact`, `effort`, `due`, `context`, `ambiguity_notes`.

If the block is malformed or missing, fall back: use the raw fragment as `reworded_title`, `domain:(unknown)`, all other fields `(none)`.

**Confirm which to add**: issue an `AskUserQuestion` multiSelect listing each proposal. Deselected proposals are discarded (not added to any file).

**Per-item field confirmation** (for each selected proposal): issue ONE `AskUserQuestion` call with at most 4 questions (proposed value listed first, labeled "(Recommended)"):

1. **Priority** — the 7 tiers (`fulltime`/`parttime`/`side`/`trust`/`long`/`short`/`tedious`)
2. **Effort** — `30m` / `1h` / `2h` / `3h` / Other
3. **Status** — Already finished today / Still in progress / Not yet started
4. **Context** — sensible `@tag` options + Other

Ask **Domain** only when the proposed domain is `(unknown)` or ambiguous. When so, issue a short leading `AskUserQuestion` with a single Domain question (listing canonical domains from `tasks/domains.md`) BEFORE the four-question call. An unambiguous domain is auto-accepted and not asked.

**Append the new task line** to the end of `tasks/<domain>.md` (Read first, then append). Tag order follows the `/add-task` convention:
```
- [ ] <title>  prio:<value>  [project:<value>]  [effort:<value>]  [impact:<value>]  [due:<value>]  [recurs:<value>]  [last:<value>]  [context:<value>]
```

`impact` is included only for `fulltime` or `parttime` domains. Use double-space separators. Emit only populated tags.

**Resolved form for work already finished today**: append as a completed line:
```
- [x] <title>  <tags>  resolution:done  resolved:<today>
```

**Still-in-progress new work**: append with `status:in-progress`:
```
- [ ] <title>  <tags>  status:in-progress
```

**Not-yet-started new work**: append as plain open task:
```
- [ ] <title>  <tags>
```

This is a NEW line appended to the domain file — this is not an in-place edit of an existing line. The clear-tasks in-place exception does not apply here.

### Step 7 — Reflect into today's plan note

Determine `<today>` from the runtime system clock (`YYYY-MM-DD`). Attempt to Read `tasks/plans/<today>.md`.

- **File absent** — SKIP plan reflection entirely. Note in chat:
  ```
  No plan note for <today> — skipping plan reflection (run /plan-day to create one).
  ```
  Do NOT create the file.

- **File present, `mode: week` (or any non-day mode)** — do NOT rewrite `## Today` or day-bucket lines. Only append the Comments bullet (see below). Note in chat that `## Today` entries were not updated.

- **File present, `mode: day`** — reconcile `## Today` entries. For each numbered entry in `## Today`, extract the embedded task line (everything after the `N. [<rank>] ` prefix). Compare by EXACT verbatim line-text match against the original task lines affected in Steps 5 and 6. For each match, update the embedded line in place to mirror the Step 5/6 result (apply the same checkbox and tag edits), preserving the `N. [<rank>] ` prefix — surgical Edit, `old_string` = the full `N. [<rank>] <old task line>` entry. If no exact match is found for a plan entry, skip it silently and note the skip in chat. Never fuzzy-edit plan entries. Tasks not already in `## Today` are NOT added to the plan note.

**Always** (when the plan file exists): append ONE timestamped bullet to `## Comments`. Read existing `## Comments` bullets first and skip if a near-duplicate already exists (same normalized wording). Format:
```
- <YYYY-MM-DDThh:mm> — Logged day: N done, M in-progress, K won't-fix, J new task(s) captured.
```
Where N, M, K, J are counts from this session. Preserve all existing bullets.

### Step 8 — Confirm output block (chat-only)

After all writes, emit:

```
Logged day for <today>:
  Resolved: <list of resolved tasks with outcome>
  Recurring rolled: <list of recurring tasks with new last: date>
  New tasks added: <list of new task titles with domain>
  Plan note: <updated | no plan note for <today> | mode:week — Today not rewritten>
Warnings: <any warnings, e.g. ambiguous fragments left unresolved, domain unknown>
```

## Notes

- **Non-destructive**: resolved lines remain in their domain files as a permanent record. The in-place edit of checkbox and tags (Step 5) is the same sanctioned exception as `/clear-tasks`.
- **`tasks/inbox.md` is never read or written** by this command — not in task discovery, not in new-task capture.
- **Plan writes only touch `tasks/plans/<today>.md`** — no other plan notes are modified.
- **Dashboard and `/sync-github` are pull-based**: no push is needed after edits; they will pick up the changes on next run.
- **Every write is gated behind `AskUserQuestion`**: no edit or append occurs before Step 4/6 confirmation.
- **Read-side counterparts**: use `/review-tasks` to inspect the full task backlog, `/clear-tasks` for manual one-off resolution, and `/plan-day` to rebuild today's plan after logging.
