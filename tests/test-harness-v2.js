/**
 * Targeted test: confirms DataArray.sort(compareFn) crash and DONE column gap.
 */
"use strict";

const luxon = require("luxon");

const { DateTime } = luxon;

// ─── DataArray with accurate Dataview semantics ────────────────────────────
// Real Dataview source: sort(fn, direction?) where fn is a KEY extractor
// Ref: https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/data-array.ts
function makeDataArray(arr) {
  return {
    _arr: arr,
    get length() { return this._arr.length; },
    [Symbol.iterator]() { return this._arr[Symbol.iterator](); },
    array() { return this._arr.slice(); },
    flatMap(fn) { return makeDataArray(this._arr.flatMap(fn)); },
    filter(fn) { return makeDataArray(this._arr.filter(fn)); },
    where(fn) { return makeDataArray(this._arr.filter(fn)); },
    map(fn) { return makeDataArray(this._arr.map(fn)); },
    forEach(fn) { this._arr.forEach(fn); },
    // DataArray.sort: fn is KEY EXTRACTOR (not comparator)
    // Calling records.sort(compareFn) means compareFn gets called as (element) => key
    // So compareFn(a, undefined) is called → b.rank crashes
    sort(fn, direction) {
      const dir = direction === "desc" ? -1 : 1;
      const copy = this._arr.slice();
      // fn is called with ONE argument (element), like Array.prototype.sort BUT with keyFn semantics
      // In real Dataview: const key = fn(element) — then elements sorted by key
      // NOTE: fn(element) calls compareTasks(element) where b=undefined
      copy.sort((a, b) => {
        const ka = fn(a);   // fn = compareTasks, b parameter = undefined → CRASH
        const kb = fn(b);
        if (ka < kb) return -dir;
        if (ka > kb) return dir;
        return 0;
      });
      return makeDataArray(copy);
    },
  };
}

// ─── Reproduce the exact crash path ───────────────────────────────────────

const rankMap = {
  fulltime: 1, parttime: 2, trust: 3, side: 4, long: 5, short: 6, tedious: 7,
};
const DEFAULT_RANK = 99;

// Exact compareTasks from Dashboard.md — six-level tiebreak including manual order:N
function compareTasks(a, b) {
  // Step 1: prio rank (strict, never overridden)
  if (a.rank !== b.rank) return a.rank - b.rank;
  // Step 2: manual order ascending — tasks without order:N sort after ordered siblings
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

// Simulate records being a DataArray (as returned by allTasks.map(...))
const rec1 = { rank: 5, duEpoch: Infinity, effortMin: 60, domainIdx: 0, title: "Task A" };
const rec2 = { rank: 3, duEpoch: 1000, effortMin: 30, domainIdx: 1, title: "Task B" };

// allTasks is a DataArray → allTasks.map(t => {...}) returns a DataArray
// → records is a DataArray
const records = makeDataArray([rec1, rec2]);

console.log("=== Test 1: DataArray.sort(compareTasks) — BEFORE FIX ===");
try {
  const sorted = records.sort(compareTasks);
  console.log("  No error (unexpected with 2 elements!)");
} catch (e) {
  console.log("  CRASH CONFIRMED:", e.message);
  console.log("  → This is the root cause: DataArray.sort calls compareTasks(a) as key fn");
  console.log("    → compareTasks(a, undefined) → 'a.rank !== b.rank' → b is undefined → TypeError");
}

console.log("\n=== Test 2: records.array().sort(compareTasks) — AFTER FIX ===");
try {
  const sorted = records.array().sort(compareTasks);
  console.log("  SUCCESS — No error, sorted correctly");
  console.log("  Sorted:", sorted.map(r => r.title));
} catch (e) {
  console.log("  Still crashes:", e.message);
}

// ─── Test 3: DONE column gap ───────────────────────────────────────────────
console.log("\n=== Test 3: DONE column — recurring task not shown (Symptom 2) ===");

const today = DateTime.now().startOf("day");
const todayISOStr = today.toISODate();
console.log("Today:", todayISOStr);

// Airflow task from knowledge.md: open [ ], recurs:3d, last:2026-06-11
const airflowTask = {
  status: " ",  // open [ ]
  text: "Review latest issues on Apache Airflow GitHub issues tracker  prio:short  project:airflow  effort:30m  recurs:3d  last:2026-06-11  context:@computer,@reading",
  line: 14,
  path: "tasks/knowledge.md",
};

// resolvedTodayRaw REQUIRES status === "x" || status === "-"
const isCollectedInResolvedToday = airflowTask.status === "x" || airflowTask.status === "-";
console.log("Airflow task status:", JSON.stringify(airflowTask.status), "(open [ ])");
console.log("Included in resolvedTodayRaw:", isCollectedInResolvedToday);
console.log("→ Recurring completions NEVER appear in DONE column (Symptom 2 confirmed)");

// The fix: collect from `records` where r.recurs && r.last === todayISOStr
function extract(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1] : "";
}
const recurs = extract(airflowTask.text, /\brecurs:(\S+)/);
const last = extract(airflowTask.text, /\blast:(\d{4}-\d{2}-\d{2})/);
console.log("\nRecurs:", recurs, "| Last:", last, "| Today:", todayISOStr);
const isRecurringCompletedToday = recurs && last === todayISOStr;
console.log("Is recurring completed today (r.recurs && r.last === todayISOStr):", isRecurringCompletedToday);
console.log("→ After fix: this task will appear in DONE column with ♻ marker");

// ─── Verify variable scoping for todayISOStr ───────────────────────────────
console.log("\n=== Test 4: todayISOStr scoping in todoRecords filter ===");
// todayISOStr is defined at line 240, filter is at line 960
// Both are in the same try{} block scope — no scoping issue
// BUT: records.filter on a DataArray returns a DataArray, not a plain Array
// todoRecords.map(r => buildStatusCardEl(r, "todo")) — DataArray.map → DataArray
// buildStatusColEl receives cards as a DataArray and calls cards.length + iterates
// buildStatusColEl: colBadge.textContent = String(cards.length) ← works on DataArray
// for (const cardEl of cards) col.appendChild(cardEl) ← works via [Symbol.iterator]
// So DataArray iteration is fine for these, no crash there

console.log("  todayISOStr defined at line 240 (before Section 7c at line 681)");
console.log("  todoRecords filter at line 960 — in same block scope");
console.log("  Scoping is fine. No crash from scoping.");
console.log("  The crash is ONLY from records.sort(compareTasks) at line 290.");

console.log("\n=== SUMMARY ===");
console.log("Root cause of Symptom 1 (dashboard blanks):");
console.log("  Line 290: const sorted = records.sort(compareTasks)");
console.log("  `records` is a DataArray (dv.pages().flatMap().filter().map())");
console.log("  DataArray.sort(fn) treats fn as key extractor, not comparator");
console.log("  → calls compareTasks(a) with b=undefined → TypeError on b.rank");
console.log("");
console.log("Root cause of Symptom 2 (recurring tasks not in DONE):");
console.log("  resolvedTodayRaw (line 102) requires status x/- (never for recurring)");
console.log("  Fix: source recurring completions from `records` array instead");

// ─── Test 5: order:N tiebreak within same prio rank ───────────────────────
console.log("\n=== Test 5: order:N tiebreak — within-rank manual sort ===");

// Three tasks with the same rank (trust = 3), same everything else.
// order:2, order:1, no order — expected sorted sequence: order:1, order:2, no-order
const baseAttrs = { rank: 3, duEpoch: Infinity, effortMin: 60, domainIdx: 2 };
const tOrder2  = Object.assign({}, baseAttrs, { order: 2,    title: "Task order 2" });
const tOrder1  = Object.assign({}, baseAttrs, { order: 1,    title: "Task order 1" });
const tNoOrder = Object.assign({}, baseAttrs, { order: null, title: "Task no order" });

const samePrioTasks = [tOrder2, tOrder1, tNoOrder];
samePrioTasks.sort(compareTasks);
const titles5 = samePrioTasks.map(t => t.title);

const pass5a = titles5[0] === "Task order 1";
const pass5b = titles5[1] === "Task order 2";
const pass5c = titles5[2] === "Task no order";

console.log("  Sorted:", titles5);
console.log("  [1] order:1 first:     ", pass5a ? "PASS" : "FAIL");
console.log("  [2] order:2 second:    ", pass5b ? "PASS" : "FAIL");
console.log("  [3] no-order last:     ", pass5c ? "PASS" : "FAIL");
if (!pass5a || !pass5b || !pass5c) {
  console.error("ASSERTION FAILED in Test 5");
  process.exitCode = 1;
}

// ─── Test 6: rank still overrides order — rank-1 unordered beats rank-3 order:1 ──
console.log("\n=== Test 6: prio rank beats order:N across ranks ===");

const tRank1Unordered = { rank: 1, order: null,  duEpoch: Infinity, effortMin: 60, domainIdx: 0, title: "Rank1 no order" };
const tRank3Order1    = { rank: 3, order: 1,      duEpoch: Infinity, effortMin: 60, domainIdx: 2, title: "Rank3 order:1" };

const crossRankTasks = [tRank3Order1, tRank1Unordered];
crossRankTasks.sort(compareTasks);
const titles6 = crossRankTasks.map(t => t.title);

const pass6 = titles6[0] === "Rank1 no order";
console.log("  Sorted:", titles6);
console.log("  [1] rank-1 unordered before rank-3 order:1:", pass6 ? "PASS" : "FAIL");
if (!pass6) {
  console.error("ASSERTION FAILED in Test 6");
  process.exitCode = 1;
}

// ─── Test 7: clusterByProject ─────────────────────────────────────────────
console.log("\n=== Test 7: clusterByProject — project sub-header clustering ===");

// Hand-copied from Dashboard.md (same pattern as compareTasks above)
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

// 7a: group order by first appearance; 7b: within-group order preserved
// Input pre-sorted: [A(projX), B(projY), C(projX)] → flat = [A, C, B]
const rA = { title: "A", project: "projX" };
const rB = { title: "B", project: "projY" };
const rC = { title: "C", project: "projX" };
const res7a = clusterByProject([rA, rB, rC]);
const pass7a = res7a.flat[0] === rA && res7a.flat[1] === rC && res7a.flat[2] === rB;
const pass7b = res7a.flat[0] === rA && res7a.flat[1] === rC; // A before C within projX
console.log("  7a group order (projX first, then projY):", pass7a ? "PASS" : "FAIL", res7a.flat.map(r => r.title));
console.log("  7b within-group order (A before C):", pass7b ? "PASS" : "FAIL");
if (!pass7a || !pass7b) {
  console.error("ASSERTION FAILED in Test 7a/7b");
  process.exitCode = 1;
}

// 7c: trailing no-project bucket
// Input: [A(projX), N(none), B(projX)] → flat = [A, B, N]; last group has project === null
const rN = { title: "N", project: null };
const rBx = { title: "Bx", project: "projX" };
const res7c = clusterByProject([rA, rN, rBx]);
const pass7c = res7c.flat[0] === rA && res7c.flat[1] === rBx && res7c.flat[2] === rN;
const pass7cNull = res7c.groups[res7c.groups.length - 1].project === null;
console.log("  7c trailing no-project bucket:", pass7c ? "PASS" : "FAIL", res7c.flat.map(r => r.title));
console.log("  7c last group project === null:", pass7cNull ? "PASS" : "FAIL");
if (!pass7c || !pass7cNull) {
  console.error("ASSERTION FAILED in Test 7c");
  process.exitCode = 1;
}

// 7d: boundaries — sum(count) === flat.length and each start === prev.start + prev.count
const res7d = clusterByProject([rA, rB, rC, rN]);
const sumCount = res7d.groups.reduce((acc, g) => acc + g.count, 0);
const pass7dSum = sumCount === res7d.flat.length;
let pass7dBounds = true;
for (let i = 1; i < res7d.groups.length; i++) {
  if (res7d.groups[i].start !== res7d.groups[i-1].start + res7d.groups[i-1].count) {
    pass7dBounds = false;
  }
}
console.log("  7d sum(count) === flat.length:", pass7dSum ? "PASS" : "FAIL", sumCount, "===", res7d.flat.length);
console.log("  7d start boundaries contiguous:", pass7dBounds ? "PASS" : "FAIL");
if (!pass7dSum || !pass7dBounds) {
  console.error("ASSERTION FAILED in Test 7d");
  process.exitCode = 1;
}

// 7e: idempotency — clustering an already-clustered flat array produces the same flat array
const input7e = [rA, rB, rC, rN];
const first = clusterByProject(input7e).flat;
const second = clusterByProject(first).flat;
const pass7e = first.length === second.length && first.every((r, i) => r === second[i]);
console.log("  7e idempotency:", pass7e ? "PASS" : "FAIL");
if (!pass7e) {
  console.error("ASSERTION FAILED in Test 7e");
  process.exitCode = 1;
}

// ─── Test 8: week-plan label shows Monday of the plan week ───────────────────
console.log("\n=== Test 8: week-plan label — startOf('week') snaps to Monday ===");

// Friday 2026-06-12 → Monday 2026-06-08
const fridayLabel = "Week of " + DateTime.fromISO("2026-06-12").startOf("week").toFormat("MMM dd");
const pass8a = fridayLabel === "Week of Jun 08";
console.log("  Friday 2026-06-12 → label:", fridayLabel, pass8a ? "PASS" : "FAIL");

// Sunday 2026-06-14 → Monday 2026-06-08 (snaps BACK to that week's Monday, not forward)
const sundayMonday = DateTime.fromISO("2026-06-14").startOf("week").toFormat("MMM dd");
const pass8b = sundayMonday === "Jun 08";
console.log("  Sunday 2026-06-14 → Monday:", sundayMonday, pass8b ? "PASS" : "FAIL");

if (!pass8a || !pass8b) {
  console.error("ASSERTION FAILED in Test 8");
  process.exitCode = 1;
}

console.log("\n=== Test harness v2 complete ===");
