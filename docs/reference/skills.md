# Skills

The two skill modules that define `agentic-gtd`'s ranking and sync algorithms.

## Overview

Skills are domain expertise modules read by Claude when executing commands. They own the "how" — parsing logic, algorithm details, GraphQL queries — so that command files and docs can stay at the "what and why" level.

## gtd-prioritization

**Location:** [`../../skills/gtd-prioritization/SKILL.md`](../../skills/gtd-prioritization/SKILL.md)

The `gtd-prioritization` skill defines how tasks are parsed, ranked, and filtered for all planning commands. It owns the five-key tiebreak chain (prio rank → due date → effort → domain order → alphabetical), the energy-filter rules that modify the candidate list in `/plan-day`, the greedy time-fill algorithm, the recurring-task effective-due computation, and the weekend domain-reweighting logic.

This skill is read whenever `/plan-day`, `/plan-week`, or `/plan-weekend` is invoked.

## github-sync

**Location:** [`../../skills/github-sync/SKILL.md`](../../skills/github-sync/SKILL.md)

**View-layout reference:** [`../../skills/github-sync/references/view-layout-automation.md`](../../skills/github-sync/references/view-layout-automation.md)

The `github-sync` skill defines the full one-way push implementation: GraphQL mutations for creating and updating GitHub Project v2 items, field-value mapping from markdown tags to GitHub field types, the `--init` flow that creates the project and records all field and option IDs into `.agentic-gtd.local.md`, and the idempotency rules that prevent duplicate items.

The view-layout reference covers how to automate GitHub Project board view configuration (column grouping, field visibility, sort order) after the initial `--init`.

This skill is read whenever `/sync-github` is invoked.

## Related

- [GitHub Sync guide](../guides/github-sync.md) — what the user sees and does
- [Ranking concepts](../concepts/ranking.md) — user-facing ranking summary (links here for algorithm depth)
- [Commands](../reference/commands.md) — which commands consume each skill
