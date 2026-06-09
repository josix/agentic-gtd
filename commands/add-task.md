---
description: Capture a new task and append a well-formed task line to the correct domain file.
argument-hint: "[domain] <task description> [prio:..] [project:..] [effort:..] [due:..] [context:..]"
allowed-tools: Read, Edit, Write, Glob, Task, AskUserQuestion
---

# /add-task — Capture a New Task

## Domain Mapping

| Argument value            | Target file                  |
|---------------------------|------------------------------|
| `fulltime`                | `tasks/fulltime.md`          |
| `parttime`, `part-time`, or `pt` | `tasks/parttime.md`  |
| `side` or `side-projects` | `tasks/side-projects.md`     |
| `oss` or `open-source`    | `tasks/open-source.md`       |
| `knowledge`               | `tasks/knowledge.md`         |

Note: the Triage subagent emits domain using the canonical forms `fulltime`, `parttime`, `side-projects`, `open-source`, `knowledge`; these must remain present in this table so the proposal's domain resolves to the correct file.

If the domain argument does not match any of the above, emit an error:
```
Error: Unknown domain "<value>". Valid domains: fulltime, parttime (alias: part-time, pt), side-projects (alias: side), open-source (alias: oss), knowledge.
```
Do NOT write anything to any file.

## prio Vocabulary

Valid values: `fulltime`, `parttime`, `side`, `trust`, `long`, `short`, `tedious`.

- If `prio` is missing: warn and default to `prio:short`.
- If `prio` is present but not in the vocabulary: warn and default to `prio:short`.
- Never use a prio value outside the list above.

## Ordered Flow

### Step 1 — CAPTURE

Treat `$ARGUMENTS` (or `$1` / free text) as a raw task description.

Detect backward-compat signals:
- If the **first token** is a known domain alias (`fulltime`, `parttime`, `part-time`, `pt`, `side`, `side-projects`, `oss`, `open-source`, `knowledge`), capture it as the explicit domain seed.
- If any `key:value` tags are present (`prio:`, `project:`, `effort:`, `due:`, `context:`), capture them as explicit tag seeds.

Recognized seed keys: `prio`, `project`, `effort`, `due`, `context`, `recurs`, `last`.

A `recurs:<interval>` seed (e.g. `recurs:3d`, `recurs:weekly`) marks the task as a recurring standing review — pass it through verbatim to the written line. When `recurs:` is supplied, prefer NOT to also write a `due:` (the due is derived from `recurs`/`last`); if the user gave both, keep `recurs:` and warn that `due:` is ignored for recurring tasks. A `last:<YYYY-MM-DD>` seed (last completed date) may accompany `recurs:`; if omitted on a new recurring task, leave it off (the task is treated as never-done and surfaces immediately).

The user is NOT required to provide a domain token or any key:value tags upfront — the Triage subagent will infer them.

If the description (after stripping any domain token and key:value tags) is empty, ask the user for a description and write nothing.

### Step 2 — DELEGATE

Use the **Task** tool to invoke the `Triage` subagent in PROPOSAL MODE. Pass:
- The raw task text (description without domain token).
- Any explicitly-supplied domain and/or key:value tags (seeds).

Instruction to include verbatim: "You are in PROPOSAL MODE. Do NOT write any file. Return ONLY the task-proposal fenced block."

### Step 3 — RECEIVE

Parse the returned `task-proposal` fenced block into its fields:

```
reworded_title, domain, prio, project, impact, effort, due, context, ambiguity_notes
```

If the block is malformed or missing, fall back to building the confirmation card from the raw input rather than aborting (use the raw description as `reworded_title`, use the seed domain if available, use `(none)` for all unresolvable fields).

### Step 4 — CONFIRM via AskUserQuestion

The main agent confirms the Triage proposal using TWO `AskUserQuestion` calls (followups are fine — there is no one-card limit). Both are pre-filled from the proposal (recommended option first, labelled "(Recommended)"). The subagent's proposal drives the defaults; its `ambiguity_notes` drive any extra followup questions.

**Call 1 — Core decisions** (4 questions):

- **Q1 — Action**: A) `<reworded_title>` (Recommended), B) keep original raw text. (Other = user types a corrected title.)
- **Q2 — Domain**: the inferred domain (Recommended) + the other valid domains as alternatives (`fulltime`, `parttime`, `side-projects`, `open-source`, `knowledge`).
- **Q3 — Priority**: the inferred prio (Recommended) + 2–3 plausible alternatives from the vocabulary (`fulltime`, `parttime`, `side`, `trust`, `long`, `short`, `tedious`).
- **Q4 — ETA (due date)**: when is this due? Offer (recommended-first based on the proposal's `due`):
  - If the proposal has a `due`, show it as option A (Recommended).
  - Otherwise: **No deadline** (Recommended) · **Today** (`<runtime today, YYYY-MM-DD>`) · **End of this week** (compute the coming Sunday's ISO date from the runtime clock). Other = user types an explicit `YYYY-MM-DD` (or a phrase like "next friday" to normalize).
  - "No deadline" → omit the `due` tag entirely.

**Call 2 — Optional tags & ambiguities (followup)** — issue this as a second `AskUserQuestion` call after Call 1:

- **Details** (multiSelect): toggle-able inferred optional tags — `project:<v>`, `effort:<v>`, `context:<v>`. Show `impact:<v>` ONLY when the (now-confirmed) domain is `fulltime` or `parttime`. Selected = include in the written line, unselected = omit. (Other lets the user free-text overrides or additions, e.g. `effort:1h`.)
- **Ambiguity followups**: for each item the proposal flagged in `ambiguity_notes` (e.g. an uncertain project label, or a "should this be split?" note), add a targeted question in this same call so the user can resolve it. Stay within the 4-question cap per call; if there are more, issue another followup call.

If Call 2 would have no Details to confirm AND no ambiguities to resolve, you may skip it.

**Backward-compat shortcut**: If the user supplied an explicit domain AND all needed tags at capture AND `ambiguity_notes` is `"none"`, you MAY skip the cards (or present a single confirm step) and proceed directly to Step 5.

### Step 5 — APPLY

Overlay the user's answers from Call 1 (Action / Domain / Priority / ETA) and Call 2 (the Details multiSelect + any ambiguity followups) onto the Triage proposal:

- **title**: from Q1 (Call 1).
- **domain**: from Q2 (Call 1). Must be in the Domain Mapping table. If unknown → error, write nothing.
- **prio**: from Q3 (Call 1). Must be in the vocabulary (`fulltime|parttime|side|trust|long|short|tedious`). If invalid or missing → warn and default to `short`.
- **due**: from Q4 (Call 1, the ETA question). "No deadline" → omit. A relative phrase (Today / End of this week / "next friday") → normalize to ISO `YYYY-MM-DD` using the runtime clock. An explicit value must be ISO `YYYY-MM-DD`; if unparseable, warn and omit. Never invent a due date the user did not give.
- **project / effort / context**: from the Call 2 Details selection — include the tags the user kept selected (or supplied via Other), omit the unselected ones. effort accepts `30m`, `1h`, `2h`, `1.5h`; context is lowercased with leading `@`, comma-separated.
- **impact**: include only when domain is `fulltime` or `parttime` and it was kept in the Call 2 Details selection. For all other domains, omit `impact` even if the user supplied one (warn the user if so).

### Step 6 — APPEND (append-only)

1. Read the target `tasks/<domain>.md` file (using Read tool).
2. Construct the well-formed task line. Tag order must follow the file header:
   ```
   - [ ] <title>  prio:<value>  [project:<value>]  [effort:<value>]  [impact:<value>]  [due:<value>]  [recurs:<value>]  [last:<value>]  [context:<value>]
   ```
   Use double-space separators. Emit only populated tags. `impact` appears only for `fulltime` or `parttime` domains. `recurs:`/`last:` appear only for recurring tasks; when `recurs:` is present, omit `due:`.
3. APPEND the new line at the end of the file (after the last existing line).
4. NEVER reorder, reformat, or rewrite any existing lines. Append-only.

### Step 7 — CONFIRM output

After writing, emit:
```
Added to tasks/<domain>.md:
- [ ] <the full task line as written>
```

If `prio` was defaulted, include:
```
Warning: prio not specified or invalid. Defaulted to prio:short. Consider using prio:<suggested> for this domain.
```

Include any other normalization warnings raised during Step 5.
