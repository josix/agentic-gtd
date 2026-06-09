# Triage Agent

Specification for the GTD Clarify specialist agent that converts raw inbox items into concrete task lines.

## Overview

The Triage agent is a Claude subagent loaded from `agents/Triage.md`. It embodies the GTD Clarify pillar: it reads raw, vague, or under-specified items from `tasks/inbox.md` and converts each one into a properly-formed task line with all required tags.

**Source of truth:** [`../../agents/Triage.md`](../../agents/Triage.md)

## What It Does

- Converts raw notes into concrete next-action task lines using the [Task Line Format](../concepts/task-line-format.md)
- Assigns `prio:` by reasoning about the [Priority Ladder](../concepts/priority-ladder.md)
- Infers the correct domain and appends clarified tasks to the appropriate domain file
- Flags genuinely ambiguous items in a `## Needs human decision` section instead of guessing
- Never invents due dates

## How to Invoke

```
@Triage
```

Or use `/triage-inbox` which delegates to the Triage agent automatically for each open inbox item, batches the proposals into a single confirmation, and — after you confirm — applies all writes in one pass.

## Invariants

- Items in `tasks/inbox.md` are marked `[x]` after triage, never deleted
- The inbox is append-only; the audit trail is always preserved
- The agent never writes to `tasks/inbox.md` itself — it only writes to domain files
- If an item is too ambiguous to triage, it appears in `## Needs human decision`

## Related

- [Capturing Tasks](../guides/capturing-tasks.md) — the full capture and triage workflow
- [Task Line Format](../concepts/task-line-format.md) — the format Triage writes
- [Priority Ladder](../concepts/priority-ladder.md) — how Triage assigns `prio:`
- [Commands — /triage-inbox](../reference/commands.md) — the command that invokes Triage
