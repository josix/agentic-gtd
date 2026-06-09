---
description: Run a GTD Weekly-Review sweep and build a weekend-weighted ranked plan favoring side projects, open source, and knowledge over full-time work.
argument-hint: "[hours]"
allowed-tools: Read, Glob, Grep
---

# /plan-weekend — Build a Weekend Plan with Weekly Review

## Argument Parsing

Parse `$ARGUMENTS` to extract:

- **hours**: a bare number (e.g. `6`, `10`, `12`). Default: `12`.

Example:
- `/plan-weekend` → hours=12
- `/plan-weekend 8` → hours=8

## Execution Steps

1. **Discover task files**: use Glob to find all `tasks/*.md`. Exclude any file whose basename is `inbox.md`.

2. **Read task files**: use Read on each discovered file.

3. **Invoke gtd-prioritization skill in WEEKEND mode**:

   **a. Weekly Review sweep** (emit FIRST, before the ranked plan):
   - Identify overdue tasks: `due < today` (ISO date comparison). Flag with `[OVERDUE]`. For recurring tasks (`recurs:`), compare effective due (`last + interval`) `< today`.
   - Identify stale tasks: no `due` date AND no `project` tag. Flag as potentially stale. Recurring tasks are NEVER stale — exclude them.
   - Identify missing/invalid-metadata tasks: missing `prio`, `effort`, or `due`. List which fields are absent. Do NOT flag a recurring task for a missing `due` (it derives from `recurs`/`last`).
   - Recurrence eligibility (effective due ≤ today) applies to the ranked plan below, just like daily mode.

   **b. Rank tasks using weekend domain weighting**:
   - Domain tie-break order (weekend, reversed from daily): `side-projects` < `open-source` < `knowledge` < `parttime` < `fulltime`
   - Primary ranking is still by prio rank ascending (1=fulltime, 2=parttime, 3=side, … 7=tedious, 99=missing).
   - All other tiebreaks (due, effort, alphabetical) apply identically to daily mode.

   **c. Fulltime sectioning**:
   - Non-overdue `prio:fulltime` tasks → remove from main list, place in `## Full-time (optional this weekend)`.
   - Overdue `prio:fulltime` tasks → remain in main ranked list, flagged `[OVERDUE]`.

   **d. Greedy fill**: accumulate effort up to `hours * 60` minutes. Overflow goes to Deferred.

4. **Emit output** using the Weekend Plan format:
   ```
   # Weekend Plan — <today's date YYYY-MM-DD>

   ## Weekly Review sweep

   ### Overdue
   - [OVERDUE] Title — domain · due:<date>

   ### Stale (no due + no project)
   - Title — domain

   ### Missing or invalid metadata
   - Title — domain · missing: prio, effort

   ## Weekend Plan (ranked)

   1. [rank] Title — domain · effort · due · context
   ...

   ## Full-time (optional this weekend)
   - Title — fulltime · effort · due · context

   ## Warnings
   - ...
   ```

## Notes

- Inbox (`tasks/inbox.md`) is NEVER read — skip by basename check.
- Overdue fulltime tasks stay in the main ranked list even though normal fulltime tasks are sectioned out.
- A task can appear in the Weekly Review sweep AND in the ranked plan (sweep is informational, not a filter).
- Today's date is determined at runtime from the system clock.
