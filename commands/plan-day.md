---
description: Build today's ranked daily plan from tasks/*.md, filtered by available time, energy, and context.
argument-hint: "[hours] [energy:high|med|low] [context:@computer,@phone,...]"
allowed-tools: Read, Glob, Grep
---

# /plan-day — Build Today's Daily Plan

## Argument Parsing

Parse `$ARGUMENTS` to extract:

- **hours**: a bare number (e.g. `4`, `6`, `8`). Default: `8`.
- **energy**: token matching `energy:high`, `energy:med`, or `energy:low`. Default: `energy:med`.
- **context**: token matching `context:...` where the value is a comma-separated list of context tags. Default: any context (no filter).

Examples:
- `/plan-day` → hours=8, energy=med, context=any
- `/plan-day 4 energy:low context:@computer,@phone` → hours=4, energy=low, context=[@computer,@phone]
- `/plan-day 6 energy:high` → hours=6, energy=high, context=any

If an unrecognized token appears, emit a warning but continue with defaults for that argument.

## Execution Steps

1. **Discover task files**: use Glob to find all `tasks/*.md`. Exclude any file whose basename is `inbox.md`.

2. **Read task files**: use Read on each discovered file.

3. **Invoke gtd-prioritization skill in DAILY mode**:
   - Parse all incomplete task lines using regex `^- \[ \] (.+)$`.
   - Extract and normalize all tags per the skill's grammar (including `recurs:`/`last:` for recurring tasks).
   - Apply Engage filters in order: recurrence filter (drop recurring tasks whose effective due `last + interval` is after today, reason `recurs-not-due`), effort filter, context filter, energy filter.
   - Rank surviving tasks using the strict five-level tiebreak algorithm. Recurring tasks rank by their effective due.
   - Greedily fill up to `hours * 60` minutes of effort.

4. **Emit output** using the Daily Plan format from the skill:
   ```
   # Daily Plan — <today's date YYYY-MM-DD>

   1. [rank] Title — domain · effort · due · context
   ...

   ## Deferred / filtered out
   - Title — domain (reason: ...)

   ## Warnings
   - ...
   ```

## Notes

- Inbox (`tasks/inbox.md`) is NEVER read — skip it by basename check.
- Tasks with `prio` missing or invalid get rank 99 and a warning.
- Recurring tasks (`recurs:` tag) only appear when their effective due (`last + interval`, or today if never done) is on/before today; otherwise they are listed under Deferred with reason `recurs-not-due`.
- If `hours` results in zero tasks fitting, still emit the heading and an empty numbered list, then populate Deferred with all tasks.
- Today's date is determined at runtime from the system clock.
