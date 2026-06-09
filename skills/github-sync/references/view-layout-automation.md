# Operating GitHub Projects v2 View Layout from Claude Code

A guide for a Claude Code agent/extension to **configure the layout of a GitHub Projects v2
view** (grouping, sorting, layout type, filter, field visibility, slicing).

> **Why this is a browser-automation guide, not an API guide.**
> GitHub's Projects v2 GraphQL API can **read** a view's configuration but provides **no
> mutation to change it**. Verified against the live schema:
> - Readable: `ProjectV2View.layout`, `.groupByFields`, `.sortByFields`, `.filter`, `.fields`.
> - Writable: **nothing** — there is no `updateProjectV2View` / `setProjectV2View*` mutation
>   (the only `*View*` mutations in the schema are PR-review mutations).
>
> Therefore the **only** programmatic way to set view layout is to drive the GitHub web UI.
> The GraphQL read-back is still valuable: use it to **verify** the result and to make the
> automation **idempotent** (act only when current ≠ desired).

The sibling skill `SKILL.md` handles the orthogonal job of pushing task **data/fields** into the
project via GraphQL. This guide handles **view presentation**, which that API can't touch.

---

## 1. Prerequisites

- **A browser-automation tool.** In this environment either works:
  - Playwright MCP — tools `mcp__playwright__browser_navigate`, `browser_snapshot`,
    `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`,
    `browser_wait_for`, `browser_take_screenshot`, `browser_evaluate`.
  - The `webwright` skill (code-as-action Playwright workflow with screenshot evidence).
- **An authenticated GitHub browser session** as the **project owner** (e.g. `josix`).
  Layout changes persist per-view for users with write access. If the automation browser is
  not logged in, the first navigation will hit the login/2FA flow — handle that out of band
  (do not script credentials/2FA).
- **The project + view URL**, e.g. `https://github.com/users/josix/projects/3/views/1`.
- **GraphQL read access** (`read:project` scope) for verification (`gh api graphql`).

---

## 2. What can be set (target surface)

| Setting | UI location | GraphQL read-back field |
|---|---|---|
| Layout: Table / Board / Roadmap | View **⋯** menu → layout buttons | `layout` (`TABLE_LAYOUT` / `BOARD_LAYOUT` / `ROADMAP_LAYOUT`) |
| Group by `<field>` | View **⋯** → **Group** | `groupByFields.nodes[].name` |
| Sort by `<field>` asc/desc | View **⋯** → **Sort** | `sortByFields.nodes[].{field.name,direction}` |
| Filter query | Filter bar (top, funnel icon) | `filter` (raw query string) |
| Field/column visibility | View **⋯** → **Fields** | `fields.nodes[].name` |
| Slice by `<field>` | View **⋯** → **Slice by** | (not reliably read-back; verify visually) |
| New view / rename / delete | **+** tab / double-click tab / tab **▾** | view `name` in `views.nodes[]` |

**Saving is a TWO-step confirm, and unsaved changes are URL-only.** When you change
group/sort/fields/filter, the change is reflected in the **URL query params**
(`?groupedBy[columnId]=…&sortedBy[…]=…&visibleFields=[…]&filterQuery=…`) and an **"Unsaved
changes"** indicator + a **Save** button appear. Clicking **Save** opens an **alertdialog**
("*Save filters and display options for <view>?*") — you must click **Save again inside that
dialog** to persist. If you navigate/reload to the bare view URL *without* saving, the changes
are **discarded** (verified the hard way).

> **Efficient trick (validated):** instead of clicking through every menu, you can navigate
> directly to the fully-parameterized view URL (copy the query string after configuring once, or
> construct it from field/option IDs), which re-applies the whole config as pending changes, then
> click **Save → confirm** once.

---

## 3. The automation loop (per setting)

Robust UI automation is **observe → act → verify**, never blind clicking:

1. **Navigate** to the view URL (`browser_navigate`).
2. **Snapshot** the accessibility tree (`browser_snapshot`) — do NOT hardcode CSS selectors;
   GitHub's DOM is dynamic. Locate controls by **role + accessible name / visible text**.
3. **Open the control**: click the view's **⋯** ("View options") button, or the view-tab caret.
4. **Choose the submenu** (Group / Sort / Fields / Layout / Slice) by its label.
5. **Pick the value** (the field name, or asc/desc) by label.
6. **Save** if an unsaved-changes indicator is present.
7. **Verify** with the GraphQL read-back (Section 5). If it doesn't match, re-snapshot and retry
   (max 2–3 attempts), then report instead of looping.

For the **filter bar**: click it, `browser_press_key` Ctrl/Cmd+A, type the new query, press
Enter. Filter queries use the Projects search grammar, e.g. `-status:Done`,
`due:<2026-06-15`, `priority:trust,fulltime`, `domain:knowledge`.

---

## 4. Recipes

Each recipe assumes you've navigated to the view and taken a fresh snapshot first.

### 4.1 Set layout to Board
- Click **⋯** (View options).
- Click **Board** (layout group). Verify `layout == BOARD_LAYOUT`.

### 4.2 Group by Domain
- Click **⋯** → **Group**.
- In the field list, click **Domain**. (To ungroup: choose **No grouping**.)
- Verify `groupByFields.nodes[0].name == "Domain"`.

### 4.3 Sort by Priority ↑ then Due ↑
- Click **⋯** → **Sort**.
- Click **Priority**, ensure **Ascending**.
- Click **+ Add sort** (if present) → **Due** → **Ascending**.
- Verify `sortByFields` lists Priority then Due, both `ASC`.
- Note: a Board layout sorts cards **within** each column; grouping defines the columns.

### 4.4 Apply a filter ("hide done, due before a date")
- Click the filter bar (funnel icon at top of the view).
- Select-all, type: `-status:Done due:<2026-06-15`
- Press Enter. Verify `filter` read-back equals the string.

### 4.5 Choose visible fields (Table columns)
- Click **⋯** → **Fields**.
- Toggle each field on/off by its checkbox/label (e.g. show Priority, Due, Project/Area, Status;
  hide Assignees, Labels). Verify via `fields.nodes[].name`.

### 4.6 Create / rename a view
- **Create**: click the **+** at the end of the view tabs → it opens a new view; configure it,
  then rename.
- **Rename**: double-click the view tab (or tab **▾** → **Rename**), type the name, Enter.
- **Reorder Priority/Domain options** (so Board columns read in ladder order): this lives in
  **Project Settings → the field → drag options**, not in the view. Order them
  `fulltime, parttime, side, trust, long, short, tedious` (Priority) and
  `fulltime, parttime, side-projects, open-source, knowledge` (Domain).

---

## 5. Verification — WARNING: GraphQL read-back is unreliable for view config

**Do not trust GraphQL to verify a view's layout.** Empirically (verified on a live project),
`ProjectV2View.filter`, `.groupByFields`, and `.sortByFields` return **empty** even when those
settings are clearly applied and saved in the UI. Only `name` and `layout` read back reliably.

```bash
# name/layout read back OK; filter/groupBy/sortBy often come back EMPTY even when set:
gh api graphql -f query='{ user(login:"OWNER"){ projectV2(number:NUM){ views(first:20){ nodes{
  name layout filter
  groupByFields(first:5){ nodes{ ... on ProjectV2FieldCommon { name } } }
  sortByFields(first:5){ nodes{ field{ ... on ProjectV2FieldCommon { name } } direction } }
} } } } }'
```

**Verify in the UI instead:**
1. After Save+confirm, navigate to the **bare** view URL (no query params).
2. Snapshot the grid and assert: the **column headers** match the desired visible fields; the
   rows render under **group headers** (e.g. `parttime (2)`, `side-projects (5)`); the Priority/Due
   column headers show a sort-direction toggle (indicating an active sort).
3. If the bare URL reverts to defaults, the **Save was not confirmed** — redo the Save→dialog step.

For idempotency, gate on this UI assertion (or on the presence of the expected query params after
the view loads), not on the GraphQL read-back.

---

## 6. Reliability & guardrails

- **Snapshot before every action.** Locate by role/accessible-name/text, never brittle CSS or
  nth-child. The Projects UI re-renders frequently.
- **Menus are label-driven.** Keep the recipe steps keyed on visible labels ("Group", "Sort",
  "Board") so they survive minor DOM changes.
- **Save state.** Don't assume persistence — check for the unsaved-changes / Save affordance.
- **Auth & 2FA are out of scope for the script.** Ensure the browser is already logged in as the
  owner; never automate credential entry or 2FA.
- **Stay within ToS and human pace.** This is for operating *your own* project. Don't fan out,
  don't hammer; add small waits (`browser_wait_for`) between steps.
- **Degrade gracefully.** If a control can't be found after 2–3 snapshots, **stop and report the
  exact step + a screenshot** rather than clicking blindly.
- **Bound the work.** Read-back-verify each view; report a per-view PASS/FAIL summary at the end.

---

## 7. End-to-end example: the three agentic-gtd views

Target spec (matches the layout recommended after a `/sync-github` push):

| View | layout | group | sort | filter |
|---|---|---|---|---|
| Overview | TABLE | Domain | Priority ↑, Due ↑ | `-status:Done` |
| Priorities | BOARD | Priority | Due ↑ | `-status:Done` |
| This week | TABLE | (none) | Due ↑ | `-status:Done due:<2026-06-15` |

Agent sequence:
1. Read-back current views; diff against the spec.
2. For **Overview** (rename View 1): set Table, Group=Domain, Sort=Priority↑,Due↑, Filter, Fields=[Title,Priority,Due,Project/Area,Status]. Save. Verify.
3. Create **Priorities**: Board, Group/column=Priority, Sort=Due↑, Filter. Save. Verify.
4. Create **This week**: Table, Sort=Due↑, Filter=`-status:Done due:<2026-06-15`. Save. Verify.
5. Emit summary: `view | desired | observed | PASS/FAIL`.

---

## 8. Integration with this plugin

- Run **after** `/sync-github` (or `--init`) has created fields and pushed items — layout is
  meaningless on an empty/field-less project.
- This could become a thin command (e.g. `/sync-github --layout`) or a separate skill that
  loads this reference and drives Playwright. Keep the data-push (GraphQL) and layout-config
  (browser) responsibilities **separate** — they use different transports and fail differently.
- Known limitation to surface to the user: **browser automation is brittle** (UI changes, auth
  expiry) in a way the GraphQL data-push is not. Always read-back-verify and report honestly.
