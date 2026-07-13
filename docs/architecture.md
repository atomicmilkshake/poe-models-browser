# Architecture

## Runtime

Frameless **Electron** app (run from source).

```
┌─────────────┐     IPC      ┌──────────────┐
│  main.js    │◄────────────►│  preload.js  │
│  BrowserWin │              │  electronAPI │
│  net.fetch  │              └──────┬───────┘
└─────────────┘                     │
                                    ▼
                             ┌──────────────┐
                             │ index.html   │
                             │ app.js       │
                             │ styles.css   │
                             └──────────────┘
```

- **Main process** loads `index.html`, handles `fetch-json` via `net.fetch` (avoids renderer CORS), and window min/max/close.
- **Renderer** does all UI logic. No bundler; plain scripts.
- **Sandbox + contextIsolation** on; no Node in the renderer.

## Startup

1. `npm start` → `electron .` (or `Launch.bat` → `node_modules/electron/dist/electron.exe .`)
2. Main creates frameless window (`show: false` until `ready-to-show`)
3. Renderer loads models from Poe `/v1/models` (auto on start)
4. Benchmarks from bundled `benchmarks.json` and optional live OpenRouter refresh

## Key modules in `app.js`

| Concern | Notes |
|---------|--------|
| `normalizeModel` | Maps Poe API → table row (pricing, tools, web search, **reasoning**, endpoints, context) |
| Facets / chips | Search, owners, modalities, priced, benchmarked, tools, web search, **reasoning**, Pareto filter |
| Chart | X = cost metrics, Y = capability indices; log cost axis |
| Pareto frontier | Global non-dominated set on current chart axes |
| Costanza frontier | Intelligence P70–P85 band, then in-band Pareto; optional overlay |
| Benchmark match | Poe id ↔ OpenRouter slug / aliases |

## External data

| Source | Use |
|--------|-----|
| `https://api.poe.com/v1/models` | Live catalog (public; no key for list) |
| OpenRouter models API / `benchmarks.json` | Intelligence/coding indices, pricing fallback, composite score |

## Versioning

- `package.json` `version` should match documented stable release in README.
- Tags on GitHub: `v1.0.0`, `v1.1.0` (as of mid-2026).
