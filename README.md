# Poe Models Browser

A frameless Electron desktop app for exploring Poe models with pricing, capabilities, and benchmark overlays.

It combines:
- Live model metadata from Poe (`/v1/models`)
- Public benchmark snapshots from OpenRouter (`benchmarks.json` and live refresh)
- Interactive filtering, sorting, and charting (including Pareto frontier and composite benchmark index)

## Highlights

- Sortable model table with sticky headers
- Cyberpunk UI theme
- Multi-filter sidebar:
  - price, context length, and intelligence sliders
  - capability chips (tools, web search, benchmarked, Pareto, etc.)
- Cost vs capability chart:
  - selectable X and Y metrics
  - composite benchmark index
  - optional Pareto and Costanza frontier overlays (Costanza: P70–P85 intelligence band, thriftiest in-band; hard ceiling at P85)
  - log-scaled cost axis for outlier-heavy pricing
- Smarter benchmark matching between Poe model IDs and OpenRouter slugs

## Project Structure

- `main.js` - Electron main process (frameless window, IPC fetch, window controls)
- `preload.js` - secure bridge exposing `electronAPI` to the renderer
- `index.html` - app shell and controls
- `styles.css` - theme and layout
- `app.js` - app logic, filtering, chart rendering, benchmark matching
- `benchmarks.json` - cached OpenRouter model + benchmark snapshot
- `Launch.bat` / `Poe Models Browser.lnk` - local launch helpers
- `docs/` - **central documentation** ([docs/index.md](docs/index.md))
- `AGENTS.md` - agent session protocol and journal rules
- `scripts/bootstrap.mjs` / `journal-check.mjs` - agent bootstrap and journal enforcement

## Quick Start

Requires [Node.js](https://nodejs.org/). No Poe API key needed — Poe's `/v1/models` list is public.

```bash
npm install
npm start
```

On Windows you can also double-click `Launch.bat`.

The app opens as a frameless Electron window. Remote API calls (Poe models, OpenRouter benchmarks) run in the main process via `net.fetch`, so no local CORS proxy is required. Models auto-load on startup from `https://api.poe.com/v1/models`.

## Documentation

All deep docs live under [`docs/`](docs/index.md) (architecture, product notes, daily agent journal). Agents should run `npm run bootstrap` at session start and append to `docs/journal/YYYY-MM-DD.md` every write-turn (`npm run journal-check` enforces it).

## Notes

- No `.env` or API key is required.
- Benchmark coverage depends on OpenRouter mappings and available public benchmark fields.
- Scope is run-from-source via Electron (not a packaged installer).

## Release

Current stable release: `v1.2.0`
