---
name: github-sync
description: This skill should be used when syncing local tasks/*.md into a GitHub Project (one-way push), or when initializing the GitHub Project and its fields via --init.
---

# GitHub Sync Skill

## Scope and Invariants

- **One-way push only**: data flows `tasks/*.md` → GitHub Project. Never pull. Never conflict-resolve. Never delete.
- **Source of truth**: local markdown files are always the authority.
- **Inbox exclusion**: `tasks/inbox.md` is ALWAYS excluded by basename match — identical exclusion rule as gtd-prioritization.
- **Parse regex**: `^- \[([ x])\] (.+)$` — captures checkbox state (space = incomplete, `x` = complete) AND the task content.
- All tasks (complete and incomplete) are synced to GitHub. Checkbox state maps to `Status` field.

## Field Mapping Table

| Markdown source              | GitHub Project field      | Field type      | Values / notes                                    |
|------------------------------|---------------------------|-----------------|---------------------------------------------------|
| filename stem                | `Domain`                  | single-select   | `fulltime`, `side-projects`, `open-source`, `knowledge` |
| `prio:` tag                  | `Priority`                | single-select   | `fulltime`, `side`, `trust`, `long`, `short`, `tedious` |
| `due:` tag                   | `Due`                     | date            | ISO `YYYY-MM-DD`; empty if absent/malformed       |
| checkbox state `[ ]` / `[x]`| `Status`                  | single-select   | `Todo` (space) / `Done` (x)                       |
| task title (before first tag)| item title                | built-in title  | trimmed, internal whitespace collapsed            |
| `project:` tag               | `Project/Area`            | text            | omit field write if tag absent                    |

**Missing prio** → set Priority to none + emit warning.
**Missing due** → leave Due field empty + emit warning.
**Unknown domain** (filename not in the four known domains) → skip item entirely + emit warning.

## Idempotency

**Composite dedupe key** = `domain` + `normalizedTitle`

Title normalization: trim leading/trailing whitespace, collapse all internal whitespace runs to single space. Do NOT lowercase — title casing is preserved.

**Algorithm**:
1. Fetch all existing items from the GitHub Project.
2. Build a map: `dedupe_key → {itemId, fieldValues}`.
3. For each parsed task:
   - Compute `dedupe_key`.
   - If key exists in map → **UPDATE** the item's fields (title, Domain, Priority, Due, Status, Project/Area).
   - If key absent → **CREATE** a new draft issue item.

**Known limitation (document in bold in output)**: **Renaming a task in markdown creates a duplicate: the old GitHub item is orphaned. One-way push never deletes GitHub items. To remove an orphan, delete it manually in the GitHub Project UI.**

## Transport

**Listing and creation** (classic operations):
- List items: `gh project item-list <number> --owner <owner> --format json`
- Create draft issue: `gh project item-create <number> --owner <owner> --title "<title>"` → captures item ID
- Alternative: `mcp__personal-github__*` tools where they support these operations

**Projects v2 field value mutations REQUIRE GraphQL** — `gh` CLI item-edit does not support custom fields reliably:

```graphql
# Create draft issue
mutation {
  addProjectV2DraftIssue(input: {projectId: "<projectId>", title: "<title>"}) {
    projectItem { id }
  }
}
```

```graphql
# Set single-select field
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "<projectId>",
    itemId: "<itemId>",
    fieldId: "<fieldId>",
    value: { singleSelectOptionId: "<optionId>" }
  }) {
    projectV2Item { id }
  }
}
```

```graphql
# Set date field
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "<projectId>",
    itemId: "<itemId>",
    fieldId: "<fieldId>",
    value: { date: "YYYY-MM-DD" }
  }) {
    projectV2Item { id }
  }
}
```

```graphql
# Set text field
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "<projectId>",
    itemId: "<itemId>",
    fieldId: "<fieldId>",
    value: { text: "<value>" }
  }) {
    projectV2Item { id }
  }
}
```

Invoke GraphQL via: `gh api graphql -f query='<mutation>'`

**Field IDs and option IDs are opaque strings** — resolve them once during `--init` and cache in config. Never hardcode.

## --init Flow (numbered, idempotent)

1. **Resolve owner**: query `gh api graphql -f query='{ viewer { id login } }'` or call `mcp__personal-github__get_me`. Record `login` and node `id`.

2. **Check config**: read `.agentic-gtd.local.md` at repo root. If `projectId` key is present and non-empty → report `"already initialized (projectId: <id>)"` and **exit without any mutations**.

3. **Create project**: run `gh project create --owner @me --title "Agentic GTD"` (private by default). Capture the project number and node ID from output.

4. **Create custom fields** via GraphQL `createProjectV2Field` mutation:
   - `Priority` — single-select, options in ladder order: `fulltime`, `side`, `trust`, `long`, `short`, `tedious`
   - `Domain` — single-select, options: `fulltime`, `side-projects`, `open-source`, `knowledge`
   - `Due` — date field
   - `Project/Area` — text field
   - `Status` — built-in field (do not recreate). Ensure `Todo` and `Done` options exist; add `Done` if missing.

5. **Resolve all field IDs and option IDs**: query the project's field list via GraphQL to get each `fieldId` and each option's `id`.

6. **Write config**: save all IDs to `.agentic-gtd.local.md` (see Config File section).

7. **Update .gitignore**: append `.agentic-gtd.local.md` to the repo root `.gitignore` if not already present.

## Config File

Location: `.agentic-gtd.local.md` at **repo root** (not inside `.claude/`).

This file is human-readable with a YAML-style key:value block:

```
# Agentic GTD — Local Config
# Auto-generated by /sync-github --init. Do not commit (add to .gitignore).

projectId: PVT_xxxxxxxxxxxx
projectNumber: 1
owner: josixwang

fields:
  Priority:
    fieldId: PVTSSF_xxxxxxxxxxxx
    type: single_select
    options:
      fulltime: xxxxxxxx
      side: xxxxxxxx
      trust: xxxxxxxx
      long: xxxxxxxx
      short: xxxxxxxx
      tedious: xxxxxxxx
  Domain:
    fieldId: PVTSSF_xxxxxxxxxxxx
    type: single_select
    options:
      fulltime: xxxxxxxx
      side-projects: xxxxxxxx
      open-source: xxxxxxxx
      knowledge: xxxxxxxx
  Status:
    fieldId: PVTSSF_xxxxxxxxxxxx
    type: single_select
    options:
      Todo: xxxxxxxx
      Done: xxxxxxxx
  Due:
    fieldId: PVTF_xxxxxxxxxxxx
    type: date
  Project/Area:
    fieldId: PVTF_xxxxxxxxxxxx
    type: text
```

**Note**: this file contains project-specific IDs and must not be committed. The `.gitignore` line is added during `--init`.

## Sync Flow (Normal Mode)

1. **Read config**: parse `.agentic-gtd.local.md`. If file missing or `projectId` is empty/absent:
   ```
   FATAL: GitHub Project not initialized. Run /sync-github --init first.
   ```
   Exit immediately. **Zero mutations.**

2. **Preflight auth**: run `gh auth status` or call `mcp__personal-github__get_me`. On failure:
   ```
   FATAL: GitHub auth failed — <exact error message>. Run: gh auth login
   ```
   Exit immediately. **Zero mutations.**

3. **Parse tasks**: read all `tasks/*.md` except `tasks/inbox.md`. Parse all lines matching `^- \[([ x])\] (.+)$`. Extract and normalize all tags.

4. **Fetch existing items**: `gh project item-list <number> --owner <owner> --format json`. Build dedupe map: `normalizedKey → {itemId, currentFieldValues}`.

5. **Resolve create vs update**: for each parsed task, compute dedupe key; look up in map.

6. **Execute** (skip if `--dry-run`):
   - For CREATE: `addProjectV2DraftIssue` → get itemId → set all field values via `updateProjectV2ItemFieldValue`.
   - For UPDATE: only set fields whose value has changed (diff against current).

7. **Emit sync report**.

## Sync Report Format

```
Sync complete (2026-06-08T12:00:00Z):
  Created:   5
  Updated:   12
  Completed (Status=Done): 3
  Skipped:   0
  Warnings:
    - [tasks/knowledge.md: "some task"] Missing prio — Priority field left empty
    - [tasks/fulltime.md: "other task"] Malformed due date: "next week" — Due field left empty
```

On dry-run, every line is prefixed with `[DRY-RUN]` and the final line reads:
```
[DRY-RUN] No mutations were made.
```

## Failure Handling

- Any transport failure, GraphQL error, or auth error **aborts** before further mutations.
- Push is **non-transactional**: if 10 items are being created and item 6 fails, items 1-5 are already in GitHub.
- Report truthfully which items were mutated before the abort:
  ```
  ABORT: GraphQL error on item "Task title": <error>
  Mutated before abort: Created 5, Updated 2
  ```
- Missing config → FAIL LOUDLY before any mutations (see sync step 1).
- Auth failure → FAIL LOUDLY before any mutations (see sync step 2).

## Auth Ambiguity Note

Prefer ONE transport for identity resolution (use `gh` CLI to resolve owner; record `owner` login in config). At preflight, warn if `gh auth status` shows a different user than the recorded `owner`:

```
Warning: gh authenticated as "other-user", but config owner is "josixwang". Proceeding may create items under the wrong account.
```
