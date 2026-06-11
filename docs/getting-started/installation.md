# Installation

Set up `agentic-gtd` and its prerequisites so you can start managing tasks.

## Overview

`agentic-gtd` is a Claude Code plugin. You load it with `--plugin-dir` and interact via slash-commands. Some features require external tools; all are listed below.

## Prerequisites

### Required

**Claude Code** — the CLI that loads the plugin. See [claude.ai/code](https://claude.ai/code).

**gh CLI** — required for `/sync-github`.

```sh
# macOS
brew install gh
gh auth login
```

**Obsidian with Dataview** — required for the interactive dashboard.

1. Install Obsidian from [obsidian.md](https://obsidian.md).
2. Open Settings → Community plugins → Browse → search "Dataview" → Install → Enable.
3. Open Dataview settings and turn on **"Enable JavaScript Queries"**. Without this the dashboard block will not execute.

### Optional

**Obsidian MCP** — enables Claude to read and append to vault notes directly.

1. Install the **Local REST API** community plugin in Obsidian and enable it. It will display an API key.
2. Export the key before launching Claude Code:

   ```sh
   export OBSIDIAN_API_KEY="<your-key-here>"
   ```

   Claude Code auto-discovers `.mcp.json` at the repo root; no further configuration is needed.

**Obsidian Tasks plugin** — enables checkbox status cycling directly inside Obsidian notes (recommended, not required).

## Plugin Install

```sh
git clone https://github.com/josix/agentic-gtd.git ~/agentic-gtd
claude --plugin-dir ~/agentic-gtd
```

## First-time Setup

1. Copy the task file templates to your `tasks/` directory:

   ```sh
   # Each domain needs a markdown file; the gitignore excludes tasks/*.md by default.
   # Create the files manually or just start adding tasks with /add-task.
   touch tasks/fulltime.md tasks/parttime.md tasks/side-projects.md \
         tasks/open-source.md tasks/knowledge.md tasks/inbox.md
   ```

   Note: this `touch` command is only needed for the five built-in domains. For any additional domains, `/add-domain` creates the task file and registers it in `tasks/domains.md` automatically.

2. (Optional) Initialise GitHub sync:

   ```sh
   /sync-github --init
   ```

   This creates a private GitHub Project, custom fields, and writes IDs to `.agentic-gtd.local.md` (automatically gitignored).

## Building the Docs Site

The documentation uses [MkDocs Material](https://squidfunk.github.io/mkdocs-material/). No global install is needed — `uvx` runs it in an isolated environment.

```sh
# Live preview at http://127.0.0.1:8000
uvx --with mkdocs-material mkdocs serve

# Static build into ./site
uvx --with mkdocs-material mkdocs build
```
