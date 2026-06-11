---
description: Register a new domain in the task-manager so tasks can be filed, planned, and reviewed under it immediately.
argument-hint: "<domain-name> [aliases] [color] [github_sync:yes|no]"
allowed-tools: Read, Edit, Write, Glob, AskUserQuestion
---

# /add-domain — Register a New Domain

Adds a new domain to the extensible domain registry (`tasks/domains.md`), creates the task file and its template, updates the Obsidian Dashboard, and prints a GitHub-sync reminder.

## Ordered Flow

### Step 1 — Normalize the domain name

Take the first token of `$ARGUMENTS` as the candidate name.

- Lowercase it.
- Replace all spaces and underscores with hyphens.
- The result must match `^[a-z][a-z0-9-]*$`. If it does not, emit:
  ```
  Error: "<value>" is not a valid domain name. Use lowercase letters, digits, and hyphens only; must start with a letter.
  ```
  and STOP. Write nothing.

### Step 2 — Reserved and collision check

Read `tasks/domains.md`.

**Reserved names** (reject if the normalized name matches any of these): `inbox`, `templates`, `plans`, `dashboard`, `domains`.

If the name is reserved, emit:
```
Error: "<name>" is a reserved name and cannot be used as a domain.
```
and STOP. Write nothing.

**Collision check**: the name must not already appear in the `canonical` column OR in the `aliases` column of `tasks/domains.md`. If it does, emit:
```
Error: "<name>" already exists in the domain registry (as canonical or alias).
```
and STOP. Write nothing.

Also check whether `tasks/<name>.md` already exists (Glob or Read). If it does, emit:
```
Error: tasks/<name>.md already exists. Remove or rename it before registering a new domain with this name.
```
and STOP. Write nothing.

### Step 3 — Ask for metadata

If the user passed `aliases`, `color`, `github_sync:yes|no` as additional arguments in Step 1, use those values and skip the corresponding sub-questions. For any not provided, issue one `AskUserQuestion` call (up to 4 questions):

1. **Aliases** — comma-separated short aliases (e.g. `hw, homeworks`). Default: `(none)`.
2. **Dashboard color** — choose a color for the domain badge:
   - Red (`rgba(220,38,38,…)`)
   - Orange (`rgba(234,88,12,…)`)
   - Green (`rgba(22,163,74,…)`)
   - Blue (`rgba(37,99,235,…)`)
   - Purple (`rgba(124,58,237,…)`)
   - Teal (`rgba(13,148,136,…)`)
   - Gray (`rgba(100,116,139,…)`)
   - Other — user provides a custom hex or rgba string
3. **Daily / weekend order** — integers used for the domain tiebreak. Default: max existing `daily_order` + 1 and max existing `weekend_order` + 1. The user may override either or both.
4. **GitHub sync** — `yes` or `no`. Default: `yes`.

If all values were already provided as arguments, skip this step entirely.

### Step 4 — Create `tasks/<name>.md`

Read an existing domain template (e.g. `tasks/templates/knowledge.md`) to copy the exact 3-section header shape. Then write `tasks/<name>.md` with this structure (adapt the title and prio rung text generically for the new domain):

```
# <Title-cased name> tasks
# Format: - [ ] <next action>  prio:<fulltime|parttime|side|trust|long|short|tedious>  project:<name>  effort:<e.g.2h>  impact:<long|short>  due:<YYYY-MM-DD>  context:<@computer|@phone|...>
# Domain is implied by this filename. prio: is the ONLY field that sets ladder rank.
# Natural prio rungs for this domain:
#   prio:short    — default starting prio for this domain
#   prio:long     — high-leverage tasks for this domain
#   prio:tedious  — maintenance and mechanical tasks
```

### Step 5 — Create `tasks/templates/<name>.md`

Write `tasks/templates/<name>.md` with the same scaffold as Step 4.

### Step 6 — Append to domain registries

Read `tasks/domains.md`, then append a new row:

```
| <canonical> | <aliases or (none)> | <daily_order> | <weekend_order> | bg:<bg> text:<text> border:<border> | <yes|no> |
```

Use double-space separation consistent with the existing table rows.

Then read `tasks/templates/domains.md` and append the same row there.

### Step 7 — Update the Dashboard

Glob for `tasks/**/Dashboard.md`. If found:

- Read the Dashboard file.
- Locate the `domainOrder` array (near the comment `/add-domain appends new domains here`). Append `"<name>"` as the last element of the array.
- Locate the `domainColors` object. Append an entry in the same format as the existing entries:
  ```
  "<name>": { bg: "<bg>", text: "<text>", border: "<border>" },
  ```
  Use the color values from Step 3.
- Use Edit (not Write) so only those two insertions are made; never rewrite the whole Dashboard.

If the Dashboard is not found, print:
```
Dashboard not found. Add manually:
  domainOrder: append "<name>"
  domainColors: append "<name>": { bg: "<bg>", text: "<text>", border: "<border>" }
```

### Step 8 — GitHub-sync reminder

Print:
```
GitHub sync reminder:
  To sync tasks in the <name> domain, add a "Domain" single-select option named
  "<name>" in the GitHub Project, then add its option-ID under fields.Domain.options
  in .agentic-gtd.local.md:
      <name>: <option-id-from-github>
  Until then, /sync-github will skip <name> tasks with a warning.
```

### Step 9 — Summary

Print:
```
Domain "<name>" registered successfully.

Files created:
  tasks/<name>.md
  tasks/templates/<name>.md

Files updated:
  tasks/domains.md         (new row appended)
  tasks/templates/domains.md  (new row appended)
  tasks/**/Dashboard.md    (domainOrder and domainColors updated)

Next steps:
  - Add tasks via /add-task <name> <description>
  - See the GitHub sync reminder above if you use /sync-github
```

## Edge Cases

- Reserved names (`inbox`, `templates`, `plans`, `dashboard`, `domains`): reject in Step 2.
- Duplicate canonical or alias collision: reject in Step 2.
- Order collision (two domains with same order value): allowed — tiebreaks fall through to alphabetical (existing behavior).
- Dashboard missing: print manual-edit instructions (not a failure).
- Aliases provided as `(none)` or empty string: write `(none)` in the registry.
