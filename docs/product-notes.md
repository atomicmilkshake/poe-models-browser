# Product notes

Decisions and open ideas. Update when behavior changes.

## Shipping features

### Filters (sidebar)

- Priced only, has benchmark, tools, web search
- **Reasoning** — Poe `reasoning != null` (thinking/reasoning-capable models)
- Pareto frontier — table filter to global chart Pareto set
- Dual-range sliders: blended/prompt/completion $/1M, context, intelligence index
- Facet chip groups: owner, I/O modalities, endpoints, features

### Chart overlays (display-only; optional)

| Overlay | Default | Style | Definition |
|---------|---------|-------|------------|
| Pareto | On | Cyan dashed | Global cost-vs-Y non-dominated points |
| Costanza | Off | Gold solid | Intelligence **P70–P85** (hard ceiling P85) among plottable models; then Pareto **within band** on current axes |

Legend appears when either overlay is on. Sidebar Pareto chip still **filters the table**; chart toggles only draw.

### Launch (Windows)

- `Launch.bat` installs deps if Electron binary missing, then `start`s `electron.exe` and **exits** (no stuck console).
- `package.json` version **1.2.0** (tracks GitHub Latest release).

### Release process

- **Commit implies release:** after shippable commits, bump version if needed and create/update GitHub Release so Latest matches HEAD (see root `AGENTS.md` and global `~/.grok/AGENTS.md`).

## Explicitly not shipped

### Copilot agent custom-endpoint filter

- **Verified-only** was preferred over heuristics, then reconsidered as **likely** (~63 models: tools + `/v1/chat/completions` + ctx ≥ 128k).
- Public “someone tried Poe id in VS Code Copilot agent” evidence ≈ **0**.
- Local evidence (`J:\LLM\localYokel` copilot payload) informs **wire requirements** (70 tools, stream, chat-completions), not Poe id allowlists.
- **`thinking: false` does not hide models** in the picker (docs/users: **`toolCalling: true`** is the visibility gate). Do not ship a filter based on the false claim.
- **Status:** deferred — do not claim verified Copilot compatibility without dated field evidence.

## Open ideas

- Dual reasoning filter (reasoning only / non-reasoning only) if users want both directions
- Costanza percentile knobs in UI
- Optional “likely Copilot agent” heuristic chip with soft wording and `as_of` metadata
