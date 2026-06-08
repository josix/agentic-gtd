---
name: gtd-prioritization
description: This skill should be used when prioritizing tasks, building a daily plan, building a weekend plan, or ranking work across the task domains using the fixed priority ladder.
---

# GTD Prioritization Skill

## Inputs

- **Source files**: glob `tasks/*.md` relative to plugin root.
- **Excluded file**: `tasks/inbox.md` — excluded by basename match. Never read during planning.
- **Domains**: determined by filename stem: `fulltime`, `parttime`, `side-projects`, `open-source`, `knowledge`.

## Task Line Grammar and Parsing

Only **incomplete tasks** are considered for planning.

**Regex for incomplete tasks** (applied per line):
```
^- \[ \] (.+)$
```

Lines matching `- [x]` (completed) and all comment lines or non-task lines are ignored.

**Title extraction**: the task title is the text BEFORE the first `key:value` tag.

**Tag extraction**: apply global regex `(\w+):(\S+)` to the full task line. All key:value pairs after the title are tags.

**Recognized tag keys**: `prio`, `project`, `effort`, `impact`, `due`, `context`

**Normalization rules**:

- **effort → minutes**:
  - `30m` → 30
  - `2h` → 120
  - `1.5h` → 90
  - Integer with no unit → treat as minutes
  - Unparseable or missing → `unknown` (treated as large for filtering, sorts last in effort tiebreak)
- **due → ISO date** (`YYYY-MM-DD`):
  - Valid ISO date → kept as-is
  - Unparseable or missing → `no-due` (sorted after tasks with due dates)
  - Malformed due → `no-due` + warning added to output
- **context → comma-separated list**, each element normalized to lowercase with leading `@` (e.g. `@computer`, `@phone`)
- **prio**: must match controlled vocabulary; unrecognized or missing → rank 99 + warning

## Priority Rank Map

| prio value | rank |
|------------|------|
| fulltime   | 1    |
| parttime   | 2    |
| side       | 3    |
| trust      | 4    |
| long       | 5    |
| short      | 6    |
| tedious    | 7    |
| missing or invalid | 99 (sorts last; emits warning) |

The rank is NEVER overridden by any other field. This ladder is strict.

## Ranking Algorithm (strict tiebreak order)

Apply these criteria in order until a winner is determined:

1. **prio rank ascending** — rank 1 before rank 7; rank 99 always last. NEVER overridden.
2. **due-date proximity** — earlier due date first; `no-due` tasks sort after all dated tasks.
3. **effort ascending** — smaller effort first; `unknown` effort sorts last.
4. **domain order** (daily mode tie-break): `fulltime` < `parttime` < `side-projects` < `open-source` < `knowledge`. In weekend mode, step 4 (domain tie-break) is REPLACED by the Weekend domain tie-break defined in Weekend Mode Step (b): `side-projects` < `open-source` < `knowledge` < `parttime` < `fulltime`. Steps 1–3 and 5 are identical in both modes.
5. **alphabetical by title** — ensures total order (case-insensitive, ascending).

## Daily Mode (GTD Engage — filter THEN rank)

**Arguments**: `hours` (default: 8), `energy` (default: `med`), `context` (default: any)

**Filter steps** (applied before ranking):
1. **Effort filter**: drop any task whose effort in minutes > remaining hours converted to minutes. If effort is `unknown`, treat as large (assume 240m for filtering unless hours param makes it obviously too large).
2. **Context filter**: if a context argument is given, drop tasks whose `context` tag does not intersect the requested context list. Tasks with no context tag pass through when no context filter is active.
3. **Energy filter**:
   - `energy:low` → drop tasks with `prio:fulltime` or `prio:parttime` AND drop tasks with large effort (≥120m or unknown). Prefer `prio:tedious` and small effort tasks (≤30m).
   - `energy:med` → no additional drops.
   - `energy:high` → no drops (all tasks eligible).

**After filtering**, rank survivors using the algorithm above.

**Greedy fill**: iterate ranked list, accumulate effort minutes. Include tasks that fit within `hours * 60` total minutes. Tasks that exceed remaining time go to "Deferred / filtered out" section.

Tasks filtered out (by context/energy/effort) AND tasks that didn't fit in hours both appear in `## Deferred / filtered out`.

## Weekend Mode (GTD Reflect + weighting)

**Arguments**: `hours` (default: 12)

**Step (a) — Weekly Review sweep FIRST**:
Before building the plan, emit `## Weekly Review sweep` listing:
- **Overdue tasks**: tasks with `due < today` (ISO comparison). Flag with `[OVERDUE]`.
- **Stale tasks**: tasks with no updates detected (heuristic: no due date and no project tag — flag as potentially stale).
- **Missing/invalid-metadata tasks**: tasks lacking `prio`, `effort`, or `due`. List each with the specific missing fields.

**Step (b) — Weekend domain tie-break** (reverses daily order):
Domain priority for weekend: `side-projects` < `open-source` < `knowledge` < `parttime` < `fulltime`
(i.e., fulltime sorts last in domain tiebreak; side-projects most favored for weekend)

**Step (c) — Fulltime sectioning**:
- Non-overdue `prio:fulltime` tasks → placed in a separate `## Full-time (optional this weekend)` section.
- Overdue `prio:fulltime` tasks → remain in the main ranked list, flagged `[OVERDUE]`.

Primary prio ordering is identical to daily (rank 1–7, 99 last).

## Output Formats

### Daily Plan

```
# Daily Plan — YYYY-MM-DD

1. [rank] Title — domain · effort · due · context
2. [rank] Title — domain · effort · due · context
...

## Deferred / filtered out
- Title — domain (reason: over-time | low-energy | context-mismatch)
...

## Warnings
- [file:task] Missing prio — assigned rank 99
- [file:task] Malformed due date: "<value>"
...
```

### Weekend Plan

```
# Weekend Plan — YYYY-MM-DD

## Weekly Review sweep

### Overdue
- [OVERDUE] Title — domain · due:<date>

### Stale (no due + no project)
- Title — domain

### Missing or invalid metadata
- Title — domain · missing: prio, effort
...

## Weekend Plan (ranked)

1. [rank] Title — domain · effort · due · context
2. [rank] Title — domain · effort · due · context
...

## Full-time (optional this weekend)
- Title — fulltime · effort · due · context
...

## Warnings
- [file:task] Missing prio — assigned rank 99
- [file:task] Malformed due date: "<value>"
...
```

## GTD Pillar Mapping

- **Capture**: raw items go to `tasks/inbox.md`; domain files hold clarified tasks.
- **Clarify**: Triage agent converts inbox items to concrete next-action lines with proper tags.
- **Organize**: tasks are filed in domain files with full metadata; priority ladder provides the organizational backbone.
- **Reflect**: Weekend mode's Weekly Review sweep surfaces overdue, stale, and under-specified tasks.
- **Engage**: Daily mode filters by hours/energy/context and produces a greedy-filled ranked action list.

## Missing-Prio Degradation

Any task missing a `prio:` tag, or with an unrecognized prio value, is assigned rank **99**. It sorts after all valid-prio tasks. A warning is emitted in `## Warnings` naming the source file and task title:

```
## Warnings
- [tasks/knowledge.md: "Read chapter 4"] Missing prio — assigned rank 99
- [tasks/fulltime.md: "Fix thing"] Malformed due date: "next-friday"
```

Same rule applies to malformed `due` values: normalize to `no-due` and emit a warning.
