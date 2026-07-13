#!/usr/bin/env node
/**
 * Enforce per-day journal entries for agent sessions.
 * Run: npm run journal-check  |  node scripts/journal-check.mjs [--min N] [--date YYYY-MM-DD]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot, checkJournal, todayIso } from "./lib/journal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let minEntries = 1;
  let onDate = todayIso();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--min" && argv[i + 1]) {
      minEntries = Math.max(1, Number(argv[++i]) || 1);
    } else if (a === "--date" && argv[i + 1]) {
      onDate = argv[++i];
    } else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "Usage: node scripts/journal-check.mjs [--min N] [--date YYYY-MM-DD]\n"
      );
      process.exit(0);
    }
  }
  return { minEntries, onDate };
}

function main() {
  const { minEntries, onDate } = parseArgs(process.argv.slice(2));
  const root = findRepoRoot(path.join(__dirname, ".."));
  const status = checkJournal(root, { onDate, minEntries });

  if (status.ok) {
    process.stdout.write(`OK: ${status.message}\n`);
    process.exit(0);
  }

  process.stderr.write(`FAIL: ${status.message}\n`);
  process.stderr.write(
    "Append an entry with heading: ## HH:MM - Title  (see docs/journal/README.md)\n"
  );
  process.exit(1);
}

main();
