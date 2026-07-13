# Poe Models Browser — Agent Rules

Read this file at session start. Then run the bootstrap. Then work. Then journal.

## Bootstrap (no amnesia)

**Before any non-trivial work**, run:

```bash
npm run bootstrap
```

Or: `node scripts/bootstrap.mjs`

That prints:

- Repo identity and version
- Paths to central docs
- Today's journal status (pass/fail)
- Tails of recent journal days
- Current git short status

If bootstrap reports a **missing or empty journal for today**, create `docs/journal/YYYY-MM-DD.md` from the template **before** ending the session.

## Documentation map (source of truth)

| Path | Purpose |
|------|---------|
| [README.md](README.md) | User-facing overview and quick start |
| [docs/index.md](docs/index.md) | **Hub** — start here for all project docs |
| [docs/architecture.md](docs/architecture.md) | Runtime, files, data flow |
| [docs/product-notes.md](docs/product-notes.md) | Feature decisions, frontiers, filters, open ideas |
| [docs/journal/](docs/journal/) | Per-day agent journal (append-only days) |
| [docs/journal/README.md](docs/journal/README.md) | Journal format and enforcement |

Do **not** invent parallel docs at the repo root. Update `docs/` and link from `docs/index.md`.

## Mandatory per-turn dev journal

**Every agent turn that changes code, config, docs structure, or product decisions MUST append a journal entry** to:

```text
docs/journal/YYYY-MM-DD.md
```

(Use the session's local calendar date.)

### Rules

1. **Per turn, not per day only.** One entry per meaningful agent turn (batch of related edits is OK as one entry).
2. **Append only.** Never rewrite or delete prior entries in a day file. Fix mistakes with a new entry.
3. **Heading format (required):**

   ```markdown
   ## HH:MM - Short title
   ```

   24-hour local time. Bootstrap/journal-check match this pattern.

4. **Body minimum:**

   - **Did:** what changed (files / behavior)
   - **Why:** intent or user request
   - **Next:** optional open follow-ups

5. **Session end:** run `npm run journal-check` and fix failures before claiming done.

6. Pure Q&A with **no** repo writes may skip a journal entry. Any write → journal.

### Commands

```bash
npm run journal-check          # fail if today's journal missing or has <1 entry
npm run journal-check -- --min 2
```

## Project facts (quick)

- **Stack:** Electron (frameless), plain JS renderer (`app.js`), no bundler.
- **Launch:** `npm start` or `Launch.bat` (detaches `electron.exe`).
- **Version:** see `package.json` (stable docs: `v1.1.0`).
- **APIs:** Poe `https://api.poe.com/v1/models` (public list); OpenRouter benchmarks via `benchmarks.json` + refresh.
- **No API key** required for the public models list.
- **Main logic:** `app.js` (filters, chart, Pareto/Costanza, normalizeModel).
- **Main process:** `main.js` (`net.fetch` IPC, window controls).

## Coding conventions

- Prefer small, focused edits; match existing style in `app.js` / `styles.css`.
- Do not commit secrets (`.env` is gitignored).
- Do not add packaging/installer scope unless asked (run-from-source Electron).
- Keep user-facing README concise; put deep notes in `docs/`.
- After feature work, update `docs/product-notes.md` if behavior/decisions changed.

## Commits imply releases

**On this project and all others:** when the user asks to **commit** (and especially commit+push of shippable work), also:

1. Bump version if behavior/docs warrant it (`package.json`, lockfile, README release line, launcher banner if any).
2. **Update or create the matching GitHub Release** (`gh release create` / `gh release edit`) so `Latest` matches HEAD, not a stale tag.
3. Prefer a new tag (`vX.Y.Z`) over silently rewriting history; rewrite a release notes body only when intentionally refreshing the same tag.

Never leave `origin` and GitHub Releases out of date after a requested publish commit.

## Verification

- Syntax: `node --check app.js`
- Launch smoke: `Launch.bat` or `npm start` (GUI).
- Journal: `npm run journal-check`
- After commit+push of a release: `gh release list` shows current tag as Latest.

## Anti-patterns

- Starting a session without reading `AGENTS.md` / running bootstrap
- Leaving the day without a journal entry after edits
- Storing design notes only in chat (write them to `docs/`)
- Claiming “verified Copilot agent compatibility” without dated evidence
- Duplicating long docs into `AGENTS.md` (link instead)
