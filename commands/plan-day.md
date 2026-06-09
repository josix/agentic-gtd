---
description: Build today's ranked daily plan from tasks/*.md, filtered by available time, energy, and context. Persists the plan to tasks/plans/<date>.md.
argument-hint: "[hours] [energy:high|med|low] [context:@computer,@phone,...]"
allowed-tools: Read, Glob, Grep, Write, Edit
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

1. **Discover task files**: use Glob to find all `tasks/*.md`. Exclude any file whose basename is `inbox.md`. Also exclude any path containing `templates/` or `plans/`.

2. **Read task files**: use Read on each discovered file.

3. **Invoke gtd-prioritization skill in DAILY mode**:
   - Parse all incomplete task lines using regex `^- \[ \] (.+)$`.
   - Extract and normalize all tags per the skill's grammar (including `recurs:`/`last:` for recurring tasks).
   - Apply Engage filters in order: recurrence filter (drop recurring tasks whose effective due `last + interval` is after today, reason `recurs-not-due`), effort filter, context filter, energy filter.
   - Rank surviving tasks using the strict five-level tiebreak algorithm. Recurring tasks rank by their effective due.
   - Greedily fill up to `hours * 60` minutes of effort.

4. **Emit chat output** using the Daily Plan format from the skill:
   ```
   # Daily Plan — <today's date YYYY-MM-DD>

   1. [rank] Title — domain · effort · due · context
   ...

   ## Deferred / filtered out
   - Title — domain (reason: ...)

   ## Warnings
   - ...
   ```
   The Deferred and Warnings sections are chat-only and are NOT written to the plan note.

   The step-4 chat format above is display-only; the persisted note MUST use the `N. [<rank>] - [ ] <verbatim original task line>` format shown in step 5 — do not write the chat-style line (without `- [ ]`) to the note.

5. **Persist the plan note**: write the results to `tasks/plans/<today>.md` (where `<today>` is the runtime system date in `YYYY-MM-DD` format).

   **a. Check for existing note**: attempt to Read `tasks/plans/<today>.md`. If it exists, extract and preserve its existing `## Comments` block (all bullet lines under that heading). If the file does not exist, the Comments block starts empty.

   **b. Write the plan note**: use Write to create or overwrite `tasks/plans/<today>.md` with the following structure:

   ```
   ---
   type: plan
   plan-date: <YYYY-MM-DD>
   mode: day
   generated: <YYYY-MM-DDThh:mm>
   ---

   # Plan — <YYYY-MM-DD>

   ## Today
   1. [<rank>] - [ ] <original full task line copied verbatim with all inline tags>
   2. [<rank>] - [ ] ...

   ## Comments
   - <existing comment bullets preserved here, if any>
   ```

   Rules for the task lines in `## Today`:
   - Each line is prefixed with `N. [<rank>] ` where N is the 1-based position and `<rank>` is the gtd priority rank number (from the Priority Rank Map in the gtd-prioritization skill).
   - After the prefix, copy the VERBATIM original task line exactly as it appears in the source file (the full `- [ ] title  tag:value ...` line, including all tags). This ensures the literal `- [ ] ` substring is present for Dataview/regex parsing.
   - Include only the greedy-filled tasks (those that fit within hours). Do NOT include deferred or filtered-out tasks in the note.

6. **Auto-comment capture**: after building the plan, scan the current conversation for salient planning decisions the user made in THIS session: (a) explicit (de)prioritizations ("do X before Y", "skip Z this week"), (b) new constraints/deadlines the user stated, (c) tasks the user said to defer/drop, (d) rationale for the plan shape. Do NOT capture tool output, task lines already in the plan, your own reasoning, or generic acknowledgements. For each salient item, append one bullet to the note's `## Comments` section using Edit: `- <YYYY-MM-DDThh:mm> — <one-sentence decision in the user's framing>` (use the runtime timestamp). Dedup: read existing `## Comments` bullets first and skip near-duplicates (same normalized wording). If there are no salient decisions, leave `## Comments` unchanged (no placeholder bullets). Content comes strictly from the conversation, never invented.

7. **Confirm**: after writing, emit a single confirmation line in chat:
   ```
   Saved plan → tasks/plans/<date>.md
   ```

## Notes

- Inbox (`tasks/inbox.md`) is NEVER read — skip it by basename check.
- Also skip any file under `tasks/templates/` or `tasks/plans/` to prevent plan-note checkboxes from being counted as tasks.
- Tasks with `prio` missing or invalid get rank 99 and a warning.
- Recurring tasks (`recurs:` tag) only appear when their effective due (`last + interval`, or today if never done) is on/before today; otherwise they are listed under Deferred with reason `recurs-not-due`.
- If `hours` results in zero tasks fitting, still emit the heading and an empty numbered list, then populate Deferred with all tasks. The plan note `## Today` section will be empty (no numbered lines).
- Today's date is determined at runtime from the system clock.
- On re-run for the same date: regenerate `## Today` but always preserve `## Comments` (read existing file first).
