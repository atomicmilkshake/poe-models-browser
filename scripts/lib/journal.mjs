import fs from "node:fs";
import path from "node:path";

/** ## HH:MM - Title */
export const ENTRY_HEADING = /^##\s+\d{1,2}:\d{2}\s+-\s+.+/gm;
export const JOURNAL_NAME = /^\d{4}-\d{2}-\d{2}\.md$/;

export function findRepoRoot(start = process.cwd()) {
  let current = path.resolve(start);
  for (;;) {
    const agents = path.join(current, "AGENTS.md");
    const journalDir = path.join(current, "docs", "journal");
    if (fs.existsSync(agents) && fs.existsSync(journalDir)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        "Repo root not found (need AGENTS.md and docs/journal/). Run from the repository."
      );
    }
    current = parent;
  }
}

export function todayIso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function countEntries(text) {
  const matches = text.match(ENTRY_HEADING);
  return matches ? matches.length : 0;
}

export function checkJournal(repoRoot, { onDate, minEntries = 1 } = {}) {
  const day = onDate || todayIso();
  const journalPath = path.join(repoRoot, "docs", "journal", `${day}.md`);

  if (!fs.existsSync(journalPath)) {
    return {
      ok: false,
      today: day,
      journalPath: null,
      entryCount: 0,
      message: `Missing journal: docs/journal/${day}.md — append an entry before ending the session.`
    };
  }

  const text = fs.readFileSync(journalPath, "utf8");
  const entryCount = countEntries(text);
  if (entryCount < minEntries) {
    return {
      ok: false,
      today: day,
      journalPath,
      entryCount,
      message: `docs/journal/${day}.md has ${entryCount} entry/entries; need at least ${minEntries}.`
    };
  }

  return {
    ok: true,
    today: day,
    journalPath,
    entryCount,
    message: `docs/journal/${day}.md (${entryCount} entries).`
  };
}

export function listRecentJournals(repoRoot, limit = 3) {
  const dir = path.join(repoRoot, "docs", "journal");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => JOURNAL_NAME.test(name))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((name) => path.join(dir, name));
}

export function readTail(filePath, maxChars = 3500) {
  const text = fs.readFileSync(filePath, "utf8");
  if (text.length <= maxChars) return text;
  return "…\n" + text.slice(-maxChars);
}
