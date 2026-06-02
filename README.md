# christiantobin.github.io

Personal portfolio for Christian Tobin — Software Engineer, IoT & Embedded Systems.

A single-page vCard-style site: sidebar profile card, tabbed content
(About / Resume / Portfolio / Contact), and an interactive three.js "connected"
globe in the hero that nods to IoT.

## Stack
- Plain HTML, CSS, and JavaScript — no framework, no build step.
- [three.js](https://threejs.org/) (via CDN) for the globe.

## Develop
Serve over HTTP (the globe reads image pixel data, which needs a real origin):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure
- `index.html` — markup
- `styles.css` — dark theme + vCard layout
- `app.js` — tab switching + globe lifecycle
- `globe.js` — three.js dotted globe
- `assets/` — images + land mask
- `archive/` — previous bash-simulator version

The previous interactive bash-simulator portfolio is preserved in `archive/`.
