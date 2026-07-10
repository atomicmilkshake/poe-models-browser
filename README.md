# Poe Models Browser

A fast, local web app for exploring Poe models with pricing, capabilities, and benchmark overlays.

It combines:
- Live model metadata from Poe (`/v1/models`)
- Public benchmark snapshots from OpenRouter (`benchmarks.json` and `/api/benchmarks`)
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
  - Pareto frontier overlay
  - log-scaled cost axis for outlier-heavy pricing
- Smarter benchmark matching between Poe model IDs and OpenRouter slugs

## Project Structure

- `index.html` - app shell and controls
- `styles.css` - theme and layout
- `app.js` - app logic, filtering, chart rendering, benchmark matching
- `proxy.js` - local API proxy for Poe + OpenRouter benchmark fetch
- `benchmarks.json` - cached OpenRouter model + benchmark snapshot
- `Launch.bat` / `Poe Models Browser.lnk` - local launch helpers

## Quick Start

Requires [Node.js](https://nodejs.org/). No Poe API key needed — Poe's `/v1/models` list is public.

```bash
npm install
npm start
```

Then open `http://localhost:8787`. On Windows you can also double-click `Launch.bat`.

The local server serves the app and proxies:
- `GET /api/models` → Poe `/v1/models`
- `GET /api/benchmarks` → OpenRouter models (for live benchmark refresh)

A proxy is required because browsers block direct calls to those APIs (CORS). Opening `index.html` as a file will not load live Poe data.

## Notes

- No `.env` is required. `POE_API_KEY` in `.env` is optional.
- Benchmark coverage depends on OpenRouter mappings and available public benchmark fields.
- If UI changes do not appear, do a hard refresh.

## Release

Current stable release: `v1.0.0`

