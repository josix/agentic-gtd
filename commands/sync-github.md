---
description: Push local tasks/*.md into a private GitHub Project (one-way). Use --init to create the Project and fields; --dry-run to preview without mutating.
argument-hint: "[--init] [--dry-run]"
allowed-tools: Bash, Read, Glob, Grep, mcp__personal-github__get_me, mcp__personal-github__list_issues
---

# /sync-github — One-Way Push to GitHub Project

## Argument Parsing

Parse `$ARGUMENTS` for flags:
- `--init`: initialize the GitHub Project (create project + fields). Idempotent.
- `--dry-run`: preview all intended actions without any mutations.

Both flags can coexist: `--init --dry-run` previews what init would do without creating anything.

## Source of Truth

**Markdown files are the source of truth. This is a one-way push only.**

- Tasks flow: `tasks/*.md` → GitHub Project
- The plugin NEVER pulls from GitHub, NEVER resolves conflicts, NEVER deletes GitHub items.
- `tasks/inbox.md` is ALWAYS excluded (by basename match).

## Mode: --init

Delegate to the `github-sync` skill in `--init` mode:

**If `--dry-run` is set: describe each step below WITHOUT calling any mutating tool (no project creation, no GraphQL mutations, no file writes). Then stop.**

1. Resolve authenticated owner (prefer `gh` CLI or `mcp__personal-github__get_me`).
2. Check config file `.agentic-gtd.local.md` at repo root. If `projectId` is already set and valid → report "already initialized" and exit without recreating.
3. Create the GitHub Project and all required fields via GraphQL.
4. Record all IDs to `.agentic-gtd.local.md`.
5. Add `.agentic-gtd.local.md` to `.gitignore` if not already present.

## Mode: Normal Sync

Delegate to the `github-sync` skill in normal sync mode:

1. Read and validate `.agentic-gtd.local.md`; if missing or invalid → **FAIL LOUDLY** with:
   ```
   GitHub Project not initialized. Run /sync-github --init first.
   ```
   Exit immediately. Zero mutations.
2. Preflight auth check (`gh auth status` or `mcp__personal-github__get_me`). On failure → **FAIL LOUDLY** with exact error. Zero mutations.
3. Parse all `tasks/*.md` (excluding `inbox.md`).
4. Fetch existing GitHub Project items; build dedupe map.
5. Determine create-vs-update per task.
6. Execute push (unless `--dry-run`).
7. Emit sync report.

## Dry-Run Guarantee

On `--dry-run`, the command MUST NOT call any mutating tool. Every output line is prefixed:
```
[DRY-RUN] would create: "Task title" (domain: fulltime, prio: trust)
[DRY-RUN] would update: "Other task" — Status: Todo→Done
```

## Notes

- Markdown is source of truth; sync never pulls or deletes.
- `tasks/inbox.md` is never read or synced.
- Renaming a task in markdown creates a new GitHub item (orphans the old one) — this is a known limitation documented in the github-sync skill.
- Projects v2 field value writes require GraphQL (`gh api graphql`).
