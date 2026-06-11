---
description: Read tasks/inbox.md, clarify each open raw item via the Triage agent, confirm each proposal's fields (domain, prio, effort, scheduling/recurs, context) with the user, then append well-formed lines to the correct domain files and mark processed inbox lines in place.
argument-hint: "[--dry-run]"
allowed-tools: Read, Edit, Write, Glob, Task, AskUserQuestion
---

# /triage-inbox — Clarify and File Inbox Items

Route-back target for the Obsidian dashboard "Copy triage command" button.  
Reads `tasks/inbox.md`, turns raw capture lines into well-formed GTD task lines (via the Triage agent), and files them into the correct domain files — all after user confirmation.

**Source of truth**: markdown files only. This command never touches `.agentic-gtd.local.md`. No lines are deleted — resolved inbox lines are marked `[x]` in place.

---

## Domain Resolution

Read `tasks/domains.md` to get the current domain registry. Each row maps a `canonical` name to `tasks/<canonical>.md`. Aliases in the `aliases` column also resolve to the canonical file. This is the authoritative list — same source as `/add-task` and `/clear-tasks`.

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
domain: <canonical domain name from tasks/domains.md>
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

### Step 3 — PRESENT PROPOSALS (display-only)

Present all proposals in a single consolidated display block. This step is DISPLAY-ONLY — no `AskUserQuestion` is issued here. Per-item confirmation happens in Step 4. Format:

```
Triage proposals (N items):

1. "<raw text>"
   → [domain] prio:<prio>  <reworded_title>
     effort:<effort>  due:<due>  context:<context>  recurs:<recurs>
     Ambiguity: <ambiguity_notes>

2. ...
```

Flag items whose `domain` is `(unknown)` or whose `ambiguity_notes` is non-trivial — the user will resolve these in Step 4.

If `--dry-run` was supplied, emit the proposals and STOP here. Do not proceed to Step 4.

### Step 4 — CONFIRM via AskUserQuestion

#### Step 4a — Select which items to apply

Issue **one consolidated `AskUserQuestion` multiSelect call** where each option represents one proposal. The option DESCRIPTION must show the **full proposed task line** (all populated fields: domain, prio, project, effort, due, recurs, context) so the user sees everything at a glance — not just domain and prio. Example description format:

```
[fulltime] prio:trust  "Book Q3 offsite venue"  effort:2h  due:2026-07-01  context:@calendar
```

Include an "Other" option for free-text adjustments (e.g. "1: change domain to side-projects"). Deselected items are skipped and left in inbox unchanged.

#### Step 4b — Per-item field confirmation (for each selected item)

**Auto-accept rule:** a proposed field value that is unambiguous is accepted by default and COUNTS AS CONFIRMED for the proceed-gate, even when it is not shown as its own question. Only fields with a real choice are asked. (This is what makes the gate below consistent with asking fewer than six questions.)

For each item selected in Step 4a, issue ONE `AskUserQuestion` call with these **four** questions. Each question lists the Triage agent's proposed value FIRST, labeled "(proposed)", plus sensible alternatives and the implicit "Other":

1. **Priority** — the 7 tiers (`fulltime`/`parttime`/`side`/`trust`/`long`/`short`/`tedious`); default = proposed.
2. **Effort** — `30m` / `1h` / `2h` / `3h` / Other; default = proposed (or `none`).
3. **Scheduling** (this single question covers BOTH `due:` and recurrence, which are mutually exclusive) — options:
   - `No due date`
   - `Due <proposed-date>` — include only if a `due:` was proposed
   - `Recurring weekly`
   - `Recurring biweekly`
   - `Other` — a custom `YYYY-MM-DD` due OR a custom interval (e.g. `3d`)
   Mark whichever option matches the agent's proposal with "(proposed)" (e.g. if the agent inferred `recurs:weekly`, label `Recurring weekly (proposed)`; if it inferred a due, label that due `(proposed)`; if neither, label `No due date (proposed)`). A recurring choice writes `recurs:` and OMITS `due:`; a dated choice writes `due:` and no `recurs:`.
4. **Context** — sensible `@tag` options (e.g. `@computer`, `@computer,@local-env`) + Other; default = proposed.

**Domain** is asked ONLY when the proposed domain is `(unknown)` or flagged ambiguous. When so, issue a SHORT leading `AskUserQuestion` call with a single Domain question listing the canonical domains from `tasks/domains.md` BEFORE the four-question call above. An unambiguous proposed domain is auto-accepted (per the Auto-accept rule) and is not asked.

**Batching:** every `AskUserQuestion` call stays ≤4 questions. Worst case is two calls per item: a 1-question Domain call, then the 4-question field call. Never exceed four questions in a single call.

**Accepting a "(proposed)" option — or a value auto-accepted per the Auto-accept rule — counts as explicit confirmation.**

**Proceed-gate:** do NOT write an item in Step 5 until its domain, prio, effort, scheduling (a due date OR a recurrence OR explicitly "no due date"), and context are all either user-selected or auto-accepted. Leave an item untouched in the inbox if it was deselected in Step 4a, or if the user's Step 4b answer (e.g. an unparseable "Other") cannot be resolved to valid field values.

**Tradeoff note:** full per-field confirmation means one (or two) prompt calls per item — intentional, matching `/add-task` rigor. There is no `--quick` flag.

### Step 5 — APPLY (append-only to domain files, mark inbox in place)

For each confirmed proposal:

1. **Construct the well-formed task line** following add-task's tag-order convention:
   ```
   - [ ] <reworded_title>  prio:<value>  [project:<value>]  [effort:<value>]  [impact:<value>]  [due:<value>]  [recurs:<value>]  [last:<value>]  [context:<value>]
   ```
   Use double-space separators. Emit only populated tags. `impact` appears only for `fulltime` or `parttime` domains. `recurs:`/`last:` appear only for recurring tasks; when `recurs:` is present, omit `due:`. Write ONLY user-confirmed/accepted field values — never a field value the user did not confirm in Step 4.

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
- **Markdown is source of truth**: no external state is modified. `.agentic-gtd.local.md` is never touched.
- **Inbox excluded elsewhere**: `tasks/inbox.md` is never read by `/plan-day`, `/plan-weekend`, `/review-tasks`, or `/sync-github`. Only `/triage-inbox` and the Triage agent read it.
- **Triage agent contract**: this command invokes `agents/Triage.md` in INBOX-CLARIFY/standalone mode. The agent must NOT write files in this mode — only return proposals. All writes are performed by `/triage-inbox` after user confirmation.
