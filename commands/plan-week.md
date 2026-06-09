---
description: Build a 7-day ranked weekly plan from tasks/*.md, bucketed by effective due date, with per-day greedy fill. Persists the plan to tasks/plans/<date>.md.
argument-hint: "[hours-per-day]"
allowed-tools: Read, Glob, Grep, Write, Edit
---

# /plan-week — Build a 7-Day Weekly Plan

## Argument Parsing

Parse `$ARGUMENTS` to extract:

- **hours-per-day**: a bare number (e.g. `6`, `8`, `10`). Default: `8`.

Examples:
- `/plan-week` → hours-per-day=8
- `/plan-week 6` → hours-per-day=6

If an unrecognized token appears, emit a warning but continue with the default.

## Execution Steps

1. **Discover task files**: use Glob to find all `tasks/*.md`. Exclude any file whose basename is `inbox.md`. Also exclude any path containing `templates/` or `plans/`.

2. **Read task files**: use Read on each discovered file.

3. **Parse and normalize tasks**: using the gtd-prioritization skill's grammar:
   - Parse all incomplete task lines using regex `^- \[ \] (.+)$`.
   - Extract and normalize all tags: `prio`, `project`, `effort`, `impact`, `due`, `context`, `recurs`, `last`.
   - Normalize effort, due, context, recurs, last per the skill's normalization rules.

4. **Compute 7-day window**: determine `today` from the runtime system clock. The window is `today` through `today + 6` (inclusive), producing 7 buckets: today, today+1, today+2, today+3, today+4, today+5, today+6.

5. **Bucket each task by effective due date**:

   For each parsed incomplete task, determine its effective due:
   - **Recurring tasks** (`recurs:` present): effective due = `last + interval` (or today if `last` absent/never done). If effective due > window end (today+6), drop the task from the plan and list under chat Deferred with reason `recurs-not-due` (it is not due within this week). Otherwise, proceed with bucketing using the effective due.
   - **Overdue tasks** (effective due < today): place in the **Today** bucket regardless of the original due.
   - **Due within window** (today ≤ effective due ≤ today+6): place in the bucket matching the exact effective due date.
   - **Due after window end** (effective due > today+6): exclude from the plan. List under chat Deferred with reason `out-of-window`.
   - **No due date, non-recurring**: place in the **Today** bucket (user-confirmed default).

6. **Per-day ranking and greedy fill**: for each day bucket (today through today+6):
   - Apply gtd-prioritization DAILY-mode ranking within the bucket (strict five-level tiebreak: prio rank, due-date proximity, effort ascending, domain order, alphabetical).
   - Greedily fill up to `hours-per-day * 60` minutes for that day.
   - Tasks that exceed the day's remaining capacity go to chat Deferred with reason `over-time` for that day's date. Do NOT auto-push overflow tasks to the next day.

7. **Emit chat output**:
   ```
   # Weekly Plan — <today's date YYYY-MM-DD> (7 days)

   ## Today (<YYYY-MM-DD>)
   1. [rank] Title — domain · effort · due · context
   ...

   ## <YYYY-MM-DD> (tomorrow / weekday name)
   1. [rank] Title — domain · effort · due · context
   ...

   (one section per day that has ≥1 planned task)

   ## Deferred / excluded
   - Title — domain (reason: recurs-not-due | out-of-window | over-time <date>)

   ## Warnings
   - ...
   ```
   Deferred and Warnings are chat-only and are NOT written to the plan note.

   The step-7 chat format above is display-only; the persisted note MUST use the `N. [<rank>] - [ ] <verbatim original task line>` format shown in step 8 — do not write the chat-style line (without `- [ ]`) to the note.

8. **Persist the plan note**: write the results to `tasks/plans/<today>.md` (where `<today>` is the runtime system date in `YYYY-MM-DD` format).

   **a. Check for existing note**: attempt to Read `tasks/plans/<today>.md`. If it exists, extract and preserve its existing `## Comments` block (all bullet lines under that heading). If the file does not exist, the Comments block starts empty.

   **b. Write the plan note**: use Write to create or overwrite `tasks/plans/<today>.md` with the following structure:

   ```
   ---
   type: plan
   plan-date: <YYYY-MM-DD>
   mode: week
   generated: <YYYY-MM-DDThh:mm>
   ---

   # Plan — <YYYY-MM-DD>

   ## Today
   1. [<rank>] - [ ] <original full task line copied verbatim with all inline tags>
   2. [<rank>] - [ ] ...

   ## Following days

   ### <YYYY-MM-DD>
   1. [<rank>] - [ ] <original full task line copied verbatim with all inline tags>

   ### <YYYY-MM-DD>
   1. [<rank>] - [ ] ...

   ## Comments
   - <existing comment bullets preserved here, if any>
   ```

   Rules for the task lines:
   - Each line is prefixed with `N. [<rank>] ` where N is the 1-based position within that day's list and `<rank>` is the gtd priority rank number (from the Priority Rank Map in the gtd-prioritization skill).
   - After the prefix, copy the VERBATIM original task line exactly as it appears in the source file (the full `- [ ] title  tag:value ...` line, including all tags). This ensures the literal `- [ ] ` substring is present for Dataview/regex parsing.
   - Include only greedy-filled tasks for each day. Do NOT include deferred or filtered-out tasks in the note.
   - `## Following days` contains one `### YYYY-MM-DD` subsection per future day that has ≥1 planned task. Days with zero planned tasks are omitted.
   - If `## Today` has no tasks, write `## Today` with an empty body (no numbered lines).

9. **Auto-comment capture**: after building the plan, scan the current conversation for salient planning decisions the user made in THIS session: (a) explicit (de)prioritizations ("do X before Y", "skip Z this week"), (b) new constraints/deadlines the user stated, (c) tasks the user said to defer/drop, (d) rationale for the plan shape. Do NOT capture tool output, task lines already in the plan, your own reasoning, or generic acknowledgements. For each salient item, append one bullet to the note's `## Comments` section using Edit: `- <YYYY-MM-DDThh:mm> — <one-sentence decision in the user's framing>` (use the runtime timestamp). Dedup: read existing `## Comments` bullets first and skip near-duplicates (same normalized wording). If there are no salient decisions, leave `## Comments` unchanged (no placeholder bullets). Content comes strictly from the conversation, never invented.

10. **Confirm**: after writing, emit a single confirmation line in chat:
    ```
    Saved plan → tasks/plans/<date>.md
    ```

## Notes

- Inbox (`tasks/inbox.md`) is NEVER read — skip it by basename check.
- Also skip any file under `tasks/templates/` or `tasks/plans/` to prevent plan-note checkboxes from being counted as tasks.
- Tasks with `prio` missing or invalid get rank 99 and a warning.
- Recurring tasks are filtered per recurrence eligibility: only those with effective due ≤ window end are considered; if effective due > today+6 they are deferred with reason `recurs-not-due`. Within the window, overdue recurring tasks (effective due < today) land in Today.
- No-due non-recurring tasks always go to Today (not spread across the week).
- Per-day overflow is listed under Deferred with the day's date; tasks are never silently pushed to the next day.
- Today's date is determined at runtime from the system clock.
- On re-run for the same date: regenerate `## Today` and `## Following days` but always preserve `## Comments` (read existing file first).
- Week mode described in skills/gtd-prioritization/SKILL.md under "Week Mode" subsection.
