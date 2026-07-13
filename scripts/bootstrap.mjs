#!/usr/bin/env node
/**
 * Session bootstrap — print durable context so agents do not start amnesiac.
 * Run: npm run bootstrap  |  node scripts/bootstrap.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  findRepoRoot,
  checkJournal,
  listRecentJournals,
  readTail,
  todayIso
} from "./lib/journal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function safeGit(root, args) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "(git unavailable)";
  }
}

function main() {
  const root = findRepoRoot(path.join(__dirname, ".."));
  const pkg = readJson(path.join(root, "package.json"));
  const day = todayIso();
  const journal = checkJournal(root, { onDate: day });
  const recent = listRecentJournals(root, 3);

  const lines = [
    "# Poe Models Browser — agent bootstrap",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Repo: ${root}`,
    `Package: ${pkg.name}@${pkg.version}`,
    "",
    "## Read first",
    "",
    "- AGENTS.md (session protocol + journal law)",
    "- docs/index.md (doc hub)",
    "- docs/architecture.md",
    "- docs/product-notes.md",
    "- docs/journal/ (recent days below)",
    "",
    "## Journal status",
    "",
    journal.ok ? `OK: ${journal.message}` : `FAIL: ${journal.message}`,
    "",
    "## Git",
    "",
    "```",
    safeGit(root, "status -sb"),
    safeGit(root, "log --oneline -5"),
    "```",
    "",
    "## Key paths",
    "",
    "- main.js, preload.js, index.html, app.js, styles.css",
    "- Launch.bat, package.json, benchmarks.json",
    "- scripts/bootstrap.mjs, scripts/journal-check.mjs",
    ""
  ];

  if (recent.length) {
    lines.push("## Recent journal tails", "");
    for (const file of recent) {
      lines.push(`### ${path.basename(file)}`, "");
      lines.push(readTail(file, 2800), "");
    }
  } else {
    lines.push("## Recent journal tails", "", "(none yet)", "");
  }

  if (!journal.ok) {
    lines.push(
      "## Action required",
      "",
      `Create or append: docs/journal/${day}.md`,
      "Use the template in docs/journal/README.md",
      "Every write-turn must append `## HH:MM - Title`",
      ""
    );
  }

  process.stdout.write(lines.join("\n"));
  process.exitCode = journal.ok ? 0 : 1;
}

main();
