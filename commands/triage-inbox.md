---
description: Read tasks/inbox.md, clarify each open raw item via the Triage agent, confirm the proposals with the user, then append well-formed lines to the correct domain files and mark processed inbox lines in place.
argument-hint: "[--dry-run]"
allowed-tools: Read, Edit, Write, Glob, Task, AskUserQuestion
---

# /triage-inbox — Clarify and File Inbox Items

Route-back target for the Obsidian dashboard "Copy triage command" button.  
Reads `tasks/inbox.md`, turns raw capture lines into well-formed GTD task lines (via the Triage agent), and files them into the correct domain files — all after user confirmation.

**Source of truth**: markdown files only. This command never touches `.task-manager.local.md`. No lines are deleted — resolved inbox lines are marked `[x]` in place.

---

## Domain Mapping

Same as `/add-task` and `/clear-tasks`:

| Domain key      | Target file                  |
|-----------------|------------------------------|
| `fulltime`      | `tasks/fulltime.md`          |
| `parttime`      | `tasks/parttime.md`          |
| `side-projects` | `tasks/side-projects.md`     |
| `open-source`   | `tasks/open-source.md`       |
| `knowledge`     | `tasks/knowledge.md`         |

---

## Usage

```
/triage-inbox
/triage-inbox --dry-run
```

- **No arguments** (default): read inbox, propose clarifications, confirm, write.
- **`--dry-run`**: show the proposals but write nothing — useful for previewing before committing.

---

## Ordered Flow

### Step 1 — READ INBOX

Read `tasks/inbox.md`. Collect every line matching `^- \[ \] (.+)$` (open, unresolved items only). Skip `- [x]`, `- [-]`, comment lines (`#`), and section headers.

If zero open items are found, report:
```
Inbox is empty — nothing to triage.
```
and STOP (no edits).

### Step 2 — DELEGATE TO TRIAGE AGENT

Use the **Task** tool to invoke the `Triage` subagent in INBOX-CLARIFY/standalone mode. Pass all open inbox items as input.

Instruction to include verbatim:
> "You are in INBOX-CLARIFY mode (standalone). Read the raw items below and return a `triage-proposals` fenced block containing one proposal per item. Do NOT write any files — only return the block."

Each proposal in the block should follow the task-proposal format from the Triage agent's PROPOSAL MODE output, extended with a `raw_text` field identifying the original inbox line:

```
raw_text: <the exact original inbox line text, for matching>
reworded_title: <imperative, verb-first next action>
domain: <fulltime|parttime|side-projects|open-source|knowledge>
prio: <fulltime|parttime|side|trust|long|short|tedious>
project: <name | (none)>
impact: <long|short | (none)>
effort: <e.g. 2h, 30m | (none)>
due: <YYYY-MM-DD | (none)>
recurs: <interval e.g. daily, weekly, 3d | (none)>
last: <YYYY-MM-DD | (none)>
context: <@tag[,@tag...] | (none)>
ambiguity_notes: <free text | "none">
```

If the Triage agent's response is missing or malformed for any item, fall back to using the raw text as the `reworded_title` with `domain: (unknown)` and all other fields `(none)`.

### Step 3 — PRESENT PROPOSALS

Present all proposals in a single consolidated confirmation block (do not issue one prompt per item). Format:

```
Triage proposals (N items):

1. "<raw text>"
   → [domain] prio:<prio>  <reworded_title>
     effort:<effort>  due:<due>  context:<context>
     Ambiguity: <ambiguity_notes>

2. ...
```

Flag items whose `domain` is `(unknown)` or whose `ambiguity_notes` is non-trivial — the user will need to resolve these in the confirm step.

If `--dry-run` was supplied, emit the proposals and STOP here. Do not proceed to Step 4.

### Step 4 — CONFIRM via AskUserQuestion

Issue **one consolidated `AskUserQuestion` call** covering all proposals. Use a multiSelect where each option is a summary of one proposal (label = `#N: <reworded_title>` truncated, description = domain + prio). The user selects which proposals to apply; deselected items are skipped (left in inbox unchanged).

Include an "Other" option so the user can type adjustments (e.g. "1: change domain to side-projects").

If any item had `ambiguity_notes` that requires a human decision (unclear domain, unclear next action), add a targeted follow-up `AskUserQuestion` call for that item alone (up to 4 questions per call; batch if more). Do not proceed to Step 5 until every selected item has a resolved domain in the valid Domain Mapping table.

### Step 5 — APPLY (append-only to domain files, mark inbox in place)

For each confirmed proposal:

1. **Construct the well-formed task line** following add-task's tag-order convention:
   ```
   - [ ] <reworded_title>  prio:<value>  [project:<value>]  [effort:<value>]  [impact:<value>]  [due:<value>]  [recurs:<value>]  [last:<value>]  [context:<value>]
   ```
   Use double-space separators. Emit only populated tags. `impact` appears only for `fulltime` or `parttime` domains. `recurs:`/`last:` appear only for recurring tasks; when `recurs:` is present, omit `due:`. Never invent a `due:` the user did not confirm.

2. **APPEND** the constructed line to the end of `tasks/<domain>.md` (Read first, then append via Edit or Write). Never reorder or rewrite existing lines.

3. **MARK the inbox line processed** — use Edit to rewrite only the matching inbox line in place:
   - Change `- [ ]` → `- [x]`
   - Append `  resolution:done  resolved:<YYYY-MM-DD>  note:"triaged→<domain>"`
   - The `old_string` for the Edit MUST be the exact full original line to guarantee uniqueness.
   - Do NOT delete the line. Do NOT touch any other inbox line.

For items the user deselected or that remain ambiguous, leave the inbox line unchanged (still `- [ ]`).

### Step 6 — CONFIRM OUTPUT

After all writes, emit a summary:

```
Triaged N item(s):

[x] "<raw text>"
    → appended to tasks/<domain>.md:
      - [ ] <full written line>

Skipped (ambiguous / deselected):
- "<raw text>"  (reason)
```

---

## Notes

- **Non-destructive**: inbox lines are marked `[x]` with a resolution tag, never deleted. The inbox is append-only; `/triage-inbox` is the only command that marks lines there.
- **Append-only to domain files**: new task lines are appended after the last existing line. No reordering.
- **Markdown is source of truth**: no external state is modified. `.task-manager.local.md` is never touched.
- **Inbox excluded elsewhere**: `tasks/inbox.md` is never read by `/plan-day`, `/plan-weekend`, `/review-tasks`, or `/sync-github`. Only `/triage-inbox` and the Triage agent read it.
- **Triage agent contract**: this command invokes `agents/Triage.md` in INBOX-CLARIFY/standalone mode. The agent must NOT write files in this mode — only return proposals. All writes are performed by `/triage-inbox` after user confirmation.
