---
description: Resolve (clear) open tasks by marking them DONE or WON'T FIX in place, with a resolution tag and date. Non-destructive — the line stays as a record.
argument-hint: "[domain] [matcher text] (e.g. `fulltime auth` to target the auth task in fulltime)"
allowed-tools: Read, Edit, Glob, Grep, AskUserQuestion
---

# /clear-tasks — Resolve Open Tasks (DONE / WON'T FIX)

Clear open tasks by resolving them. "Clearing" means marking a task **DONE** or **WON'T FIX** — it does NOT delete the line. Resolved tasks stay in the file as a record but automatically drop out of `/plan-day`, `/plan-weekend`, and `/review-tasks` (which only match `- [ ]`).

## Resolution semantics

| Resolution | Checkbox change | Appended tags |
|------------|-----------------|---------------|
| DONE       | `- [ ]` → `- [x]` | `resolution:done  resolved:<YYYY-MM-DD>` |
| WON'T FIX  | `- [ ]` → `- [-]` | `resolution:wontfix  resolved:<YYYY-MM-DD>` |

- `resolved:` date is determined at runtime from the system clock.
- Append the resolution tags at the END of the existing task line, using the same double-space separator. Do NOT remove or reorder the task's existing tags.

## Argument Parsing

Parse `$ARGUMENTS`:

- **domain** (optional): if the first token is a known domain alias, scope the search to that single file. Same map as `/add-task` and `/review-tasks`:
  | Argument value            | Target file                  |
  |---------------------------|------------------------------|
  | `fulltime`                | `tasks/fulltime.md`          |
  | `parttime`, `part-time`, or `pt` | `tasks/parttime.md`  |
  | `side` or `side-projects` | `tasks/side-projects.md`     |
  | `oss` or `open-source`    | `tasks/open-source.md`       |
  | `knowledge`               | `tasks/knowledge.md`         |
- **matcher** (optional): remaining free text. Case-insensitive substring match against open task titles to narrow candidates.
- If a leading token looks like a domain but matches none of the above, warn and treat the whole argument as a matcher across all domains.

## Execution Steps

1. **Discover & read**: Glob `tasks/*.md`, ALWAYS excluding `inbox.md` by basename. If a domain was supplied, restrict to that file. Read the file(s).

2. **Collect open candidates**: parse only incomplete tasks with regex `^- \[ \] (.+)$` (ignore `- [x]`, `- [-]`, comments, headers). If a matcher was given, keep only tasks whose title contains the matcher (case-insensitive). Record each candidate's file and line number.

3. **Handle candidate count**:
   - **0 candidates** → report "No matching open tasks to clear." and STOP (no edits).
   - **1 candidate** → skip selection; go straight to the resolution question for that task.
   - **2–4 candidates** → ask **Q1 (Select, multiSelect)**: one option per candidate task (label = short title, description = domain · prio · due). The user selects which to clear.
   - **>4 candidates** → do NOT truncate silently. Print the full numbered candidate list as text (grouped by domain, showing prio/due), then ask the user to narrow: present an `AskUserQuestion` with options to (a) scope to one domain, (b) re-run with a matcher, or (c) pick "Other" and type the line numbers to clear. Proceed once the selection is ≤ a workable set.

4. **Ask resolution intent — ALWAYS, never assume** via `AskUserQuestion`. The command MUST NOT clear any task without first asking whether it is **DONE** or **WON'T FIX**. Do not default or infer the resolution — the user decides explicitly.
   - **Ask PER selected task** so each can differ (a batch often mixes completed and abandoned tasks). Because `AskUserQuestion` allows up to 4 questions per call, ask one question per task in a single call when ≤4 tasks are selected; for >4, ask in successive calls (batches of 4). Each question:
     - Header: `Resolution`; question text names the task title.
     - Options: **DONE** — task completed; **WON'T FIX** — abandoned / no longer relevant. (User may pick "Other" to cancel clearing that specific task.)
   - Shortcut for a uniform batch: you MAY first ask one question "Same resolution for all N tasks?" with options **All DONE**, **All WON'T FIX**, **Decide per task**. Only if the user picks a uniform option do you skip the per-task questions; "Decide per task" falls back to the per-task questions above. Either way, the intent is always explicitly asked — never silently applied.
   - Optionally also ask a free-text **Note**: if provided, append it as `note:"<text>"` — keep it short; omit if empty.

5. **Apply edits (in place, surgical)**: for each selected task, use Edit to change ONLY that line:
   - Replace the leading `- [ ]` with `- [x]` (DONE) or `- [-]` (WON'T FIX).
   - Append `  resolution:<done|wontfix>  resolved:<YYYY-MM-DD>` (and `  note:"..."` if given) at the end of the line.
   - The `old_string` for each Edit MUST be the exact full existing line so the match is unique; NEVER touch any other line, the header, or other tasks.

6. **Confirm**:
   ```
   Cleared N task(s):
   - [x] <title>  (fulltime, resolution:done, resolved:2026-06-08)
   - [-] <title>  (knowledge, resolution:wontfix, resolved:2026-06-08)
   ```

## Notes

- **Non-destructive**: this command never deletes task lines. To remove or archive resolved (`- [x]` / `- [-]`) lines later, that's a separate operation — ask explicitly.
- **In-place edit is the intended exception** to the plugin's append-only rule: clearing legitimately modifies the target task's own line. All OTHER lines remain untouched.
- Inbox (`tasks/inbox.md`) is never read here — clear it via the `Triage` agent instead.
- Resolved tasks are automatically excluded from `/plan-day`, `/plan-weekend`, and `/review-tasks` because those only match `- [ ]`.
- If the user supplied a matcher that is dangerously broad (would select every open task), confirm before applying.
