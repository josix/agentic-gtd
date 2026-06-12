---
description: Read-only review of all unresolved tasks across tasks/*.md, grouped by domain and sorted by prio ladder rank, showing every metadata field.
argument-hint: "[domain] (canonical name or alias from tasks/domains.md; e.g. fulltime, side, oss)"
allowed-tools: Read, Glob, Grep
---

# /review-tasks — Review All Unresolved Tasks

A read-only review surface: list every incomplete task with its full metadata so you can eyeball the whole backlog. Unlike `/plan-day` and `/plan-weekend`, this **does NOT filter, rank-and-drop, or schedule** — it shows everything. It never writes to any file.

## Argument Parsing

Parse `$ARGUMENTS`:

- **domain** (optional): if the first token matches a canonical name or alias in `tasks/domains.md` (read it), scope the review to that single file (`tasks/<canonical>.md`).
- If a domain token is present but matches nothing in `tasks/domains.md`, emit a warning and fall back to reviewing all domains.
- If no argument is given, review all domains.

## Execution Steps

1. **Discover task files**: use Glob to find all `tasks/*.md`. ALWAYS exclude any file whose basename is `inbox.md` (inbox is deliberately under-specified and is never reviewed here). If a domain argument was supplied, restrict to that single file.

2. **Read task files**: use Read on each discovered file.

3. **Parse incomplete tasks** (reuse the gtd-prioritization grammar — do NOT re-rank or filter):
   - Match incomplete tasks with regex `^- \[ \] (.+)$`. Ignore `- [x]` (completed), comment lines (`#`), and section headers.
   - **Title**: the text BEFORE the first `key:value` tag.
   - **Tags**: apply `(\w+):(\S+)` to the full line. Recognized keys: `prio`, `project`, `effort`, `impact`, `due`, `context`, `recurs`, `last`.
   - For recurring tasks (`recurs:` present), compute and show the **effective due** (`last + interval`, or "now" if never done) in the `due` cell, suffixed with the cadence, e.g. `2026-06-12 (every 3d)`. This is a read-only view — show the recurrence, do not filter on it.
   - **prio rank** (for sorting only — never dropped): fulltime=1, parttime=2, trust=3, side=4, long=5, short=6, tedious=7, missing/invalid=99.
   - Normalize `effort`, `due`, `context` per the skill's rules for display, but do NOT coerce away values — show what is present.

4. **Group and sort**:
   - Group tasks under their domain (filename stem). Use the canonical list from `tasks/domains.md` for ordering domain sections; any domain not in the registry falls last.
   - Within each domain, sort by prio rank ascending (1 → 99). For equal rank, preserve file order (do NOT reorder beyond rank — this is a review, not a re-prioritization).

5. **Emit the review** (read-only — no writes):

   ```
   # Task Review — <today's date YYYY-MM-DD>

   ## fulltime — N open
   | # | prio | task | project | effort | impact | due | context |
   |---|------|------|---------|--------|--------|-----|---------|
   | 1 | fulltime | Ship auth refactor PR | checkout | 2h | long | 2026-06-12 | @computer |
   ...

   ## parttime — N open
   | # | prio | task | project | effort | impact | due | context |
   |---|------|------|---------|--------|--------|-----|---------|
   ...

   ## side-projects — N open
   ...

   ## open-source — N open
   ...

   ## knowledge — N open
   ...

   ## Summary
   - Total open: <N> across <D> domains
   - By prio: fulltime <n> · parttime <n> · side <n> · trust <n> · long <n> · short <n> · tedious <n> · missing/invalid <n>

   ## Warnings
   - <task title> (domain): prio missing or invalid → shown with rank 99
   - <task title> (domain): malformed due date "<value>"
   ```

   - Render missing optional fields as an empty cell (or `—`), never as a fabricated value.
   - Omit a domain section entirely only if it has zero open tasks AND a specific domain was requested; otherwise show the header with "0 open".

## Notes

- **Read-only**: this command MUST NOT call Edit or Write. It only reads and reports.
- Inbox (`tasks/inbox.md`) is NEVER read — skip it by basename check.
- This is the read-side counterpart to `/add-task`. To fill in missing/ambiguous metadata surfaced in the Warnings block, use the `Triage` agent's audit mode or re-capture via `/add-task`.
- Tasks with `prio` missing or invalid are NOT dropped — they sort last (rank 99) and are flagged in Warnings.
- Today's date is determined at runtime from the system clock.
