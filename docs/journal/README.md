# Dev journal

Append-only daily logs so agents and humans recover context without chat amnesia.

## Location

```text
docs/journal/YYYY-MM-DD.md
```

Create today's file if missing. Use the template below.

## Template for a new day

```markdown
# Journal — YYYY-MM-DD

## HH:MM - Title of this turn

- **Did:** …
- **Why:** …
- **Next:** …
```

## Entry rules

1. Heading **must** match: `## HH:MM - Title` (24-hour time).
2. One entry per agent turn that changes the repo (or a tight batch of related changes).
3. Append only — no editing history entries.
4. Optional sections: files touched, commands run, risks.

## Enforcement

- [AGENTS.md](../../AGENTS.md) requires a journal entry for every write turn.
- `npm run bootstrap` reports today's status.
- `npm run journal-check` exits **non-zero** if today is missing or has zero valid entries.

```bash
npm run journal-check
npm run journal-check -- --min 2
npm run journal-check -- --date 2026-07-13
```
