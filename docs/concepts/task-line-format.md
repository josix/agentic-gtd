# Task Line Format

Every task in `agentic-gtd` is a single line in a domain file — this page is the complete tag reference.

## Overview

Tasks use a fixed line format: checkbox, description, then space-separated `key:value` tags. Planning commands parse this format; the Obsidian dashboard writes it. Sticking to the format ensures nothing gets lost between tools.

## Line Format

```
- [ ] <next action>  prio:<value>  project:<name>  effort:<Xh|Xm>  impact:<long|short>  due:<YYYY-MM-DD>  context:<@tag,...>
```

Completed tasks use `- [x]` instead of `- [ ]`. Won't-fix tasks use `- [-]`.

Tags are **double-space-separated** from the description and from each other. Single-colon format (`key:value`) is required — do **not** use the Dataview double-colon format (`key:: value`) unless you intend to rewrite every planning command.

## Full Tag Reference

| Tag | Required | Values / format | Notes |
|-----|----------|-----------------|-------|
| `prio` | Yes* | `fulltime`, `parttime`, `side`, `trust`, `long`, `short`, `tedious` | Sets the priority ladder rank. *Missing = rank 99 + warning |
| `project` | No | any string (no spaces) | Groups tasks by project or area |
| `effort` | No | `30m`, `1h`, `2h`, `1.5h`, etc. | Used for greedy time-filling; missing = unknown (sorts last) |
| `impact` | No | `long`, `short` | Informational only; not used in ranking |
| `due` | No | `YYYY-MM-DD` | ISO date; missing or malformed = no-due (sorts last) |
| `context` | No | `@computer`, `@phone`, `@errand`, etc. (comma-separated) | Used for context filter in `/plan-day` |
| `recurs` | No | duration string, e.g. `7d`, `14d` | Marks a recurring task; pairs with `last:` |
| `last` | No | `YYYY-MM-DD` | Date of last completion; used with `recurs` to compute effective due |
| `resolution` | No | `done`, `wont-fix` | Written by dashboard resolve buttons; do not set manually |
| `resolved` | No | `YYYY-MM-DD` | Date resolution was applied; written by dashboard |

## Examples

```
- [ ] Deploy staging environment  prio:fulltime  project:backend  effort:1h  due:2026-06-15  context:@computer
- [ ] Read "Shape Up" ch 3  prio:long  effort:45m  context:@phone
- [ ] Fix flaky CI test  prio:side  project:my-app  effort:30m  context:@computer
- [ ] Water plants  prio:tedious  recurs:7d  last:2026-06-02
```

## Where the Format Is Enforced

Planning commands (`/plan-day`, `/plan-week`, `/plan-weekend`) and `/sync-github` all read this format. The Triage agent writes it. The Obsidian dashboard reads and writes individual tag tokens in place — it validates `effort` against `\d+(\.\d+)?[hm]` before committing a change.

See [Priority Ladder](../concepts/priority-ladder.md) for the meaning of each `prio` value.
