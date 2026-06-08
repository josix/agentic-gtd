---
description: Configure a GitHub Projects v2 view layout (group/sort/fields/filter) by driving the web UI with the Playwright MCP — since the Projects v2 API cannot set view layout.
argument-hint: "[project URL or number] [view spec or 'default']"
allowed-tools: Read, Bash, AskUserQuestion, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_press_key, mcp__playwright__browser_wait_for, mcp__playwright__browser_take_screenshot
---

# /layout — Configure GitHub Project View Layout

Set up user-friendly **views** (grouping, sorting, visible fields, filters, board columns) on a
GitHub Projects v2 board. The Projects v2 GraphQL API has **no mutation for view layout**, so this
command drives the **web UI via the Playwright MCP**. The data/field side is handled separately by
`/sync-github`; this command only arranges presentation.

**Read `${CLAUDE_PLUGIN_ROOT}/skills/github-sync/references/view-layout-automation.md` first** — it
is the authoritative reference for the UI flow, selectors-by-role pattern, the save-confirm gotcha,
the URL-param trick, and verification. Follow it.

## Preconditions (check; abort with a clear message if unmet)

1. **Project has fields + items.** Layout is meaningless on an empty/field-less project. If
   `.task-manager.local.md` is missing or the project has no items, tell the user to run
   `/sync-github --init` (and a sync) first, and stop.
2. **Authenticated browser as the project OWNER.** `gh auth status` must show the owner account
   (e.g. `josix`), and the **Playwright browser must be logged in** to GitHub as that owner.
   - Navigate to the project URL and snapshot. If the page is a 404 or a login screen, STOP and ask
     the user to sign in to the Playwright browser as the owner (do NOT automate credentials/2FA),
     then resume.
3. **Token scope** (only if you'll read back item data): `gh auth refresh -s read:project,project`
   if the token lacks `project`. (Layout itself needs no token — it's pure UI — but field/option
   IDs come from `.task-manager.local.md`, written by `/sync-github --init`.)

## Argument Parsing

- **project**: a `https://github.com/users/<owner>/projects/<n>/...` URL or a bare number. If
  omitted, read `projectNumber`/`owner` from `.task-manager.local.md`.
- **view spec**: `default` (the three views below) or a free-form description of the views/columns
  the user wants. If ambiguous, ask ONE `AskUserQuestion` to confirm the target views.

## Default view spec

Build/update these three views (mirrors the recommended post-sync layout). Field/option **columnIds**
come from `.task-manager.local.md` (the `fieldId`s) — use them to construct view-URL params.

| View | Layout | Group / Column | Sort | Filter | Visible fields |
|------|--------|----------------|------|--------|----------------|
| **Overview** | Table | Group by **Domain** | Priority ↑, Due ↑ | `-status:Done` | Title, Status, Project/Area, Priority, Due |
| **Priorities** | Board | Column by **Priority** | Due ↑ | `-status:Done` | (cards) |
| **This week** | Table | — | Due ↑ | `-status:Done due:<YYYY-MM-DD>` (today + ~7d, from the runtime clock) | Title, Domain, Priority, Due |

## Execution (per the reference guide)

1. **Navigate + auth-check** the project; snapshot; confirm logged-in as owner (else stop per
   Precondition 2).
2. For each target view, prefer the **URL-param trick**: construct the view URL with
   `?groupedBy[columnId]=…&verticalGroupedBy[columnId]=…(board)&sortedBy[direction]=asc&sortedBy[columnId]=…&visibleFields=[…]&filterQuery=…`
   using the IDs from config, navigate to it (re-applies the whole config as pending changes), then
   **Save → confirm the "Save filters and display options?" dialog** (two steps — the second is
   mandatory or the change is discarded on reload).
   - To create a new view: click the **New view** tab → pick **Table**/**Board**; it opens as
     `/views/<n>` (unsaved). Rename via the view-tab **⋯ → Rename view → Save**.
   - For menu-driven config (when URL params aren't enough), use the **View** config button:
     Group by / Sort by / Column by / Fields / Slice by — locate menu items by visible label.
3. **Verify each view in the UI** (NOT via GraphQL — view config reads back empty there): reload the
   **bare** view URL, snapshot, and assert the column headers, group headers, and active sort match
   the spec. If it reverted to defaults, the Save wasn't confirmed — redo.
4. Emit a per-view **PASS/FAIL** summary; on FAIL, include a screenshot + the exact failing step.

## Guardrails

- **Snapshot before every action**; locate by role/accessible-name, never brittle CSS.
- **Idempotent**: if a view already matches the spec, skip it.
- **ToS / human pace**: this configures the user's OWN project; don't fan out, add small waits.
- **Degrade gracefully**: if a control can't be found after 2–3 snapshots, stop and report — never
  click blindly.
- **Never** automate login/credentials/2FA; never delete views unless explicitly asked.
- This is **browser automation — brittle by nature** (UI changes, auth expiry). Always verify and
  report honestly; do not claim success without a bare-URL re-check.
