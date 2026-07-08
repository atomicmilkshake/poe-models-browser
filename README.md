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

### 1) Install dependencies

```bash
npm install
```

### 2) Optional: configure Poe API key

Model listing from Poe can work without auth, but you can add a key for authenticated requests.

```bash
copy .env.example .env
```

Then edit `.env`:

```env
POE_API_KEY=your_key_here
```

### 3) Run local proxy

```bash
npm start
```

Proxy runs on `http://127.0.0.1:3847` and serves:
- `GET /api/models`
- `GET /api/benchmarks`

### 4) Open the app

Open `index.html` directly in your browser, or use `Launch.bat` / the shortcut.

## Notes

- `.env` is ignored and should never be committed.
- Benchmark coverage depends on OpenRouter mappings and available public benchmark fields.
- If UI changes do not appear, do a hard refresh.

## Release

Current stable release: `v1.0.0`

