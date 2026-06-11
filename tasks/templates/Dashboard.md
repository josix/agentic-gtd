# Agentic GTD Dashboard
%% 
> **INTERACTIVE DASHBOARD** — Renders a GitHub-Projects-style Board + Table dashboard with in-place editing.
> Open tasks are sourced live from `tasks/*.md` files; those files are the single source of truth.
> **Edit capabilities**: (1) Resolve tasks as Done or Won't Fix via buttons on cards and rows; (2) Edit priority, due date, effort, and context inline in table rows; (3) Reprioritize via "Move ▸" selector on board cards; (4) Block/Unblock tasks; (5) Drag-and-drop or select tasks across Status Board columns (TODO → IN PROGRESS → DONE). All writes go directly to the source `.md` file. Markdown stays the source of truth; resolve via buttons — never hard-delete a line.
>
> **PREREQUISITE**: Dataview's **"Enable JavaScript Queries" (DataviewJS)** setting must be turned ON in Settings → Community plugins → Dataview for the controls to work.
>
> Layout: **Summary bar** (stat pills) → **Plan panels** (Today / This Week / Weekend, each showing its own latest plan note) → **Status Board** (TODO / IN PROGRESS / DONE columns, drag-and-drop) → **Quick capture** → **Inbox** → **Board** (columns by priority tier, with Move + Resolve controls) → **Table** (grouped by domain, collapsible, with inline field editors + Resolve controls). %%

```dataviewjs
// ─── Section 1: Configuration ──────────────────────────────────────────────

const rankMap = {
  fulltime: 1,
  parttime: 2,
  side:     3,
  trust:    4,
  long:     5,
  short:    6,
  tedious:  7,
};
const DEFAULT_RANK = 99;

// Domain display order (daily tiebreak: index is the tiebreak weight)
const domainOrder = [
  "fulltime",
  "parttime",
  "side-projects",
  "open-source",
  "knowledge",
];

// Priority label → display name
const prioLabels = {
  fulltime: "Fulltime",
  parttime: "Parttime",
  side:     "Side",
  trust:    "Trust",
  long:     "Long",
  short:    "Short",
  tedious:  "Tedious",
};

// Priority hues (HSL, stays legible on light & dark themes)
const prioColors = {
  fulltime: { bg: "rgba(220,38,38,0.15)",   text: "#dc2626", border: "rgba(220,38,38,0.5)"   },
  parttime: { bg: "rgba(234,88,12,0.15)",   text: "#ea580c", border: "rgba(234,88,12,0.5)"   },
  side:     { bg: "rgba(22,163,74,0.15)",   text: "#16a34a", border: "rgba(22,163,74,0.5)"   },
  trust:    { bg: "rgba(13,148,136,0.15)",  text: "#0d9488", border: "rgba(13,148,136,0.5)"  },
  long:     { bg: "rgba(37,99,235,0.15)",   text: "#2563eb", border: "rgba(37,99,235,0.5)"   },
  short:    { bg: "rgba(124,58,237,0.15)",  text: "#7c3aed", border: "rgba(124,58,237,0.5)"  },
  tedious:  { bg: "rgba(100,116,139,0.15)", text: "#64748b", border: "rgba(100,116,139,0.5)" },
  _unknown: { bg: "rgba(107,114,128,0.15)", text: "#6b7280", border: "rgba(107,114,128,0.5)" },
};

// Domain hues
const domainColors = {
  "fulltime":     { bg: "rgba(220,38,38,0.15)",   text: "#dc2626", border: "rgba(220,38,38,0.5)"   },
  "parttime":     { bg: "rgba(234,88,12,0.15)",   text: "#ea580c", border: "rgba(234,88,12,0.5)"   },
  "side-projects":{ bg: "rgba(22,163,74,0.15)",   text: "#16a34a", border: "rgba(22,163,74,0.5)"   },
  "open-source":  { bg: "rgba(37,99,235,0.15)",   text: "#2563eb", border: "rgba(37,99,235,0.5)"   },
  "knowledge":    { bg: "rgba(124,58,237,0.15)",  text: "#7c3aed", border: "rgba(124,58,237,0.5)"  },
};

try {
  // ── Midnight rollover: clear any stale timer/listener from a prior block run ──
  try {
    if (dv.container) {
      if (dv.container.__ggtdMidnightTimer) {
        clearTimeout(dv.container.__ggtdMidnightTimer);
        dv.container.__ggtdMidnightTimer = null;
      }
      if (dv.container.__ggtdDayWatch) {
        document.removeEventListener("visibilitychange", dv.container.__ggtdDayWatch);
        window.removeEventListener("focus", dv.container.__ggtdDayWatch);
        dv.container.__ggtdDayWatch = null;
      }
    }
  } catch (_) {}

  // ─── Section 2: Collect open tasks ──────────────────────────────────────

  // Accept tasks from domain files or any file under /tasks/; exclude inbox, templates, and plans.
  // .array() converts DataArray → plain Array so Array.prototype.sort(compareFn) works correctly
  // (DataArray.sort uses a key-extractor signature, not a comparator; using it with compareTasks crashes).
  const _allTasksRaw = dv.pages()
    .flatMap(p => p.file.tasks)
    .filter(t => {
      if (t.status !== " ") return false;
      const path = t.path || "";
      const stem = path.split("/").pop().replace(/\.md$/i, "").toLowerCase();
      if (stem === "inbox") return false;
      if (path.toLowerCase().includes("templates")) return false;
      if (path.toLowerCase().includes("/plans/")) return false;
      const inDomain = domainOrder.includes(stem);
      const inTasksDir = path.toLowerCase().includes("/tasks/");
      return inDomain || inTasksDir;
    });
  const allTasks = typeof _allTasksRaw.array === "function" ? _allTasksRaw.array() : Array.from(_allTasksRaw);

  // ─── Section 2b: Collect resolved-today tasks (for Status Board DONE column) ─
  // Gathers tasks where checkbox is x or - AND resolved:<todayISO>.
  // Minimal records: enough to render a board card.
  const _resolvedTodayRawDV = dv.pages()
    .flatMap(p => p.file.tasks)
    .filter(t => {
      if (t.status !== "x" && t.status !== "-") return false;
      const path = t.path || "";
      const stem = path.split("/").pop().replace(/\.md$/i, "").toLowerCase();
      if (stem === "inbox") return false;
      if (path.toLowerCase().includes("templates")) return false;
      if (path.toLowerCase().includes("/plans/")) return false;
      const inDomain = domainOrder.includes(stem);
      const inTasksDir = path.toLowerCase().includes("/tasks/");
      return inDomain || inTasksDir;
    });
  const resolvedTodayRaw = typeof _resolvedTodayRawDV.array === "function"
    ? _resolvedTodayRawDV.array()
    : Array.from(_resolvedTodayRawDV);

  // ─── Section 3: Metadata extraction helpers ──────────────────────────────

  // HTML-escape user-derived strings to prevent XSS / broken markup.
  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function extract(text, pattern) {
    const m = text.match(pattern);
    return m ? m[1] : "";
  }

  // Convert effort string (e.g. "2h", "30m", "1.5h") → minutes.
  // Missing or unparseable → Infinity (sorts last in effort tiebreak).
  function effortToMinutes(effortStr) {
    if (!effortStr) return Infinity;
    const m = effortStr.match(/^(\d+(?:\.\d+)?)(h|m)$/i);
    if (!m) return Infinity;
    return m[2].toLowerCase() === "h"
      ? parseFloat(m[1]) * 60
      : parseFloat(m[1]);
  }

  // Parse "Nd", "Nw", "daily/weekly/biweekly/monthly" → Duration object via dv.luxon.
  // Returns null if unparseable.
  function parseInterval(recurs) {
    const { Duration } = dv.luxon;
    const s = recurs.toLowerCase().trim();
    if (s === "daily")    return Duration.fromObject({ days: 1 });
    if (s === "weekly")   return Duration.fromObject({ days: 7 });
    if (s === "biweekly") return Duration.fromObject({ days: 14 });
    if (s === "monthly")  return Duration.fromObject({ months: 1 });
    const nd = s.match(/^(\d+)d$/);
    if (nd) return Duration.fromObject({ days: parseInt(nd[1]) });
    const nw = s.match(/^(\d+)w$/);
    if (nw) return Duration.fromObject({ days: parseInt(nw[1]) * 7 });
    return null;
  }

  // Compute effective due epoch (ms). Returns Infinity when there is no due.
  function effectiveDueEpoch(recurs, last, due) {
    const { DateTime } = dv.luxon;
    if (recurs) {
      if (last) {
        const interval = parseInterval(recurs);
        if (interval) {
          const lastDt = DateTime.fromISO(last);
          if (lastDt.isValid) return lastDt.plus(interval).toMillis();
        }
      }
      return DateTime.now().startOf("day").toMillis();
    }
    if (due) {
      const dueDt = DateTime.fromISO(due);
      if (dueDt.isValid) return dueDt.toMillis();
    }
    return Infinity;
  }

  // ─── Section 4: Build enriched task records ──────────────────────────────

  const { DateTime } = dv.luxon;
  const today = DateTime.now().startOf("day");
  const todayMs = today.toMillis();
  const in7dMs  = today.plus({ days: 7 }).toMillis();
  const in3dMs  = today.plus({ days: 3 }).toMillis();

  const records = allTasks.map(t => {
    const text = t.text || "";

    const prio    = extract(text, /\bprio:(\S+)/);
    const project = extract(text, /\bproject:(\S+)/);
    const effort  = extract(text, /\beffort:(\S+)/);
    const due     = extract(text, /\bdue:(\d{4}-\d{2}-\d{2})/);
    const context = extract(text, /\bcontext:(\S+)/);
    const recurs  = extract(text, /\brecurs:(\S+)/);
    const last    = extract(text, /\blast:(\d{4}-\d{2}-\d{2})/);
    const impact  = extract(text, /\bimpact:(\S+)/);
    const blocked = /\bblocked:true\b/.test(text);
    const status  = extract(text, /\bstatus:(\S+)/);
    const _orderRaw = extract(text, /\border:(\d+)\b/);
    const order   = _orderRaw ? parseInt(_orderRaw, 10) : null;

    const title = text
      .replace(/\b\w+:\S+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const path = t.path || "";
    const domain = path.split("/").pop().replace(/\.md$/i, "").toLowerCase();

    const rank = rankMap[prio] ?? DEFAULT_RANK;
    const effortMin = effortToMinutes(effort);
    const duEpoch = effectiveDueEpoch(recurs, last, due);
    const domainIdx = domainOrder.indexOf(domain) !== -1
      ? domainOrder.indexOf(domain)
      : 9999;

    // Compute the display ISO date for the effective due (used in badges).
    let effectiveDueISO = due || "";
    if (recurs && last) {
      const interval = parseInterval(recurs);
      if (interval) {
        const lastDt = DateTime.fromISO(last);
        if (lastDt.isValid) effectiveDueISO = lastDt.plus(interval).toISODate();
      }
    } else if (recurs && !last) {
      effectiveDueISO = today.toISODate();
    }

    return {
      title, domain, prio, rank, effort, effortMin,
      due, effectiveDueISO, context, recurs, last, impact, blocked, status,
      duEpoch, domainIdx, project, order,
      // Source location for writes (t.line is 0-based line index in Dataview)
      path: t.path,
      line: t.line,
    };
  });

  // Build resolved-today records now that `today` and helpers are available.
  const todayISOStr = today.toISODate();
  const resolvedToday = resolvedTodayRaw
    .filter(t => {
      const text = t.text || "";
      const resolvedDate = extract(text, /\bresolved:(\d{4}-\d{2}-\d{2})/);
      return resolvedDate === todayISOStr;
    })
    .map(t => {
      const text = t.text || "";
      const prio       = extract(text, /\bprio:(\S+)/);
      const resolution = extract(text, /\bresolution:(\S+)/);
      const title      = text.replace(/\b\w+:\S+/g, "").replace(/\s{2,}/g, " ").trim();
      const path       = t.path || "";
      const domain     = path.split("/").pop().replace(/\.md$/i, "").toLowerCase();
      const due        = extract(text, /\bdue:(\d{4}-\d{2}-\d{2})/);
      const recurs     = extract(text, /\brecurs:(\S+)/);
      const last       = extract(text, /\blast:(\d{4}-\d{2}-\d{2})/);
      const blocked    = /\bblocked:true\b/.test(text);
      const duEpoch    = effectiveDueEpoch(recurs, last, due);
      let effectiveDueISO = due || "";
      if (recurs && last) {
        const interval = parseInterval(recurs);
        if (interval) {
          const lastDt = DateTime.fromISO(last);
          if (lastDt.isValid) effectiveDueISO = lastDt.plus(interval).toISODate();
        }
      } else if (recurs && !last) {
        effectiveDueISO = todayISOStr;
      }
      return { title, domain, prio, resolution, due, effectiveDueISO, recurs, last, blocked, duEpoch, path, line: t.line };
    });

  // ─── Section 4b: Recurring completions for DONE column ──────────────────
  // Recurring tasks keep their [ ] checkbox when "done" — their last: is bumped to today.
  // They never appear in resolvedTodayRaw (which requires [x]/[-]), but the user expects
  // to see them in DONE after completing a cycle.  Source them from `records` directly.
  const recurringCompletedToday = records
    .filter(r => r.recurs && r.last === todayISOStr && r.status !== "in-progress")
    .map(r => Object.assign({}, r, { resolution: "recurring" }));

  // ─── Section 5: Sort comparator (strict tiebreak per SKILL.md) ───────────

  function compareTasks(a, b) {
    // Step 1: prio rank (strict, never overridden)
    if (a.rank !== b.rank) return a.rank - b.rank;
    // Step 2: manual order ascending — tasks without order:N sort after ordered siblings
    //         within the same rank; never crosses prio-rank boundaries.
    const ao = (a.order == null) ? Infinity : a.order;
    const bo = (b.order == null) ? Infinity : b.order;
    if (ao !== bo) return ao - bo;
    // Step 3: due-date proximity
    if (a.duEpoch !== b.duEpoch) {
      if (a.duEpoch === Infinity) return 1;
      if (b.duEpoch === Infinity) return -1;
      return a.duEpoch - b.duEpoch;
    }
    // Step 4: effort ascending
    if (a.effortMin !== b.effortMin) {
      if (a.effortMin === Infinity) return 1;
      if (b.effortMin === Infinity) return -1;
      return a.effortMin - b.effortMin;
    }
    // Step 5: domain order
    if (a.domainIdx !== b.domainIdx) return a.domainIdx - b.domainIdx;
    // Step 6: alphabetical by title
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  }

  const sorted = records.sort(compareTasks);

  // ─── Section 6: Shared rendering helpers ─────────────────────────────────

  // Build an inline-styled pill/badge span.
  function pill(label, colorObj, extraStyle) {
    const c = colorObj || prioColors._unknown;
    const base = [
      "display:inline-block",
      "padding:1px 7px",
      "border-radius:9999px",
      "font-size:11px",
      "font-weight:600",
      "line-height:1.6",
      "white-space:nowrap",
      `background:${c.bg}`,
      `color:${c.text}`,
      `border:1px solid ${c.border}`,
    ].join(";");
    return `<span style="${base}${extraStyle ? ";" + extraStyle : ""}">${esc(label)}</span>`;
  }

  // Compute due badge HTML given a record.
  // Returns an HTML string with appropriate color and text.
  function dueBadge(r) {
    const recurGlyph = r.recurs ? " ↻" : "";
    if (r.duEpoch === Infinity) {
      return pill("No date", { bg: "rgba(107,114,128,0.1)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" });
    }
    // Format the effective due as "Mon DD" for display.
    const dt = DateTime.fromMillis(r.duEpoch);
    const label = dt.isValid ? dt.toFormat("MMM dd") : r.effectiveDueISO;
    if (r.duEpoch < todayMs) {
      return pill("⚠ Overdue (" + label + ")" + recurGlyph,
        { bg: "rgba(220,38,38,0.15)", text: "#dc2626", border: "rgba(220,38,38,0.5)" });
    }
    if (r.duEpoch <= in3dMs) {
      return pill("Due soon (" + label + ")" + recurGlyph,
        { bg: "rgba(245,158,11,0.15)", text: "#d97706", border: "rgba(245,158,11,0.5)" });
    }
    if (r.duEpoch <= in7dMs) {
      return pill(label + recurGlyph,
        { bg: "rgba(16,185,129,0.12)", text: "#059669", border: "rgba(16,185,129,0.4)" });
    }
    return pill(label + recurGlyph,
      { bg: "rgba(107,114,128,0.1)", text: "#6b7280", border: "rgba(107,114,128,0.3)" });
  }

  function blockedBadge(r) {
    if (!r.blocked) return "";
    return pill("🚫 Blocked",
      { bg: "rgba(220,38,38,0.15)", text: "#dc2626", border: "rgba(220,38,38,0.5)" });
  }

  // ─── Section 7: Summary bar ──────────────────────────────────────────────
  // Stat pills: total, overdue, due-this-week, per-domain counts.

  const totalOpen = sorted.length;
  const overdueCount  = sorted.filter(r => r.duEpoch !== Infinity && r.duEpoch < todayMs).length;
  const dueWeekCount  = sorted.filter(r => r.duEpoch !== Infinity && r.duEpoch >= todayMs && r.duEpoch <= in7dMs).length;

  // Per-domain counts for the known domains only.
  const domainCounts = {};
  for (const d of domainOrder) {
    domainCounts[d] = sorted.filter(r => r.domain === d).length;
  }

  function statCard(value, label, color) {
    return `<div style="display:inline-flex;flex-direction:column;align-items:center;` +
      `padding:8px 18px;border-radius:10px;` +
      `background:${color.bg};border:1px solid ${color.border};margin:4px 6px 4px 0;">` +
      `<span style="font-size:22px;font-weight:700;color:${color.text};line-height:1.2;">${value}</span>` +
      `<span style="font-size:11px;color:${color.text};opacity:0.85;margin-top:2px;">${esc(label)}</span>` +
      `</div>`;
  }

  const domainPillsHtml = domainOrder.map(d => {
    const c = domainColors[d] || prioColors._unknown;
    const displayName = d.charAt(0).toUpperCase() + d.slice(1);
    return `<span style="font-size:12px;font-weight:500;color:${c.text};margin-right:10px;">` +
      `${esc(displayName)} <strong>${domainCounts[d] || 0}</strong></span>`;
  }).join("");

  const summaryHtml =
    `<div style="margin-bottom:20px;">` +
      `<div style="font-size:13px;font-weight:700;letter-spacing:.05em;` +
        `text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Task Overview</div>` +
      `<div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:4px;">` +
        statCard(totalOpen, "Total open",
          { bg: "rgba(37,99,235,0.1)", text: "#2563eb", border: "rgba(37,99,235,0.35)" }) +
        statCard(overdueCount, "Overdue",
          { bg: "rgba(220,38,38,0.1)", text: "#dc2626", border: "rgba(220,38,38,0.35)" }) +
        statCard(dueWeekCount, "Due this week",
          { bg: "rgba(245,158,11,0.1)", text: "#d97706", border: "rgba(245,158,11,0.35)" }) +
      `</div>` +
      `<div style="display:flex;flex-wrap:wrap;align-items:center;` +
        `margin-top:8px;padding:6px 10px;border-radius:8px;` +
        `background:rgba(107,114,128,0.07);border:1px solid rgba(107,114,128,0.2);">` +
        domainPillsHtml +
      `</div>` +
    `</div>`;

  dv.el("div", summaryHtml);

  // ─── Section 7b: Plan panels — Today / Week / Weekend (shown separately) ──
  // Renders three independent panels, one per plan mode. For each mode we pick
  // the most recent plan note (tasks/plans/*.md) by plan-date. Plan-note
  // checkboxes are excluded from the main task board (see Section 2).

  const planSection = dv.el("div", "");

  // Build a live open-task lookup by title for dimming completed plan items.
  const openTitles = new Set(records.map(r => r.title.toLowerCase().trim()));

  // Map normalized task title -> short plan label (soonest plan wins) so the
  // board (Section 11) can badge tasks that are already scheduled in a plan.
  const scheduledTitles = new Map();

  // Plan-date as an ISO (YYYY-MM-DD) string. Plan notes are named <date>.md, so
  // the filename is the canonical, timezone-proof plan date — prefer it. Fall
  // back to the plan-date frontmatter (DateTime or raw string) when the name
  // isn't a bare date.
  function planDateISO(p) {
    const fn = (p.file && p.file.name) ? String(p.file.name) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(fn)) return fn;
    const d = p["plan-date"];
    if (d && typeof d.toISODate === "function") return d.toISODate();
    return String(d || "");
  }

  // Parse a plan task line: strip "N. [rank] " prefix, return the raw task line.
  // Returns null if the line doesn't match the expected format.
  function parsePlanLine(line) {
    const m = line.match(/^\d+\.\s*\[\d+\]\s*(- \[[ x\-]\]\s*.+)$/);
    if (!m) return null;
    return m[1].trim();
  }

  // Extract tags from a raw task line and build a minimal record for rendering.
  function planLineToRecord(rawLine) {
    const text = rawLine.replace(/^- \[[ x\-]\]\s*/, "");
    const prio    = extract(text, /\bprio:(\S+)/);
    const due     = extract(text, /\bdue:(\d{4}-\d{2}-\d{2})/);
    const context = extract(text, /\bcontext:(\S+)/);
    const recurs  = extract(text, /\brecurs:(\S+)/);
    const last    = extract(text, /\blast:(\d{4}-\d{2}-\d{2})/);
    const effort  = extract(text, /\beffort:(\S+)/);
    const domain  = extract(text, /\bdomain:(\S+)/) || "";
    const blocked = /\bblocked:true\b/.test(text);
    const title   = text.replace(/\b\w+:\S+/g, "").replace(/\s{2,}/g, " ").trim();
    const duEpoch = effectiveDueEpoch(recurs, last, due);
    let effectiveDueISO = due || "";
    if (recurs && last) {
      const interval = parseInterval(recurs);
      if (interval) {
        const lastDt = DateTime.fromISO(last);
        if (lastDt.isValid) effectiveDueISO = lastDt.plus(interval).toISODate();
      }
    } else if (recurs && !last) {
      effectiveDueISO = today.toISODate();
    }
    return { title, prio, due, context, recurs, last, effort, domain, blocked, duEpoch, effectiveDueISO };
  }

  // Render a single plan task row into the given container.
  function renderPlanRow(rawLine, container, badgeLabel) {
    const rec = planLineToRecord(rawLine);
    const _k = rec.title.toLowerCase().trim();
    if (badgeLabel && _k && !scheduledTitles.has(_k)) scheduledTitles.set(_k, badgeLabel);
    const isOpen = openTitles.has(rec.title.toLowerCase().trim());
    const dc = domainColors[rec.domain] || prioColors._unknown;

    const row = document.createElement("div");
    applyStyles(row, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "3px 0",
      opacity: isOpen ? "1" : "0.45",
      textDecoration: isOpen ? "none" : "line-through",
    });

    const titleSpan = document.createElement("span");
    applyStyles(titleSpan, { fontSize: "13px", flex: "1", wordBreak: "break-word" });
    titleSpan.textContent = rec.title;
    row.appendChild(titleSpan);

    const badgeWrap = document.createElement("span");
    badgeWrap.innerHTML = dueBadge(rec);
    row.appendChild(badgeWrap);

    if (rec.domain) {
      const domainPill = document.createElement("span");
      domainPill.innerHTML = pill(rec.domain, dc);
      row.appendChild(domainPill);
    }

    if (rec.blocked) {
      const blockedSpan = document.createElement("span");
      blockedSpan.innerHTML = blockedBadge(rec);
      row.appendChild(blockedSpan);
    }

    container.appendChild(row);
  }

  // Discover plan notes once. Vault-root-agnostic: scan all pages and keep
  // plan notes whose containing folder is named "plans". Matching by folder
  // name (not a "/plans/" path substring) works whether the vault is rooted
  // at the repo (folder "tasks/plans") or at the tasks dir itself (folder
  // "plans"), where the path has no leading slash before "plans".
  let planPages = [];
  try {
    planPages = dv.pages().where(p => {
      if (p.type !== "plan" || !p["plan-date"]) return false;
      const folder = (p.file && p.file.folder ? String(p.file.folder) : "").toLowerCase();
      return folder === "plans" || folder.endsWith("/plans");
    });
  } catch (_) { planPages = []; }

  // Pick a plan note for a panel config.
  //  - cfg.dateISO present → exact plan-date match (e.g. today vs tomorrow).
  //  - otherwise            → the most recent note of that mode (by plan-date desc).
  function findPlanForPanel(cfg) {
    let matches = planPages.filter(p => (p.mode || "day") === cfg.mode);
    if (cfg.dateISO) matches = matches.filter(p => planDateISO(p) === cfg.dateISO);
    const arr = matches.sort(p => planDateISO(p), "desc");
    return (arr && arr.length > 0) ? arr[0] : null;
  }

  // Render one plan panel (header + body) for a given mode config.
  async function renderPlanPanel(cfg) {
    const headerEl = document.createElement("div");
    applyStyles(headerEl, {
      fontSize: "13px",
      fontWeight: "700",
      color: "#6b7280",
      marginBottom: "8px",
      paddingBottom: "4px",
      borderBottom: "2px solid rgba(107,114,128,0.2)",
    });
    headerEl.textContent = cfg.header;
    planSection.appendChild(headerEl);

    const planPage = findPlanForPanel(cfg);
    if (!planPage) {
      const emptyPlan = document.createElement("div");
      applyStyles(emptyPlan, {
        fontSize: "12px", color: "#9ca3af", fontStyle: "italic", marginBottom: "20px",
      });
      emptyPlan.textContent = cfg.emptyText;
      planSection.appendChild(emptyPlan);
      return;
    }

    const planFile = app.vault.getAbstractFileByPath(planPage.file.path);
    if (!planFile) {
      const missingMsg = document.createElement("div");
      applyStyles(missingMsg, {
        fontSize: "12px", color: "#9ca3af", fontStyle: "italic", marginBottom: "20px",
      });
      missingMsg.textContent = "Plan note found but could not be read from vault.";
      planSection.appendChild(missingMsg);
      return;
    }

    const planDt = DateTime.fromISO(planDateISO(planPage));
    const rawContent = await app.vault.read(planFile);
    const lines = rawContent.split("\n");

    // Parse the plan note's sections.
    let inToday = false, inFollowing = false, inFulltime = false, currentDayHeader = null;
    const todayLines = [];
    const fulltimeLines = [];          // weekend mode: ## Full-time (optional)
    const followingDays = {};          // date string → [rawLine, ...]
    const followingOrder = [];

    for (const line of lines) {
      if (/^## Today\s*$/.test(line)) {
        inToday = true; inFollowing = false; inFulltime = false; currentDayHeader = null; continue;
      }
      if (/^## Following days\s*$/i.test(line)) {
        inToday = false; inFollowing = true; inFulltime = false; continue;
      }
      if (/^## Full-time/i.test(line)) {
        inToday = false; inFollowing = false; inFulltime = true; continue;
      }
      if (/^## /.test(line)) {
        inToday = false; inFollowing = false; inFulltime = false; continue;
      }
      if (inFollowing && /^### (\d{4}-\d{2}-\d{2})\s*$/.test(line)) {
        const dm = line.match(/^### (\d{4}-\d{2}-\d{2})/);
        currentDayHeader = dm[1];
        if (!followingDays[currentDayHeader]) {
          followingDays[currentDayHeader] = [];
          followingOrder.push(currentDayHeader);
        }
        continue;
      }
      const parsed = parsePlanLine(line.trim());
      if (!parsed) continue;
      if (inToday) todayLines.push(parsed);
      else if (inFulltime) fulltimeLines.push(parsed);
      else if (inFollowing && currentDayHeader) followingDays[currentDayHeader].push(parsed);
    }

    // Primary group (Today for day, Week-of for week, Weekend for weekend).
    const todayGroup = document.createElement("div");
    applyStyles(todayGroup, { marginBottom: "12px" });

    const todayLabel = document.createElement("div");
    applyStyles(todayLabel, { fontSize: "12px", fontWeight: "700", color: "#2563eb", marginBottom: "4px" });
    if (cfg.mode === "weekend") {
      todayLabel.textContent = "Weekend Plan";
    } else if (cfg.mode === "week") {
      todayLabel.textContent = "Week of " + (planDt.isValid ? planDt.toFormat("MMM dd") : planDateISO(planPage));
    } else {
      todayLabel.textContent = planDt.isValid ? planDt.toFormat("EEE MMM dd") : planDateISO(planPage);
    }
    todayGroup.appendChild(todayLabel);

    if (todayLines.length === 0) {
      const emptyToday = document.createElement("div");
      applyStyles(emptyToday, { fontSize: "12px", color: "#9ca3af", fontStyle: "italic" });
      emptyToday.textContent = cfg.mode === "weekend"
        ? "No tasks planned for this weekend."
        : "No tasks planned.";
      todayGroup.appendChild(emptyToday);
    } else {
      for (const rl of todayLines) renderPlanRow(rl, todayGroup, cfg.badgeLabel);
    }
    planSection.appendChild(todayGroup);

    // Full-time (optional) group — weekend mode only.
    if (cfg.mode === "weekend" && fulltimeLines.length > 0) {
      const ftLabel = document.createElement("div");
      applyStyles(ftLabel, { fontSize: "12px", fontWeight: "700", color: "#6b7280", marginTop: "8px", marginBottom: "4px" });
      ftLabel.textContent = "Full-time (optional)";
      planSection.appendChild(ftLabel);

      const ftGroup = document.createElement("div");
      applyStyles(ftGroup, { marginBottom: "8px", paddingLeft: "8px" });
      for (const rl of fulltimeLines) renderPlanRow(rl, ftGroup, cfg.badgeLabel);
      planSection.appendChild(ftGroup);
    }

    // Following days group — week mode only.
    if (cfg.mode === "week" && followingOrder.length > 0) {
      const followLabel = document.createElement("div");
      applyStyles(followLabel, { fontSize: "12px", fontWeight: "700", color: "#6b7280", marginTop: "8px", marginBottom: "4px" });
      followLabel.textContent = "Following days";
      planSection.appendChild(followLabel);

      for (const dayKey of followingOrder) {
        const dayGroup = document.createElement("div");
        applyStyles(dayGroup, { marginBottom: "8px", paddingLeft: "8px" });

        const dayDt = DateTime.fromISO(dayKey);
        const dayLabel = document.createElement("div");
        applyStyles(dayLabel, { fontSize: "11px", fontWeight: "600", color: "#9ca3af", marginBottom: "3px" });
        dayLabel.textContent = dayDt.isValid ? dayDt.toFormat("EEE MMM dd") : dayKey;
        dayGroup.appendChild(dayLabel);

        for (const rl of followingDays[dayKey]) renderPlanRow(rl, dayGroup, cfg.badgeLabel);
        planSection.appendChild(dayGroup);
      }
    }

    // Plan metadata footer.
    const planFooter = document.createElement("div");
    applyStyles(planFooter, { fontSize: "11px", color: "#9ca3af", marginTop: "6px", marginBottom: "20px" });
    planFooter.textContent = "Plan: " + planPage.file.path;
    planSection.appendChild(planFooter);
  }

  try {
    // Render the three plan panels in sequence, each from its own latest note.
    const todayISO    = today.toISODate();
    const tomorrowISO = today.plus({ days: 1 }).toISODate();
    await renderPlanPanel({ mode: "day",     dateISO: todayISO,    header: "📅 Today's Plan",      emptyText: "No plan for today — run /plan-day.",                     badgeLabel: "Today" });
    await renderPlanPanel({ mode: "day",     dateISO: tomorrowISO, header: "⏭️ Tomorrow's Plan",   emptyText: "No plan for tomorrow yet — run /plan-day for tomorrow.", badgeLabel: "Tomorrow" });
    await renderPlanPanel({ mode: "week",    header: "🗓️ This Week's Plan",  emptyText: "No weekly plan yet — run /plan-week.",                       badgeLabel: "This Week" });
    await renderPlanPanel({ mode: "weekend", header: "🌅 Weekend Plan",      emptyText: "No weekend plan yet — run /plan-weekend.",                   badgeLabel: "Weekend" });
  } catch (planErr) {
    // Plan panel errors must not crash the rest of the dashboard.
    const errMsg = document.createElement("div");
    applyStyles(errMsg, { fontSize: "12px", color: "#dc2626", fontStyle: "italic", marginBottom: "20px" });
    errMsg.textContent = "Plan panel error: " + planErr.message;
    planSection.appendChild(errMsg);
  }

  // ─── Section 7c: Status Board — TODO / IN PROGRESS / DONE ───────────────
  // TODO column: tasks scheduled in today's plan and not yet in-progress.
  // IN PROGRESS column: open tasks with status:in-progress.
  // DONE/WON'T FIX column: tasks resolved today.

  // Module-scope drag payload (avoids DataTransfer serialization quirks).
  let _dragPayload = null;

  // Status write helpers.
  async function setStatusInProgress(r) {
    await rewriteLine(r.path, r.line, r.title, (line) => setField(line, "status", "in-progress"));
  }

  async function clearStatus(r) {
    await rewriteLine(r.path, r.line, r.title, (line) => unsetField(line, "status"));
  }

  function rebuildView() {
    try { app?.commands?.executeCommandById?.("dataview:dataview-rebuild-current-view"); } catch (_) {}
  }

  // Build a status-board card element.
  function buildStatusCardEl(r, sourceCol) {
    const dc = domainColors[r.domain] || prioColors._unknown;
    const displayDomain = r.domain ? (r.domain.charAt(0).toUpperCase() + r.domain.slice(1)) : "—";
    const pc = prioColors[r.prio] || prioColors._unknown;
    const prioLabel = r.prio ? (prioLabels[r.prio] || r.prio) : null;

    const card = document.createElement("div");
    applyStyles(card, {
      background: "var(--background-primary,#fff)",
      border: "1px solid rgba(107,114,128,0.25)",
      borderRadius: "8px",
      padding: "10px 12px",
      marginBottom: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      cursor: sourceCol !== "done" ? "grab" : "default",
    });

    if (sourceCol !== "done") {
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        _dragPayload = { r, sourceCol };
        card.style.opacity = "0.5";
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => { card.style.opacity = "1"; });
    }

    // Resolution marker for DONE column.
    if (sourceCol === "done") {
      const marker = document.createElement("span");
      if (r.resolution === "recurring") {
        // Recurring cycle completed today — open [ ] with last: bumped to today.
        marker.innerHTML = pill("♻ Recurring", { bg: "rgba(37,99,235,0.15)", text: "#2563eb", border: "rgba(37,99,235,0.5)" });
        applyStyles(marker, { display: "block", marginBottom: "6px" });
        card.appendChild(marker);
        // Muted hint showing next cycle interval.
        const hint = document.createElement("div");
        applyStyles(hint, { fontSize: "10px", color: "#9ca3af", marginBottom: "4px" });
        hint.textContent = "recurring — next cycle in " + r.recurs;
        card.appendChild(hint);
      } else {
        const isDone = r.resolution === "done";
        marker.innerHTML = isDone
          ? pill("✓ Done", { bg: "rgba(22,163,74,0.15)", text: "#16a34a", border: "rgba(22,163,74,0.5)" })
          : pill("✕ Won't Fix", { bg: "rgba(107,114,128,0.12)", text: "#6b7280", border: "rgba(107,114,128,0.4)" });
        applyStyles(marker, { display: "block", marginBottom: "6px" });
        card.appendChild(marker);
      }
    }

    const titleEl = document.createElement("div");
    applyStyles(titleEl, {
      fontSize: "13px",
      fontWeight: "500",
      marginBottom: "6px",
      lineHeight: "1.4",
      wordBreak: "break-word",
    });
    titleEl.textContent = r.title;
    card.appendChild(titleEl);

    const metaRow = document.createElement("div");
    applyStyles(metaRow, { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginBottom: sourceCol !== "done" ? "8px" : "0" });
    let metaHtml = pill(displayDomain, dc);
    if (prioLabel) metaHtml += pill(prioLabel, pc);
    metaHtml += dueBadge(r);
    if (r.blocked) metaHtml += blockedBadge(r);
    metaRow.innerHTML = metaHtml;
    card.appendChild(metaRow);

    // Select fallback for TODO / IN PROGRESS cards.
    if (sourceCol !== "done") {
      const ctrlRow = document.createElement("div");
      applyStyles(ctrlRow, { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", marginTop: "2px" });

      const statusLabel = document.createElement("span");
      applyStyles(statusLabel, { fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap" });
      statusLabel.textContent = "Status ▸";
      ctrlRow.appendChild(statusLabel);

      const statusSelect = document.createElement("select");
      applyStyles(statusSelect, {
        fontSize: "11px",
        padding: "1px 4px",
        borderRadius: "4px",
        border: "1px solid rgba(107,114,128,0.4)",
        background: "var(--background-primary,#fff)",
        color: "var(--text-normal,#374151)",
        cursor: "pointer",
      });
      const statusOptions = [
        { value: "", label: "—" },
        { value: "todo", label: "To do" },
        { value: "in-progress", label: "In progress" },
        { value: "done", label: "Done" },
        { value: "wont-fix", label: "Won't fix" },
      ];
      for (const opt of statusOptions) {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        const curVal = sourceCol === "inprogress" ? "in-progress" : "";
        if (opt.value === curVal) o.selected = true;
        statusSelect.appendChild(o);
      }
      statusSelect.addEventListener("change", async (e) => {
        const sel = e.target;
        const chosen = sel.value;
        if (chosen === "in-progress") {
          await setStatusInProgress(r);
        } else if (chosen === "todo") {
          await clearStatus(r);
        } else if (chosen === "done") {
          const ok = await resolveTask(r, "done");
          if (!ok) { sel.value = r.status || "todo"; return; }
          if (r.recurs) new Notice("Recurring task: cycle completed — moved to DONE for today");
          rebuildView();
          return;
        } else if (chosen === "wont-fix") {
          const ok = await resolveTask(r, "wontfix");
          if (!ok) { sel.value = r.status || "todo"; return; }
          rebuildView();
          return;
        }
        rebuildView();
      });
      ctrlRow.appendChild(statusSelect);
      card.appendChild(ctrlRow);
    }

    return card;
  }

  // Build a droppable column element.
  // `records` is an array of task records (not pre-built card elements).
  // Cards are built internally so project sub-headers can be interleaved.
  function buildStatusColEl(colId, label, color, records, placeholder) {
    const col = document.createElement("div");
    applyStyles(col, {
      minWidth: "220px",
      maxWidth: "340px",
      flex: "1 1 220px",
      background: "rgba(107,114,128,0.04)",
      border: "1px solid rgba(107,114,128,0.15)",
      borderRadius: "10px",
      padding: "10px 10px 4px",
      display: "flex",
      flexDirection: "column",
      transition: "background 0.15s",
    });

    const colHeader = document.createElement("div");
    applyStyles(colHeader, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "10px",
      paddingBottom: "6px",
      borderBottom: `2px solid ${color.border}`,
    });
    const colTitle = document.createElement("span");
    applyStyles(colTitle, {
      fontSize: "12px",
      fontWeight: "700",
      color: color.text,
      textTransform: "uppercase",
      letterSpacing: ".04em",
    });
    colTitle.textContent = label;
    colHeader.appendChild(colTitle);

    const colBadge = document.createElement("span");
    applyStyles(colBadge, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "20px",
      height: "20px",
      borderRadius: "9999px",
      background: color.bg,
      color: color.text,
      fontSize: "11px",
      fontWeight: "700",
      border: `1px solid ${color.border}`,
      padding: "0 4px",
    });
    colBadge.textContent = String(records.length);
    colHeader.appendChild(colBadge);
    col.appendChild(colHeader);

    if (records.length === 0) {
      const empty = document.createElement("div");
      applyStyles(empty, { fontSize: "12px", color: "#9ca3af", fontStyle: "italic", padding: "8px 4px" });
      empty.textContent = placeholder;
      col.appendChild(empty);
    } else {
      // Cluster records by project; sub-header divs are flat siblings of cards
      // so drop handlers (attached at column level) are unaffected.
      const { flat: statusFlat, groups: statusGroups } = clusterByProject(records);
      const showStatusSubHdrs = !(statusGroups.length === 1 && statusGroups[0].project === null);
      for (const grp of statusGroups) {
        if (showStatusSubHdrs) {
          const subHdr = document.createElement("div");
          applyStyles(subHdr, {
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: ".03em",
            color: "#6b7280",
            marginTop: "6px",
            marginBottom: "4px",
            paddingBottom: "3px",
            borderBottom: "1px solid rgba(107,114,128,0.2)",
          });
          subHdr.textContent = grp.project ? grp.project : "(no project)";
          col.appendChild(subHdr);
        }
        for (let i = grp.start; i < grp.start + grp.count; i++) {
          col.appendChild(buildStatusCardEl(statusFlat[i], colId));
        }
      }
    }

    // Drag-and-drop target (not for DONE column).
    if (colId !== "done") {
      col.addEventListener("dragover", (e) => {
        if (!_dragPayload) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        col.style.background = "rgba(37,99,235,0.07)";
        col.style.borderColor = "rgba(37,99,235,0.4)";
      });
      col.addEventListener("dragleave", () => {
        col.style.background = "rgba(107,114,128,0.04)";
        col.style.borderColor = "rgba(107,114,128,0.15)";
      });
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.style.background = "rgba(107,114,128,0.04)";
        col.style.borderColor = "rgba(107,114,128,0.15)";
        if (!_dragPayload) return;
        const { r, sourceCol } = _dragPayload;
        _dragPayload = null;
        if (sourceCol === colId) return;
        if (colId === "inprogress") {
          await setStatusInProgress(r);
          rebuildView();
        } else if (colId === "todo") {
          await clearStatus(r);
          rebuildView();
        }
      });
    } else {
      // DONE column accepts drops.
      col.addEventListener("dragover", (e) => {
        if (!_dragPayload) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        col.style.background = "rgba(22,163,74,0.07)";
        col.style.borderColor = "rgba(22,163,74,0.4)";
      });
      col.addEventListener("dragleave", () => {
        col.style.background = "rgba(107,114,128,0.04)";
        col.style.borderColor = "rgba(107,114,128,0.15)";
      });
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.style.background = "rgba(107,114,128,0.04)";
        col.style.borderColor = "rgba(107,114,128,0.15)";
        if (!_dragPayload) return;
        const { r } = _dragPayload;
        _dragPayload = null;
        // Clear status first, then resolve. Mirrors resolveTask semantics.
        await rewriteLine(r.path, r.line, r.title, (line) => {
          let l = unsetField(line, "status");
          if (r.recurs) {
            // Recurring + DONE: bump last:, keep [ ], no resolution/resolved tags
            new Notice("Recurring task: cycle completed — moved to DONE for today");
            return setField(l, "last", todayISO());
          }
          l = setCheckbox(l, "x");
          l = setField(l, "resolution", "done");
          l = setField(l, "resolved", todayISO());
          return l;
        });
        rebuildView();
      });
    }

    return col;
  }

  // Partition open records for the status board.
  const inProgressRecords = records.filter(r => r.status === "in-progress");
  const todoRecords = records.filter(r => {
    const key = (r.title || "").toLowerCase().trim();
    if (!scheduledTitles.has(key)) return false;
    if (r.status === "in-progress") return false;
    // Exclude recurring tasks already completed this cycle (last: set to today)
    if (r.recurs && r.last === todayISOStr) return false;
    return true;
  });

  const statusBoardSection = dv.el("div", "");
  try {
  const statusBoardHeader = document.createElement("div");
  applyStyles(statusBoardHeader, {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "12px",
    paddingBottom: "4px",
    borderBottom: "2px solid rgba(107,114,128,0.2)",
  });
  statusBoardHeader.textContent = "Status Board";
  statusBoardSection.appendChild(statusBoardHeader);

  const statusBoardRow = document.createElement("div");
  applyStyles(statusBoardRow, {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "24px",
  });

  statusBoardRow.appendChild(buildStatusColEl(
    "todo",
    "TODO",
    { bg: "rgba(37,99,235,0.12)", text: "#2563eb", border: "rgba(37,99,235,0.4)" },
    todoRecords,
    "Nothing planned"
  ));
  statusBoardRow.appendChild(buildStatusColEl(
    "inprogress",
    "IN PROGRESS",
    { bg: "rgba(245,158,11,0.12)", text: "#d97706", border: "rgba(245,158,11,0.4)" },
    inProgressRecords,
    "Drag a card here"
  ));
  // Combine standard resolved-today records with recurring cycle completions.
  // recurringCompletedToday: open [ ] tasks with recurs: and last: == today (cycle done).
  const doneRecords = [
    ...resolvedToday,
    ...recurringCompletedToday,
  ];
  statusBoardRow.appendChild(buildStatusColEl(
    "done",
    "DONE / WON'T FIX",
    { bg: "rgba(22,163,74,0.12)", text: "#16a34a", border: "rgba(22,163,74,0.4)" },
    doneRecords,
    "Nothing resolved today"
  ));

  statusBoardSection.appendChild(statusBoardRow);
  } catch (sbErr) {
    // Status Board render error must not crash the rest of the dashboard.
    const sbErrEl = document.createElement("div");
    applyStyles(sbErrEl, { fontSize: "12px", color: "#9ca3af", fontStyle: "italic", marginBottom: "24px" });
    sbErrEl.textContent = "Status Board unavailable: " + sbErr.message;
    statusBoardSection.appendChild(sbErrEl);
  }

  // ─── Section 8a: Quick Capture form ─────────────────────────────────────
  // Appends a raw `- [ ] <text>` line to tasks/inbox.md.
  // Built with real DOM nodes (no innerHTML) to avoid injection risks.

  const captureSection = dv.el("div", "");

  const captureHeader = document.createElement("div");
  applyStyles(captureHeader, {
    fontSize: "13px",
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });
  captureHeader.textContent = "➕ Quick capture";
  captureSection.appendChild(captureHeader);

  const captureRow = document.createElement("div");
  applyStyles(captureRow, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
  });

  const captureInput = document.createElement("input");
  captureInput.type = "text";
  captureInput.placeholder = "What needs doing?";
  applyStyles(captureInput, {
    flex: "1",
    fontSize: "13px",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(107,114,128,0.4)",
    background: "var(--background-primary,#fff)",
    color: "var(--text-normal,#374151)",
    minWidth: "0",
  });
  captureRow.appendChild(captureInput);

  const captureBtn = document.createElement("button");
  captureBtn.textContent = "Add to inbox";
  applyStyles(captureBtn, {
    fontSize: "12px",
    fontWeight: "600",
    padding: "5px 14px",
    borderRadius: "6px",
    border: "1px solid rgba(37,99,235,0.5)",
    background: "rgba(37,99,235,0.1)",
    color: "#2563eb",
    cursor: "pointer",
    whiteSpace: "nowrap",
  });
  captureRow.appendChild(captureBtn);

  captureSection.appendChild(captureRow);

  async function handleCapture() {
    const raw = captureInput.value.trim();
    if (!raw) return;
    const inboxFile = resolveInboxFile();
    if (!inboxFile) {
      new Notice("Quick capture: inbox.md not found in vault");
      return;
    }
    // Strip CR/LF (and collapse to a single space) so pasted multi-line text
    // cannot inject extra lines into inbox.md.
    const safeLine = "- [ ] " + raw.replace(/[\r\n]+/g, " ").trim();
    await appendLine(inboxFile.path, safeLine);
    captureInput.value = "";
    new Notice("Captured to inbox");
  }

  captureBtn.addEventListener("click", handleCapture);
  captureInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleCapture();
  });

  // ─── Section 8b: Inbox — needs triage ───────────────────────────────────
  // Shows open (- [ ]) raw items from tasks/inbox.md via Dataview file tasks.
  // Inbox IS included here (it is excluded from the main task board above).

  const inboxSection = dv.el("div", "");

  // Collect open inbox items from the live inbox only (never the template).
  // Uses the same resolveInboxFile() logic so the two paths stay in sync.
  let inboxItems = [];
  try {
    const liveInboxFile = resolveInboxFile();
    if (liveInboxFile) {
      const livePath = liveInboxFile.path;
      const inboxPages = dv.pages().filter(p => p.file.path === livePath);
      inboxPages.forEach(p => {
        p.file.tasks
          .filter(t => t.status === " ")
          .forEach(t => inboxItems.push(t.text || ""));
      });
    }
  } catch (_) {
    // If Dataview can't read the inbox, show nothing rather than crashing.
  }

  const inboxHeader = document.createElement("div");
  applyStyles(inboxHeader, {
    fontSize: "13px",
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  });
  inboxHeader.textContent = "📥 Inbox · needs triage (" + inboxItems.length + ")";
  inboxSection.appendChild(inboxHeader);

  const inboxHint = document.createElement("div");
  applyStyles(inboxHint, {
    fontSize: "11px",
    color: "#9ca3af",
    marginBottom: "8px",
  });
  inboxHint.textContent = "Run /triage-inbox in Claude Code to clarify these and file them into the right domain.";
  inboxSection.appendChild(inboxHint);

  if (inboxItems.length === 0) {
    const clearMsg = document.createElement("div");
    applyStyles(clearMsg, {
      fontSize: "12px",
      color: "#9ca3af",
      fontStyle: "italic",
      marginBottom: "8px",
    });
    clearMsg.textContent = "Inbox clear ✓";
    inboxSection.appendChild(clearMsg);
  } else {
    const inboxList = document.createElement("ul");
    applyStyles(inboxList, {
      margin: "0 0 8px 0",
      padding: "0 0 0 18px",
      fontSize: "12px",
      color: "var(--text-normal,#374151)",
    });
    for (const text of inboxItems) {
      const li = document.createElement("li");
      applyStyles(li, { marginBottom: "3px", lineHeight: "1.5" });
      li.textContent = text;
      inboxList.appendChild(li);
    }
    inboxSection.appendChild(inboxList);
  }

  const triageBtn = document.createElement("button");
  triageBtn.textContent = "Copy triage command";
  applyStyles(triageBtn, {
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(107,114,128,0.4)",
    background: "rgba(107,114,128,0.08)",
    color: "#374151",
    cursor: "pointer",
    marginBottom: "20px",
  });
  triageBtn.addEventListener("click", () => {
    navigator.clipboard.writeText("/triage-inbox");
    new Notice("Copied — paste in Claude Code");
  });
  inboxSection.appendChild(triageBtn);

  // ─── Section 8: Write primitives & field-token helpers ──────────────────

  // today() → ISO date string
  function todayISO() {
    return dv.luxon.DateTime.now().toFormat("yyyy-LL-dd");
  }

  // appendLine: append a single line of text to a vault file.
  // Resolves the file by path, normalizes trailing whitespace, adds exactly
  // one trailing newline so consecutive appends each land on their own line.
  // Uses app.vault.process (atomic) with read+modify as a fallback (older API).
  async function appendLine(path, text) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) { new Notice("appendLine: file not found: " + path); return; }
    const appender = (content) => {
      // Normalize: strip trailing blank lines, ensure one trailing newline.
      const trimmed = content.replace(/\n+$/, "");
      return trimmed + "\n" + text + "\n";
    };
    if (app.vault.process) {
      await app.vault.process(file, appender);
    } else {
      const c = await app.vault.read(file);
      await app.vault.modify(file, appender(c));
    }
  }

  // resolveInboxFile: vault-root-agnostic lookup for the live inbox.md.
  // Selection rules (in priority order):
  //   1. basename must be exactly "inbox.md"
  //   2. path must NOT contain a "templates/" segment (case-insensitive)
  //   3. among qualifying files, prefer: (a) path ending "tasks/inbox.md";
  //      (b) path containing "tasks/"; (c) any other inbox.md
  // If only a templates/inbox.md exists, returns null so the caller Notices.
  function resolveInboxFile() {
    const files = app.vault.getFiles();
    // candidates: inbox.md files that are NOT under any templates/ directory
    const candidates = files.filter(f => {
      if (f.name !== "inbox.md") return false;
      const p = f.path.toLowerCase();
      // exclude paths like "tasks/templates/inbox.md" or "templates/inbox.md"
      return !/(^|\/|\\)templates(\/|\\)/i.test(p);
    });
    if (candidates.length === 0) return null;
    // (a) exact suffix tasks/inbox.md
    const exactMatch = candidates.find(f => f.path.toLowerCase().endsWith("tasks/inbox.md"));
    if (exactMatch) return exactMatch;
    // (b) path contains tasks/
    const tasksMatch = candidates.find(f => f.path.toLowerCase().includes("tasks/"));
    if (tasksMatch) return tasksMatch;
    // (c) any remaining inbox.md
    return candidates[0];
  }

  // setField(line, key, value): replace existing key:token or append  key:value
  function setField(line, key, value) {
    const pattern = new RegExp("\\b" + key + ":\\S+");
    if (pattern.test(line)) {
      return line.replace(pattern, key + ":" + value);
    }
    return line + "  " + key + ":" + value;
  }

  // unsetField(line, key): remove   key:token (double-space-prefixed token)
  function unsetField(line, key) {
    // Remove double-space-prefixed token
    let result = line.replace(new RegExp("  " + key + ":\\S+", "g"), "");
    // Also handle single-space or start-of-token variants for robustness
    result = result.replace(new RegExp("\\b" + key + ":\\S+\\s*", "g"), "").trimEnd();
    // Collapse any resulting doubled spaces
    result = result.replace(/  +/g, "  ").trimEnd();
    return result;
  }

  // setCheckbox(line, mark): replace the leading checkbox mark (" ", "x", "-")
  function setCheckbox(line, mark) {
    return line.replace(/^(\s*- \[)[^\]](])/, "$1" + mark + "$2");
  }

  // rewriteLine: atomically rewrite one task line via transform function.
  // path: vault-relative path, lineNo: 0-based line index,
  // expectedTitleSnippet: first ~25 chars of the task title (used to detect line drift),
  // transformFn(curLine) → newLine|null
  async function rewriteLine(path, lineNo, expectedTitleSnippet, transformFn) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) { new Notice("Dashboard: file not found: " + path); return; }
    const writer = (content) => {
      const lines = content.split("\n");
      const cur = lines[lineNo];
      if (cur === undefined || !/^\s*- \[[ xX\-]\]/.test(cur)) {
        new Notice("Dashboard: line drifted, skipped (reopen dashboard)");
        return content;  // abort: don't touch a non-task line
      }
      // Title-drift guard: verify the line still contains the expected task text.
      // Uses the first 25 chars of the title (regex-escaped) as a fingerprint.
      if (expectedTitleSnippet && expectedTitleSnippet.length > 0) {
        const snippet = expectedTitleSnippet.slice(0, 25);
        const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(escaped).test(cur)) {
          new Notice("Dashboard: line drifted (title mismatch), skipped — reopen dashboard");
          return content;  // abort: neighboring task line, not the intended one
        }
      }
      const next = transformFn(cur);
      if (next == null) return content;  // transform chose to abort
      lines[lineNo] = next;
      return lines.join("\n");
    };
    if (app.vault.process) {
      await app.vault.process(file, writer);
    } else {
      const c = await app.vault.read(file);
      await app.vault.modify(file, writer(c));
    }
  }

  // ─── renumberGroup: dense order:N rewrite ───────────────────────────────
  // Assigns order:1, 2, 3, … to every record in groupRecords (in the new
  // visual sequence) by rewriting the order: token in each source line.
  // Semantics:
  //   • Rank-scoped: only records within the same prio rank are ever passed here.
  //   • Dense: numbering starts at 1 with no gaps.
  //   • Missing order (null) sorts as Infinity in compareTasks, i.e. after all
  //     explicitly ordered siblings.
  //   • Sequential writes (no Promise.all): concurrent app.vault.process calls
  //     on the same file can race; we serialize to avoid corruption.
  //   • One rebuildView() after the full loop.
  async function renumberGroup(groupRecords) {
    for (let i = 0; i < groupRecords.length; i++) {
      const r = groupRecords[i];
      await rewriteLine(r.path, r.line, r.title,
        (line) => setField(line, "order", String(i + 1)));
    }
    rebuildView();
  }

  // ─── Section 9: Resolve handler (Capability 1) ───────────────────────────
  // resolution: "done" | "wontfix"
  // Mirrors /clear-tasks semantics exactly.

  async function resolveTask(r, resolution) {
    const label = resolution === "done" ? "Done" : "Won't Fix";
    if (!confirm(`Mark "${r.title}" as ${label}?`)) return false;

    await rewriteLine(r.path, r.line, r.title, (line) => {
      let l = unsetField(line, "status");
      if (resolution === "done" && r.recurs) {
        // Recurring + DONE: bump last:, keep [ ], no resolution/resolved tags
        return setField(l, "last", todayISO());
      } else if (resolution === "done") {
        // Non-recurring DONE
        l = setCheckbox(l, "x");
        l = setField(l, "resolution", "done");
        l = setField(l, "resolved", todayISO());
        return l;
      } else {
        // WON'T FIX (recurring or not)
        l = setCheckbox(l, "-");
        l = setField(l, "resolution", "wontfix");
        l = setField(l, "resolved", todayISO());
        return l;
      }
    });
    return true;
  }

  async function toggleBlocked(r) {
    await rewriteLine(r.path, r.line, r.title, (line) =>
      r.blocked ? unsetField(line, "blocked") : setField(line, "blocked", "true"));
  }

  // ─── Section 10: Shared button/control style helpers ─────────────────────

  const btnBase = {
    fontSize: "11px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "5px",
    border: "1px solid",
    cursor: "pointer",
    lineHeight: "1.5",
    whiteSpace: "nowrap",
  };

  function applyStyles(el, styles) {
    Object.assign(el.style, styles);
  }

  function makeBtn(text, bg, textColor, borderColor, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    applyStyles(btn, Object.assign({}, btnBase, {
      background: bg,
      color: textColor,
      borderColor: borderColor,
    }));
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ─── clusterByProject ────────────────────────────────────────────────────
  // Input: records already in comparator order (a column's array).
  // Output: { flat: [...records in clustered order], groups: [{ project, start, count }] }
  // Group key: r.project || null. Group order = first appearance while scanning
  // (comparator order => best-ranked member positions the group). Within-group
  // order preserved. No-project records collect into a single TRAILING bucket.
  function clusterByProject(records) {
    const order = [];
    const buckets = new Map();
    const NOPROJ = Symbol("noproject");
    for (const r of records) {
      const key = r.project ? r.project : NOPROJ;
      if (!buckets.has(key)) { buckets.set(key, []); if (key !== NOPROJ) order.push(key); }
      buckets.get(key).push(r);
    }
    const flat = [];
    const groups = [];
    for (const key of order) {
      const arr = buckets.get(key);
      groups.push({ project: key, start: flat.length, count: arr.length });
      for (const r of arr) flat.push(r);
    }
    if (buckets.has(NOPROJ)) {
      const arr = buckets.get(NOPROJ);
      groups.push({ project: null, start: flat.length, count: arr.length });
      for (const r of arr) flat.push(r);
    }
    return { flat, groups };
  }

  // ─── Section 11: Board — grouped by priority tier ────────────────────────
  // One column per priority that has ≥1 task, in rank order, with an
  // "Unprioritized" trailing column for rank-99 tasks.

  const prioTierOrder = ["fulltime","parttime","side","trust","long","short","tedious"];

  // Group records into columns.
  const columnMap = {};
  for (const r of sorted) {
    const key = (r.prio && rankMap[r.prio]) ? r.prio : "_unknown";
    if (!columnMap[key]) columnMap[key] = [];
    columnMap[key].push(r);
  }

  // Column header colors + labels.
  const colHeaderColor = Object.assign({}, prioColors);
  colHeaderColor._unknown = prioColors._unknown;

  // Module-scope drag payload for Board reorder (separate from Status Board _dragPayload).
  let _reorderPayload = null;

  // Build a board card as a DOM element (needed for interactive controls).
  function buildCardEl(r) {
    const dc = domainColors[r.domain] || prioColors._unknown;
    const displayDomain = r.domain ? (r.domain.charAt(0).toUpperCase() + r.domain.slice(1)) : "—";
    const effortLabel = r.effort || "—";

    // Card wrapper — draggable for within-column reorder
    const card = document.createElement("div");
    applyStyles(card, {
      background: "var(--background-primary,#fff)",
      border: "1px solid rgba(107,114,128,0.25)",
      borderRadius: "8px",
      padding: "10px 12px",
      marginBottom: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      cursor: "grab",
      position: "relative",
    });
    card.draggable = true;
    card.dataset.prio = r.prio || "_unknown";

    card.addEventListener("dragstart", (e) => {
      _reorderPayload = { r };
      card.style.opacity = "0.5";
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.style.opacity = "1";
      card.style.borderTop = "";
      card.style.borderBottom = "";
      _reorderPayload = null;
    });
    // Card-level dragover: show insertion indicator above/below this card
    card.addEventListener("dragover", (e) => {
      if (!_reorderPayload) return;
      const src = _reorderPayload.r;
      // Reject cross-column drags
      const srcPrio = src.prio || "_unknown";
      const tgtPrio = card.dataset.prio;
      if (srcPrio !== tgtPrio) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const isBefore = e.clientY < mid;
      card.style.borderTop = isBefore ? "2px solid rgba(37,99,235,0.7)" : "";
      card.style.borderBottom = isBefore ? "" : "2px solid rgba(37,99,235,0.7)";
      card.dataset.dropPosition = isBefore ? "before" : "after";
    });
    card.addEventListener("dragleave", () => {
      card.style.borderTop = "";
      card.style.borderBottom = "";
      delete card.dataset.dropPosition;
    });

    // Title
    const titleEl = document.createElement("div");
    applyStyles(titleEl, {
      fontSize: "13px",
      fontWeight: "500",
      marginBottom: "6px",
      lineHeight: "1.4",
      wordBreak: "break-word",
    });
    titleEl.textContent = r.title;
    card.appendChild(titleEl);

    // Meta row: domain pill + due badge + effort + context
    const metaRow = document.createElement("div");
    applyStyles(metaRow, {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "4px",
      marginBottom: "8px",
    });
    metaRow.innerHTML =
      pill(displayDomain, dc) +
      dueBadge(r) +
      `<span style="font-size:11px;color:#9ca3af;padding:1px 5px;">${esc(effortLabel)}</span>` +
      (r.context ? `<span style="font-size:10px;color:#9ca3af;margin-left:4px;">${esc(r.context)}</span>` : "") +
      (r.project ? pill(r.project, { bg: "rgba(107,114,128,0.1)", text: "#6b7280", border: "rgba(107,114,128,0.3)" }) : "");
    const _sched = scheduledTitles.get((r.title || "").toLowerCase().trim());
    if (_sched) {
      metaRow.innerHTML += pill("📅 " + _sched,
        { bg: "rgba(37,99,235,0.15)", text: "#2563eb", border: "rgba(37,99,235,0.5)" });
    }
    metaRow.innerHTML += blockedBadge(r);
    card.appendChild(metaRow);

    // Controls row: Move ▸ select + Done button + Won't Fix button
    const ctrlRow = document.createElement("div");
    applyStyles(ctrlRow, {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "5px",
      marginTop: "2px",
    });

    // Capability 3: Move ▸ reprioritize select
    const moveLabel = document.createElement("span");
    applyStyles(moveLabel, { fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap" });
    moveLabel.textContent = "Move ▸";
    ctrlRow.appendChild(moveLabel);

    const moveSelect = document.createElement("select");
    applyStyles(moveSelect, {
      fontSize: "11px",
      padding: "1px 4px",
      borderRadius: "4px",
      border: "1px solid rgba(107,114,128,0.4)",
      background: "var(--background-primary,#fff)",
      color: "var(--text-normal,#374151)",
      cursor: "pointer",
    });
    for (const tier of prioTierOrder) {
      const opt = document.createElement("option");
      opt.value = tier;
      opt.textContent = prioLabels[tier] || tier;
      if (tier === r.prio) opt.selected = true;
      moveSelect.appendChild(opt);
    }
    moveSelect.addEventListener("change", async (e) => {
      const chosen = e.target.value;
      if (chosen === r.prio) return;
      await rewriteLine(r.path, r.line, r.title, (line) => setField(line, "prio", chosen));
    });
    ctrlRow.appendChild(moveSelect);

    // Capability 1: Resolve buttons
    const doneBtn = makeBtn(
      "✓ Done",
      "rgba(22,163,74,0.1)", "#16a34a", "rgba(22,163,74,0.5)",
      () => resolveTask(r, "done")
    );
    ctrlRow.appendChild(doneBtn);

    const wontBtn = makeBtn(
      "✗ Won't fix",
      "rgba(107,114,128,0.08)", "#6b7280", "rgba(107,114,128,0.4)",
      () => resolveTask(r, "wontfix")
    );
    ctrlRow.appendChild(wontBtn);

    const blockBtn = makeBtn(
      r.blocked ? "🚫 Unblock" : "🚫 Block",
      "rgba(220,38,38,0.1)", "#dc2626", "rgba(220,38,38,0.5)",
      () => toggleBlocked(r)
    );
    ctrlRow.appendChild(blockBtn);

    card.appendChild(ctrlRow);
    return card;
  }

  // Build board header section
  const boardSection = dv.el("div", "");
  const boardHeaderEl = document.createElement("div");
  applyStyles(boardHeaderEl, {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "12px",
    paddingBottom: "4px",
    borderBottom: "2px solid rgba(107,114,128,0.2)",
  });
  boardHeaderEl.textContent = "Board · grouped by Priority";
  boardSection.appendChild(boardHeaderEl);

  const boardRow = document.createElement("div");
  applyStyles(boardRow, {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "24px",
  });

  for (const key of [...prioTierOrder, "_unknown"]) {
    const tasks = columnMap[key];
    if (!tasks || tasks.length === 0) continue;

    const colColor = colHeaderColor[key] || prioColors._unknown;
    const colLabel = key === "_unknown" ? "Unprioritized" : (prioLabels[key] || key);
    const count = tasks.length;

    const col = document.createElement("div");
    applyStyles(col, {
      minWidth: "220px",
      maxWidth: "280px",
      flex: "1 1 220px",
      background: "rgba(107,114,128,0.04)",
      border: "1px solid rgba(107,114,128,0.15)",
      borderRadius: "10px",
      padding: "10px 10px 4px",
      display: "flex",
      flexDirection: "column",
    });

    // Column header
    const colHeader = document.createElement("div");
    applyStyles(colHeader, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "10px",
      paddingBottom: "6px",
      borderBottom: `2px solid ${colColor.border}`,
    });

    const colTitleSpan = document.createElement("span");
    applyStyles(colTitleSpan, {
      fontSize: "12px",
      fontWeight: "700",
      color: colColor.text,
      textTransform: "uppercase",
      letterSpacing: ".04em",
    });
    colTitleSpan.textContent = colLabel;
    colHeader.appendChild(colTitleSpan);

    const colBadge = document.createElement("span");
    applyStyles(colBadge, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      borderRadius: "9999px",
      background: colColor.bg,
      color: colColor.text,
      fontSize: "11px",
      fontWeight: "700",
      border: `1px solid ${colColor.border}`,
    });
    colBadge.textContent = String(count);
    colHeader.appendChild(colBadge);

    col.appendChild(colHeader);

    // Cluster cards by project; sub-headers are flat siblings of cards (no wrapper divs)
    // so the drop handler's col.children filter on dataset.prio still works correctly.
    const { flat, groups } = clusterByProject(tasks);
    const showSubHeaders = !(groups.length === 1 && groups[0].project === null);
    for (const grp of groups) {
      if (showSubHeaders) {
        const subHdr = document.createElement("div");
        applyStyles(subHdr, {
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: ".03em",
          color: "#6b7280",
          marginTop: "6px",
          marginBottom: "4px",
          paddingBottom: "3px",
          borderBottom: "1px solid rgba(107,114,128,0.2)",
        });
        subHdr.textContent = grp.project ? grp.project : "(no project)";
        col.appendChild(subHdr);
      }
      for (let i = grp.start; i < grp.start + grp.count; i++) {
        col.appendChild(buildCardEl(flat[i]));
      }
    }

    // Column-level dragover/dragleave/drop for Board reorder.
    // Drop is only valid within the same prio column.
    col.addEventListener("dragover", (e) => {
      if (!_reorderPayload) return;
      const srcPrio = _reorderPayload.r.prio || "_unknown";
      if (srcPrio !== key) return;  // cross-column: reject
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      col.style.background = "rgba(37,99,235,0.04)";
    });
    col.addEventListener("dragleave", (e) => {
      // Only reset if leaving the column (not entering a child card)
      if (!col.contains(e.relatedTarget)) {
        col.style.background = "rgba(107,114,128,0.04)";
      }
    });
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.style.background = "rgba(107,114,128,0.04)";
      if (!_reorderPayload) return;
      const { r: srcRecord } = _reorderPayload;
      _reorderPayload = null;

      // Reject cross-column drops
      if ((srcRecord.prio || "_unknown") !== key) return;

      // Find which card the pointer was over when drop fired
      // and compute the new sequence from the column's current card list.
      const allCardEls = Array.from(col.children).filter(el => el.dataset && el.dataset.prio);
      // Determine drop index based on dropPosition markers left by card dragover
      let dropIdx = allCardEls.length;  // default: end of column
      for (let i = 0; i < allCardEls.length; i++) {
        const pos = allCardEls[i].dataset.dropPosition;
        if (pos === "before") { dropIdx = i; break; }
        if (pos === "after")  { dropIdx = i + 1; break; }
      }
      // Clear all dropPosition markers
      for (const el of allCardEls) { delete el.dataset.dropPosition; el.style.borderTop = ""; el.style.borderBottom = ""; }

      // dropIdx is a position in the rendered (clustered) card list, so colRecords must
      // be the same flat clustered array; cross-project drops renumber but snap back into
      // their own project group on rebuild (clustering wins for display; order persists
      // within a group).
      const colRecords = flat.slice(); // use the same clustered sequence as the DOM
      const srcIdx = colRecords.findIndex(r2 => r2.path === srcRecord.path && r2.line === srcRecord.line);
      if (srcIdx === -1) return;
      // Remove src from current position
      colRecords.splice(srcIdx, 1);
      // Clamp dropIdx after removal
      const insertAt = dropIdx > srcIdx ? dropIdx - 1 : dropIdx;
      colRecords.splice(Math.min(insertAt, colRecords.length), 0, srcRecord);

      await renumberGroup(colRecords);
    });

    boardRow.appendChild(col);
  }

  boardSection.appendChild(boardRow);

  // ─── Section 12: Table — grouped by domain ───────────────────────────────
  // Each domain is a collapsible <details> group; rows sorted by comparator.
  // Rows include inline editors for Capability 2.

  const tableSection = dv.el("div", "");
  const tableHeaderEl = document.createElement("div");
  applyStyles(tableHeaderEl, {
    fontSize: "15px",
    fontWeight: "700",
    marginBottom: "12px",
    paddingBottom: "4px",
    borderBottom: "2px solid rgba(107,114,128,0.2)",
  });
  tableHeaderEl.textContent = "All tasks · grouped by Domain";
  tableSection.appendChild(tableHeaderEl);

  // Module-scope drag payload for Table reorder.
  let _tableReorderPayload = null;

  // Build a table row as a DOM element (needed for interactive editors).
  function buildTableRowEl(r) {
    const pc = prioColors[r.prio] || prioColors._unknown;

    const tr = document.createElement("tr");
    applyStyles(tr, { borderBottom: "1px solid rgba(107,114,128,0.12)" });

    // ── Drag handle cell ──
    const dragHandleCel = document.createElement("td");
    applyStyles(dragHandleCel, {
      padding: "4px 6px",
      color: "#9ca3af",
      fontSize: "12px",
      cursor: "grab",
      userSelect: "none",
      whiteSpace: "nowrap",
    });
    dragHandleCel.textContent = "⠿";
    dragHandleCel.title = "Drag to reorder within same priority and domain";
    tr.appendChild(dragHandleCel);

    // Row drag: only valid within the same domain and same rank run
    tr.draggable = true;
    tr.dataset.domain = r.domain;
    tr.dataset.rank = String(r.rank);
    tr.addEventListener("dragstart", (e) => {
      _tableReorderPayload = { r };
      tr.style.opacity = "0.5";
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    tr.addEventListener("dragend", () => {
      tr.style.opacity = "1";
      tr.style.outline = "";
      _tableReorderPayload = null;
    });
    tr.addEventListener("dragover", (e) => {
      if (!_tableReorderPayload) return;
      const src = _tableReorderPayload.r;
      // Reject if different domain or different rank
      if (src.domain !== r.domain || src.rank !== r.rank) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const rect = tr.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      tr.style.outline = "2px solid rgba(37,99,235,0.7)";
      tr.dataset.dropPosition = e.clientY < mid ? "before" : "after";
    });
    tr.addEventListener("dragleave", () => {
      tr.style.outline = "";
      delete tr.dataset.dropPosition;
    });

    // ── Priority cell: select for inline reprioritize ──
    const prioCel = document.createElement("td");
    applyStyles(prioCel, { padding: "4px 8px", whiteSpace: "nowrap" });

    const prioSelect = document.createElement("select");
    applyStyles(prioSelect, {
      fontSize: "11px",
      fontWeight: "600",
      padding: "2px 5px",
      borderRadius: "9999px",
      border: `1px solid ${pc.border}`,
      background: pc.bg,
      color: pc.text,
      cursor: "pointer",
    });
    for (const tier of prioTierOrder) {
      const opt = document.createElement("option");
      opt.value = tier;
      opt.textContent = prioLabels[tier] || tier;
      if (tier === r.prio) opt.selected = true;
      prioSelect.appendChild(opt);
    }
    prioSelect.addEventListener("change", async (e) => {
      const chosen = e.target.value;
      if (chosen === r.prio) return;
      await rewriteLine(r.path, r.line, r.title, (line) => setField(line, "prio", chosen));
    });
    prioCel.appendChild(prioSelect);
    tr.appendChild(prioCel);

    // ── Task title cell ──
    const titleCel = document.createElement("td");
    applyStyles(titleCel, { padding: "4px 8px", fontSize: "13px" });
    const titleText = document.createElement("span");
    titleText.textContent = r.title;
    titleCel.appendChild(titleText);
    if (r.blocked) {
      const blockedSpan = document.createElement("span");
      blockedSpan.style.marginLeft = "6px";
      blockedSpan.innerHTML = blockedBadge(r);
      titleCel.appendChild(blockedSpan);
    }
    tr.appendChild(titleCel);

    // ── Project cell (read-only pill) ──
    const projectCel = document.createElement("td");
    applyStyles(projectCel, { padding: "4px 8px" });
    projectCel.innerHTML = r.project
      ? pill(r.project, { bg: "rgba(107,114,128,0.1)", text: "#6b7280", border: "rgba(107,114,128,0.3)" })
      : `<span style="color:#9ca3af;font-size:11px;">—</span>`;
    tr.appendChild(projectCel);

    // ── Due cell: date input ──
    const dueCel = document.createElement("td");
    applyStyles(dueCel, { padding: "4px 8px", whiteSpace: "nowrap" });

    const dueInput = document.createElement("input");
    dueInput.type = "date";
    dueInput.value = r.due || "";
    applyStyles(dueInput, {
      fontSize: "11px",
      padding: "2px 4px",
      borderRadius: "5px",
      border: "1px solid rgba(107,114,128,0.4)",
      background: "var(--background-primary,#fff)",
      color: "var(--text-normal,#374151)",
      cursor: "pointer",
      width: "120px",
    });
    dueInput.addEventListener("change", async (e) => {
      const val = e.target.value;
      if (val) {
        await rewriteLine(r.path, r.line, r.title, (line) => setField(line, "due", val));
      } else {
        await rewriteLine(r.path, r.line, r.title, (line) => unsetField(line, "due"));
      }
    });
    dueCel.appendChild(dueInput);
    tr.appendChild(dueCel);

    // ── Effort cell: text input ──
    const effortCel = document.createElement("td");
    applyStyles(effortCel, { padding: "4px 8px", whiteSpace: "nowrap" });

    const effortInput = document.createElement("input");
    effortInput.type = "text";
    effortInput.value = r.effort || "";
    effortInput.placeholder = "1h/30m";
    applyStyles(effortInput, {
      fontSize: "11px",
      padding: "2px 4px",
      borderRadius: "5px",
      border: "1px solid rgba(107,114,128,0.4)",
      background: "var(--background-primary,#fff)",
      color: "var(--text-normal,#374151)",
      width: "60px",
    });
    effortInput.addEventListener("change", async (e) => {
      const val = e.target.value.trim();
      if (!val) {
        await rewriteLine(r.path, r.line, r.title, (line) => unsetField(line, "effort"));
        return;
      }
      if (!/^\d+(\.\d+)?[hm]$/i.test(val)) {
        new Notice("Dashboard: invalid effort format \"" + val + "\" — use e.g. 1h or 30m");
        e.target.value = r.effort || "";
        return;
      }
      await rewriteLine(r.path, r.line, r.title, (line) => setField(line, "effort", val));
    });
    effortCel.appendChild(effortInput);
    tr.appendChild(effortCel);

    // ── Context cell: text input ──
    const contextCel = document.createElement("td");
    applyStyles(contextCel, { padding: "4px 8px", whiteSpace: "nowrap" });

    const contextInput = document.createElement("input");
    contextInput.type = "text";
    contextInput.value = r.context || "";
    contextInput.placeholder = "context";
    applyStyles(contextInput, {
      fontSize: "11px",
      padding: "2px 4px",
      borderRadius: "5px",
      border: "1px solid rgba(107,114,128,0.4)",
      background: "var(--background-primary,#fff)",
      color: "var(--text-normal,#374151)",
      width: "80px",
    });
    contextInput.addEventListener("change", async (e) => {
      const raw = e.target.value.trim().toLowerCase().replace(/\s+/g, "");
      if (!raw) {
        await rewriteLine(r.path, r.line, r.title, (line) => unsetField(line, "context"));
      } else {
        await rewriteLine(r.path, r.line, r.title, (line) => setField(line, "context", raw));
      }
    });
    contextCel.appendChild(contextInput);
    tr.appendChild(contextCel);

    // ── Resolve cell: Done + Won't Fix buttons ──
    const resolveCel = document.createElement("td");
    applyStyles(resolveCel, { padding: "4px 8px", whiteSpace: "nowrap" });

    const doneBtn = makeBtn(
      "✓",
      "rgba(22,163,74,0.1)", "#16a34a", "rgba(22,163,74,0.5)",
      () => resolveTask(r, "done")
    );
    doneBtn.title = "Mark Done";
    resolveCel.appendChild(doneBtn);

    const spacer = document.createElement("span");
    spacer.style.display = "inline-block";
    spacer.style.width = "4px";
    resolveCel.appendChild(spacer);

    const wontBtn = makeBtn(
      "✗",
      "rgba(107,114,128,0.08)", "#6b7280", "rgba(107,114,128,0.4)",
      () => resolveTask(r, "wontfix")
    );
    wontBtn.title = "Won't Fix";
    resolveCel.appendChild(wontBtn);

    const blockSpacer = document.createElement("span");
    blockSpacer.style.display = "inline-block";
    blockSpacer.style.width = "4px";
    resolveCel.appendChild(blockSpacer);

    const blockToggleBtn = makeBtn(
      "🚫",
      "rgba(220,38,38,0.1)", "#dc2626", "rgba(220,38,38,0.5)",
      () => toggleBlocked(r)
    );
    blockToggleBtn.title = r.blocked ? "Unblock" : "Mark Blocked";
    resolveCel.appendChild(blockToggleBtn);

    tr.appendChild(resolveCel);

    return tr;
  }

  const tableHeaderRowHtml =
    `<tr style="border-bottom:2px solid rgba(107,114,128,0.25);">` +
      `<th style="padding:6px 4px;width:18px;"></th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;white-space:nowrap;">Priority</th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;text-align:left;">Task</th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;white-space:nowrap;">Project</th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;white-space:nowrap;">Due</th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;white-space:nowrap;">Effort</th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;white-space:nowrap;">Context</th>` +
      `<th style="padding:6px 8px;font-size:11px;text-transform:uppercase;` +
        `letter-spacing:.05em;color:#9ca3af;font-weight:600;white-space:nowrap;">Actions</th>` +
    `</tr>`;

  for (const domain of domainOrder) {
    const domainTasks = sorted.filter(r => r.domain === domain);
    if (domainTasks.length === 0) continue;

    const dc = domainColors[domain] || prioColors._unknown;
    const displayDomain = domain.charAt(0).toUpperCase() + domain.slice(1);

    const details = document.createElement("details");
    details.open = true;
    applyStyles(details, { marginBottom: "12px" });

    const summary = document.createElement("summary");
    applyStyles(summary, {
      cursor: "pointer",
      listStyle: "none",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 10px",
      borderRadius: "8px",
      background: dc.bg,
      border: `1px solid ${dc.border}`,
      fontSize: "13px",
      fontWeight: "700",
      color: dc.text,
      userSelect: "none",
      marginBottom: "4px",
    });
    summary.innerHTML =
      `▸ ${esc(displayDomain)}` +
      `<span style="margin-left:6px;font-size:11px;font-weight:500;` +
        `background:${dc.border};color:#fff;` +
        `border-radius:9999px;padding:1px 7px;">${domainTasks.length}</span>`;
    details.appendChild(summary);

    const tableWrapper = document.createElement("div");
    applyStyles(tableWrapper, { overflowX: "auto" });

    const table = document.createElement("table");
    applyStyles(table, { width: "100%", borderCollapse: "collapse", fontSize: "13px" });

    const thead = document.createElement("thead");
    thead.innerHTML = tableHeaderRowHtml;
    table.appendChild(thead);

    // Cluster the domain's tasks by project; render sub-header rows interleaved
    // with data rows so the visual order matches the clustered flat array.
    const { flat: domainFlat, groups: domainGroups } = clusterByProject(domainTasks);
    const showTableSubHdrs = !(domainGroups.length === 1 && domainGroups[0].project === null);
    // colspan = 8: drag-handle + Priority + Task + Project + Due + Effort + Context + Actions
    const TABLE_COLSPAN = 8;

    const tbody = document.createElement("tbody");
    for (const grp of domainGroups) {
      if (showTableSubHdrs) {
        const subHdrTr = document.createElement("tr");
        const subHdrTd = document.createElement("td");
        subHdrTd.colSpan = TABLE_COLSPAN;
        applyStyles(subHdrTd, {
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: ".03em",
          color: "#6b7280",
          padding: "8px 8px 3px",
          borderBottom: "1px solid rgba(107,114,128,0.2)",
        });
        subHdrTd.textContent = grp.project ? grp.project : "(no project)";
        subHdrTr.appendChild(subHdrTd);
        tbody.appendChild(subHdrTr);
      }
      for (let i = grp.start; i < grp.start + grp.count; i++) {
        tbody.appendChild(buildTableRowEl(domainFlat[i]));
      }
    }

    // tbody drop handler: reorder within same domain AND same rank run.
    // Same-rank sequence is derived from domainFlat (clustered order) so that
    // renumbered order:N values follow the visual top-to-bottom clustered order.
    // Sub-header <tr>s have no dataset.rank so they are skipped by all rank-keyed filters.
    tbody.addEventListener("dragover", (e) => {
      if (!_tableReorderPayload) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    });
    tbody.addEventListener("drop", async (e) => {
      e.preventDefault();
      if (!_tableReorderPayload) return;
      const { r: srcRecord } = _tableReorderPayload;
      _tableReorderPayload = null;

      // Reject cross-domain drops
      if (srcRecord.domain !== domain) return;

      // Find the target row and its dropPosition marker
      const allRowEls = Array.from(tbody.children);
      let dropIdx = allRowEls.length;
      for (let i = 0; i < allRowEls.length; i++) {
        const pos = allRowEls[i].dataset.dropPosition;
        if (pos === "before") { dropIdx = i; break; }
        if (pos === "after")  { dropIdx = i + 1; break; }
      }
      for (const el of allRowEls) { delete el.dataset.dropPosition; el.style.outline = ""; }

      // Same-rank records in clustered visual order (sub-header rows skipped
      // because they have no dataset.rank).
      // domainFlat is the flat clustered order; filter to same rank preserves
      // that visual top-to-bottom sequence across project groups.
      const sameRankRecords = domainFlat.filter(r => r.rank === srcRecord.rank);
      // Cross-rank drop: reject
      const allSameRankPaths = new Set(sameRankRecords.map(r2 => r2.path + ":" + r2.line));
      const srcKey = srcRecord.path + ":" + srcRecord.line;
      if (!allSameRankPaths.has(srcKey)) return;

      // Compute the insertion index within the same-rank run.
      // allRowEls now contains both data rows and sub-header rows.
      // sameRankEls filters to data rows of the correct rank; sub-headers are skipped.
      const sameRankEls = allRowEls.filter(el =>
        el.dataset && el.dataset.rank === String(srcRecord.rank));
      let rankDropIdx = sameRankEls.length;
      for (let i = 0; i < sameRankEls.length; i++) {
        const domainIdx = allRowEls.indexOf(sameRankEls[i]);
        if (domainIdx >= dropIdx) { rankDropIdx = i; break; }
      }

      const srcRankIdx = sameRankRecords.findIndex(
        r2 => r2.path === srcRecord.path && r2.line === srcRecord.line);
      if (srcRankIdx === -1) return;

      const newSeq = sameRankRecords.slice();
      newSeq.splice(srcRankIdx, 1);
      const insertAt = rankDropIdx > srcRankIdx ? rankDropIdx - 1 : rankDropIdx;
      newSeq.splice(Math.min(insertAt, newSeq.length), 0, srcRecord);

      await renumberGroup(newSeq);
    });

    table.appendChild(tbody);

    tableWrapper.appendChild(table);
    details.appendChild(tableWrapper);
    tableSection.appendChild(details);
  }

  // ── Midnight rollover: keep the dashboard's date in sync with the wall clock ──
  // Forces a full re-render (recomputing today/overdue/due-soon + the Today/Tomorrow
  // plan panels) at the next local midnight, and again whenever the window regains
  // focus on a new calendar day (covers the machine sleeping across midnight).
  try {
    const ggtdRebuild = () => {
      try { app?.commands?.executeCommandById?.("dataview:dataview-rebuild-current-view"); } catch (_) {}
    };
    // (1) one-shot timer to ~2s after the next local midnight; the rebuild re-runs
    //     this block, which re-arms the next day's timer.
    if (typeof setTimeout === "function" && dv.container) {
      const msToMidnight = Math.max(
        today.plus({ days: 1 }).toMillis() - DateTime.now().toMillis() + 2000,
        1000
      );
      dv.container.__ggtdMidnightTimer = setTimeout(ggtdRebuild, msToMidnight);
    }
    // (2) focus/visibility re-check: rebuild only if the day actually changed since
    //     this render (cheap; avoids needless rebuilds on every focus).
    if (dv.container && typeof document !== "undefined") {
      const renderedDayMs = todayMs;
      const ggtdDayWatch = () => {
        try {
          if (document.visibilityState && document.visibilityState !== "visible") return;
          if (DateTime.now().startOf("day").toMillis() !== renderedDayMs) ggtdRebuild();
        } catch (_) {}
      };
      dv.container.__ggtdDayWatch = ggtdDayWatch;
      document.addEventListener("visibilitychange", ggtdDayWatch);
      window.addEventListener("focus", ggtdDayWatch);
    }
  } catch (_) {}

} catch (e) {
  // Graceful degradation when Dataview or luxon is not available.
  dv.paragraph(
    "**Dashboard unavailable.** " +
    "Make sure the **Dataview** community plugin is installed and enabled in Obsidian, " +
    "and that **Enable JavaScript Queries** is turned on in Dataview settings. " +
    "Error: " + e.message
  );
}
```
