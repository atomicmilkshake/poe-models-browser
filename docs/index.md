# Documentation index

Central hub for **Poe Models Browser**. Agents: start with [AGENTS.md](../AGENTS.md) and `npm run bootstrap`.

## For humans

| Doc | Description |
|-----|-------------|
| [../README.md](../README.md) | Product overview, quick start, release tag |
| [architecture.md](architecture.md) | Process model, key files, data flow |
| [product-notes.md](product-notes.md) | Feature decisions, filters, chart overlays, open ideas |

## For agents

| Doc | Description |
|-----|-------------|
| [../AGENTS.md](../AGENTS.md) | Session protocol, journal enforcement, conventions |
| [journal/README.md](journal/README.md) | Dev journal format and rules |
| [journal/](journal/) | Daily append-only journals (`YYYY-MM-DD.md`) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run bootstrap` | Session context dump + journal status |
| `npm run journal-check` | Enforce today's journal has entries |
| `npm start` | Run Electron app |
| `Launch.bat` | Windows double-click launcher (install if needed, detach Electron) |

## Repo layout (code)

```
main.js          Electron main (frameless window, IPC fetch)
preload.js       contextBridge → window.electronAPI
index.html       Shell + filters + chart panel
app.js           Models, facets, table, chart, frontiers
styles.css       Theme
benchmarks.json  Cached OpenRouter snapshot
Launch.bat       Windows launcher
package.json     version, electron dep, npm scripts
docs/            This documentation tree
scripts/         bootstrap.mjs, journal-check.mjs
```
