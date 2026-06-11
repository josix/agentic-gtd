# GTD Methodology

`agentic-gtd` maps the five GTD pillars to concrete plugin commands and files.

## Overview

Getting Things Done (GTD) defines five stages: Capture, Clarify, Organize, Reflect, Engage. Every command and file in `agentic-gtd` has a deliberate home in one of these stages. Understanding the mapping helps you use the right tool at the right moment.

## Pillar Mapping

| Pillar | How this plugin addresses it |
|--------|------------------------------|
| **Capture** | Raw items go to `tasks/inbox.md`; domain files hold clarified tasks |
| **Clarify** | Triage agent converts inbox items to concrete next-action lines with proper tags |
| **Organize** | Tasks filed in domain files; the priority ladder provides the organizational backbone |
| **Reflect** | `/plan-weekend` Weekly Review sweep surfaces overdue, stale, and under-specified tasks |
| **Engage** | `/plan-day` filters by hours/energy/context and produces a greedy-filled action list |

## Weekly Rhythm

A typical GTD week with `agentic-gtd` looks like this:

- **Daily** — run `/plan-day` each morning; capture new items to `tasks/inbox.md` throughout the day
- **Periodically** — paste `/triage-inbox` in Claude Code to clarify and file inbox items
- **Weekend** — run `/plan-weekend` to do the Weekly Review sweep and build a weekend plan

## Related

- [Domains](../concepts/five-domains.md) — the Organize layer
- [Capturing Tasks](../guides/capturing-tasks.md) — the Capture and Clarify workflow
- [Using /plan-weekend](../guides/using-plan-weekend.md) — the Reflect workflow
- [Using /plan-day](../guides/using-plan-day.md) — the Engage workflow
