# ZippZappWeb

The landing page of ZippZapp — a power bank rental network.

Static HTML/CSS/JS, no build step.

## Preview

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open <http://localhost:8080>.

Opening `index.html` directly from the filesystem will not load the CSS or fonts — use the server.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `assets/css/style.css` | All styling |
| `assets/js/waves.js` | Hero background wave field |
| `assets/js/bolt.js` | The logo mark, drawn as live wave lines |
| `assets/js/main.js` | Accordion, form, mobile nav |
| `versions/` | Earlier prototypes, kept for reference |

See [CLAUDE.md](CLAUDE.md) for architecture notes and constraints.
