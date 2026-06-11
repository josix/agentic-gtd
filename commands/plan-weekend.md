---
description: Run a GTD Weekly-Review sweep and build a weekend-weighted ranked plan favoring side projects, open source, and knowledge over full-time work. Persists the plan to tasks/plans/<date>.md.
argument-hint: "[hours]"
allowed-tools: Read, Glob, Grep, Write, Edit
---

# /plan-weekend — Build a Weekend Plan with Weekly Review

## Argument Parsing

Parse `$ARGUMENTS` to extract:

- **hours**: a bare number (e.g. `6`, `10`, `12`). Default: `12`.

Example:
- `/plan-weekend` → hours=12
- `/plan-weekend 8` → hours=8

## Execution Steps

1. **Discover task files**: use Glob to find all `tasks/*.md`. Exclude any file whose basename is `inbox.md`. Also exclude any path containing `templates/` or `plans/`.

2. **Read task files**: use Read on each discovered file.

3. **Invoke gtd-prioritization skill in WEEKEND mode**:

   **a. Weekly Review sweep** (emit FIRST, before the ranked plan):
   - Identify overdue tasks: `due < today` (ISO date comparison). Flag with `[OVERDUE]`. For recurring tasks (`recurs:`), compare effective due (`last + interval`) `< today`.
   - Identify stale tasks: no `due` date AND no `project` tag. Flag as potentially stale. Recurring tasks are NEVER stale — exclude them.
   - Identify missing/invalid-metadata tasks: missing `prio`, `effort`, or `due`. List which fields are absent. Do NOT flag a recurring task for a missing `due` (it derives from `recurs`/`last`).
   - Recurrence eligibility (effective due ≤ today) applies to the ranked plan below, just like daily mode.

   **b. Rank tasks using weekend domain weighting**:
   - Domain tie-break order for weekend is driven by the `weekend_order` column in `tasks/domains.md`. Default order (lower = higher priority): `side-projects`(1) < `open-source`(2) < `knowledge`(3) < `parttime`(4) < `fulltime`(5).
   - Primary ranking is still by prio rank ascending (1=fulltime, 2=parttime, 3=side, … 7=tedious, 99=missing).
   - Tiebreak order uses the strict six-level algorithm: (1) prio rank, (2) manual `order:` ascending (within-rank; missing = sorts last), (3) due-date proximity, (4) effort ascending, (5) weekend domain order per registry, (6) alphabetical.

   **c. Fulltime sectioning**:
   - Non-overdue `prio:fulltime` tasks → remove from main list, place in `## Full-time (optional this weekend)`.
   - Overdue `prio:fulltime` tasks → remain in main ranked list, flagged `[OVERDUE]`.

   **d. Greedy fill**: accumulate effort up to `hours * 60` minutes. Overflow goes to Deferred.

4. **Emit chat output** using the Weekend Plan format:
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
   The Weekly Review sweep and Warnings sections are chat-only and are NOT written to the plan note.

   The step-4 chat format above is display-only; the persisted note MUST use the `N. [<rank>] - [ ] <verbatim original task line>` format shown in step 5 — do not write the chat-style line (without `- [ ]`) to the note.

5. **Persist the plan note**: write the results to `tasks/plans/<today>.md` (where `<today>` is the runtime system date in `YYYY-MM-DD` format).

   **a. Check for existing note**: attempt to Read `tasks/plans/<today>.md`. If it exists, extract and preserve its existing `## Comments` block (all bullet lines under that heading). If the file does not exist, the Comments block starts empty.

   **b. Write the plan note**: use Write to create or overwrite `tasks/plans/<today>.md` with the following structure:

   ```
   ---
   type: plan
   plan-date: <YYYY-MM-DD>
   mode: weekend
   generated: <YYYY-MM-DDThh:mm>
   ---

   # Plan — <YYYY-MM-DD>

   ## Today
   1. [<rank>] - [ ] <original full task line copied verbatim with all inline tags>
   2. [<rank>] - [ ] ...

   ## Full-time (optional)
   1. [<rank>] - [ ] <original full fulltime task line copied verbatim>
   2. [<rank>] - [ ] ...

   ## Comments
   - <existing comment bullets preserved here, if any>
   ```

   Rules for the task lines in `## Today` and `## Full-time (optional)`:
   - `## Today` holds the greedy-filled weekend ranked plan (the main actionable list). `## Full-time (optional)` holds the non-overdue `prio:fulltime` tasks that were sectioned out in step 3c (overdue fulltime tasks stay in `## Today`).
   - Each line is prefixed with `N. [<rank>] ` where N is the 1-based position within its section and `<rank>` is the gtd priority rank number (from the Priority Rank Map in the gtd-prioritization skill).
   - After the prefix, copy the VERBATIM original task line exactly as it appears in the source file (the full `- [ ] title  tag:value ...` line, including all tags). This ensures the literal `- [ ] ` substring is present for Dataview/regex parsing.
   - Include only the greedy-filled tasks in `## Today` (those that fit within hours). Do NOT include deferred or filtered-out tasks. If `## Full-time (optional)` has no tasks, still emit the heading with no numbered lines.

6. **Auto-comment capture**: after building the plan, scan the current conversation for salient planning decisions the user made in THIS session: (a) explicit (de)prioritizations ("do X before Y", "skip Z this weekend"), (b) new constraints/deadlines the user stated, (c) tasks the user said to defer/drop, (d) rationale for the plan shape. Do NOT capture tool output, task lines already in the plan, your own reasoning, or generic acknowledgements. For each salient item, append one bullet to the note's `## Comments` section using Edit: `- <YYYY-MM-DDThh:mm> — <one-sentence decision in the user's framing>` (use the runtime timestamp). Dedup: read existing `## Comments` bullets first and skip near-duplicates (same normalized wording). If there are no salient decisions, leave `## Comments` unchanged (no placeholder bullets). Content comes strictly from the conversation, never invented.

7. **Confirm**: after writing, emit a single confirmation line in chat:
   ```
   Saved plan → tasks/plans/<date>.md
   ```

## Notes

- Inbox (`tasks/inbox.md`) is NEVER read — skip by basename check.
- Also skip any file under `tasks/templates/` or `tasks/plans/` to prevent plan-note checkboxes from being counted as tasks.
- Overdue fulltime tasks stay in the main ranked list (`## Today`) even though normal fulltime tasks are sectioned out into `## Full-time (optional)`.
- A task can appear in the Weekly Review sweep AND in the ranked plan (sweep is informational, not a filter). The sweep is chat-only and is not persisted.
- The plan note is written to the same path (`tasks/plans/<today>.md`) used by `/plan-day` and `/plan-week`. Running more than one planning command on the same date overwrites the earlier `## Today`/`## Full-time` sections (the `mode:` frontmatter records which command wrote it), but `## Comments` is always preserved across re-runs.
- Today's date is determined at runtime from the system clock.
- On re-run for the same date: regenerate `## Today` and `## Full-time (optional)` but always preserve `## Comments` (read existing file first).
