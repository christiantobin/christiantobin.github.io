# vCard Portfolio with 3D Globe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bash-simulator portfolio with a clean, single-page vCard-style site featuring an interactive three.js "connected" globe, immediately legible to recruiters and impressive to peers.

**Architecture:** Static site — `index.html` (markup) + `styles.css` (dark theme, vCard layout) + `app.js` (tab switching, globe lifecycle) + `globe.js` (three.js dotted globe). three.js loaded from CDN. No build step, no framework. Deployable as-is on GitHub Pages.

**Tech Stack:** HTML5, CSS3 (custom properties, grid/flex), vanilla ES module JS, three.js (CDN, pinned). Dev/verify with `python3 -m http.server` + Playwright.

**Testing strategy:** This project's constraint is "no overly-complex frameworks," and there is no meaningful pure-logic unit to test without inventing a harness that contradicts that. Verification is therefore **browser-based**: after each task, serve the site over local HTTP and use Playwright to (a) load the page, (b) assert zero unexpected console errors, (c) assert key DOM nodes exist / tabs switch, and (d) screenshot for visual confirmation. The one piece of pure logic (lat/long → 3D vector) gets an inline assertion check.

**Why local HTTP, not `file://`:** `globe.js` reads pixel data from the land-mask image via canvas `getImageData`, which taints/throws on `file://` (opaque origin). Served over HTTP (locally and on GitHub Pages) it is same-origin and works. Always verify via `http://localhost:8000`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `index.html` | Markup: sidebar profile card, hero (name + globe canvas), sticky tab nav, four `<section>` tab panels. |
| `styles.css` | Dark theme tokens, vCard two-column layout, tab styling, cards, responsive rules. |
| `app.js` | Tab switching + `location.hash` sync; instantiates globe; pauses/resumes it via visibility + intersection observers. |
| `globe.js` | ES module exporting `createGlobe(container)`. three.js dotted-continent point globe, pulsing arcs, drag-to-rotate, idle auto-rotate, WebGL/fallback handling. Returns `{ pause, resume, destroy }`. |
| `assets/avatar.png` | Headshot (from `photos/download.jfif`, already a PNG). |
| `assets/portrait.jpg` | Full-body photo (from `photos/Image from iOS.jpg`). |
| `assets/land-mask.png` | 512×256 equirectangular land mask (white = land). |
| `archive/` | Old bash-sim files preserved: `scene.js`, `script.js`, `webgl-test.html`, `dir/`. |
| `README.md` | Updated description. |

---

## Task 0: Project prep — archive old files, stage assets

**Files:**
- Create: `archive/` (move targets), `assets/avatar.png`, `assets/portrait.jpg`
- Move: `scene.js`, `script.js`, `webgl-test.html`, `dir/` → `archive/`

- [ ] **Step 1: Create folders and move old bash-sim files into `archive/`**

```bash
cd /home/cjtobin/vscode/christiantobin.github.io
mkdir -p archive assets
git mv scene.js archive/scene.js
git mv script.js archive/script.js
git mv webgl-test.html archive/webgl-test.html
git mv dir archive/dir
```

(If a path is untracked and `git mv` errors, use plain `mv` instead for that path.)

- [ ] **Step 2: Copy the two photos into `assets/` with clean names**

```bash
cp "photos/download.jfif" assets/avatar.png      # already PNG bytes
cp "photos/Image from iOS.jpg" assets/portrait.jpg
```

- [ ] **Step 3: Verify file types are correct**

Run: `file assets/avatar.png assets/portrait.jpg`
Expected: `avatar.png: PNG image data ...` and `portrait.jpg: JPEG image data ...`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: archive bash-sim files, stage portfolio photos"
```

---

## Task 1: HTML skeleton

**Files:**
- Modify (replace): `index.html`

- [ ] **Step 1: Replace `index.html` with the full skeleton**

Write `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Christian Tobin — Software Engineer</title>
  <meta name="description" content="Christian Tobin — Software Engineer, IoT & Embedded Systems. AWS Certified Solutions Architect based in San Diego." />
  <link rel="stylesheet" href="styles.css" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
</head>
<body>
  <main class="layout">

    <!-- SIDEBAR PROFILE CARD -->
    <aside class="sidebar" id="sidebar"><!-- filled in Task 3 --></aside>

    <!-- MAIN PANEL -->
    <div class="main">
      <header class="hero">
        <div class="hero-text">
          <h1 class="hero-name">Christian Tobin</h1>
          <p class="hero-title">Software Engineer · IoT &amp; Embedded Systems</p>
          <p class="hero-tagline">Building scalable cloud solutions at the intersection of hardware and software.</p>
        </div>
        <div class="hero-globe" id="globe"><!-- three.js canvas injected here --></div>
      </header>

      <nav class="tabs" id="tabs" aria-label="Sections">
        <button class="tab is-active" data-tab="about">About</button>
        <button class="tab" data-tab="resume">Resume</button>
        <button class="tab" data-tab="portfolio">Portfolio</button>
        <button class="tab" data-tab="contact">Contact</button>
      </nav>

      <section class="panel is-active" id="about" data-panel="about"><!-- Task 5 --></section>
      <section class="panel" id="resume" data-panel="resume"><!-- Task 6 --></section>
      <section class="panel" id="portfolio" data-panel="portfolio"><!-- Task 7 --></section>
      <section class="panel" id="contact" data-panel="contact"><!-- Task 8 --></section>
    </div>

  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Start a local server and load the page in Playwright**

Run: `python3 -m http.server 8000 >/tmp/httpd.log 2>&1 &` then use Playwright `browser_navigate` to `http://localhost:8000`.

- [ ] **Step 3: Verify structure and no errors**

Check via Playwright `browser_console_messages`: no errors except an expected 404/known-missing for `styles.css`/`app.js` until later tasks (those are fine this step). Confirm the hero name "Christian Tobin" and the four tab buttons are present in `browser_snapshot`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: portfolio HTML skeleton (sidebar, hero, tabs, panels)"
```

---

## Task 2: Base theme and vCard layout CSS

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Write `styles.css` with theme tokens, layout, hero, and tabs**

```css
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --surface-2: #1c232c;
  --border: #21262d;
  --text: #e6edf3;
  --muted: #8b949e;
  --teal: #5eead4;
  --blue: #2563eb;
  --radius: 16px;
  --maxw: 1080px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  /* subtle starfield */
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.25), transparent),
    radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,.18), transparent),
    radial-gradient(1px 1px at 40% 80%, rgba(94,234,212,.18), transparent);
  background-attachment: fixed;
}

a { color: inherit; text-decoration: none; }

.layout {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 28px 20px 64px;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: start;
}

/* sidebar made sticky in Task 3 styles below */
.sidebar {
  position: sticky;
  top: 28px;
}

.main { min-width: 0; }

/* HERO */
.hero {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  align-items: center;
  overflow: hidden;
}
.hero-name { font-size: 2rem; font-weight: 800; letter-spacing: -.5px; }
.hero-title { color: var(--teal); font-weight: 600; margin-top: 4px; }
.hero-tagline { color: var(--muted); margin-top: 10px; max-width: 42ch; }
.hero-globe { width: 220px; height: 220px; justify-self: end; }
.hero-globe canvas { display: block; width: 100%; height: 100%; }

/* TABS */
.tabs {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 20px 0;
  padding: 8px;
  background: rgba(13,17,23,.85);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.tab {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--muted);
  font: inherit;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.tab:hover { color: var(--text); }
.tab.is-active { color: var(--text); background: var(--surface-2); box-shadow: inset 0 -2px 0 var(--teal); }

/* PANELS */
.panel { display: none; animation: fade .25s ease; }
.panel.is-active { display: block; }
@keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.section-title { font-size: 1.3rem; font-weight: 700; }
.section-rule { width: 40px; height: 3px; background: var(--teal); border-radius: 2px; margin: 8px 0 18px; }

/* generic card */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition: border-color .15s, transform .15s;
}
.card:hover { border-color: var(--teal); transform: translateY(-2px); }
.card h4 { font-size: 1rem; }
.card p { color: var(--muted); font-size: .9rem; margin-top: 6px; }
.tag { display: inline-block; font-size: .72rem; color: var(--teal); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; margin-top: 10px; }

/* RESPONSIVE */
@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: static; }
  .hero { grid-template-columns: 1fr; text-align: center; }
  .hero-globe { justify-self: center; width: 200px; height: 200px; }
  .hero-tagline { margin-left: auto; margin-right: auto; }
}
```

- [ ] **Step 2: Reload and screenshot**

Reload `http://localhost:8000` in Playwright, `browser_take_screenshot`. Expected: dark page, hero card with name/title/tagline, tab bar with four tabs, no layout overflow.

- [ ] **Step 3: Verify no CSS-caused console errors**

`browser_console_messages` — expected: only a possible 404 for `app.js` (added Task 4). No CSS parse errors.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "feat: dark vCard theme and layout"
```

---

## Task 3: Sidebar profile card

**Files:**
- Modify: `index.html` (fill `<aside class="sidebar">`)
- Modify: `styles.css` (append sidebar styles)

- [ ] **Step 1: Fill the sidebar markup in `index.html`**

Replace `<aside class="sidebar" id="sidebar"><!-- filled in Task 3 --></aside>` with:

```html
<aside class="sidebar" id="sidebar">
  <div class="card profile">
    <img class="avatar" src="assets/avatar.png" alt="Christian Tobin" />
    <h2 class="profile-name">Christian Tobin</h2>
    <span class="profile-badge">Software Engineer</span>
    <ul class="contacts">
      <li><span class="ci">✉</span><a href="mailto:christian@wirelesseco.com">christian@wirelesseco.com</a></li>
      <li><span class="ci">📍</span>San Diego, California</li>
    </ul>
    <div class="socials">
      <a href="https://www.linkedin.com/in/christian-tobin-37a6b9169" target="_blank" rel="noopener" aria-label="LinkedIn">in</a>
      <a href="https://x.com/christianjtobin" target="_blank" rel="noopener" aria-label="X">X</a>
      <a href="https://www.youtube.com/@christiantobin6006" target="_blank" rel="noopener" aria-label="YouTube">▶</a>
      <a href="https://github.com/christiantobin" target="_blank" rel="noopener" aria-label="GitHub">GH</a>
    </div>
  </div>
</aside>
```

- [ ] **Step 2: Append sidebar styles to `styles.css`**

```css
.profile { text-align: center; }
.avatar {
  width: 96px; height: 96px; border-radius: 22px; object-fit: cover; object-position: top;
  border: 1px solid var(--border); background: var(--surface-2);
}
.profile-name { font-size: 1.15rem; font-weight: 700; margin-top: 12px; }
.profile-badge {
  display: inline-block; margin-top: 8px; font-size: .78rem; color: var(--teal);
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 4px 12px;
}
.contacts { list-style: none; text-align: left; margin-top: 16px; border-top: 1px solid var(--border); padding-top: 14px; }
.contacts li { display: flex; gap: 10px; align-items: center; font-size: .85rem; color: var(--muted); padding: 6px 0; }
.contacts a:hover { color: var(--teal); }
.ci { width: 16px; text-align: center; }
.socials { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
.socials a {
  width: 36px; height: 36px; display: grid; place-items: center; font-weight: 700; font-size: .8rem;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; color: var(--muted);
  transition: color .15s, border-color .15s;
}
.socials a:hover { color: var(--teal); border-color: var(--teal); }
```

- [ ] **Step 3: Reload, screenshot, verify avatar loads**

Reload in Playwright, `browser_take_screenshot`. Expected: sidebar card with the headshot avatar, name, badge, contacts, social buttons. Confirm via `browser_console_messages` there is **no 404 for `assets/avatar.png`**.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: sidebar profile card"
```

---

## Task 4: Tab switching + hash sync (`app.js`)

**Files:**
- Create: `app.js`

- [ ] **Step 1: Write `app.js` with tab logic and a self-check assertion**

```js
// app.js — tab switching with location.hash sync.
// Globe wiring is added in Task 11.

const VALID = ["about", "resume", "portfolio", "contact"];

function activate(name) {
  if (!VALID.includes(name)) name = "about";
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("is-active", t.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("is-active", p.dataset.panel === name);
  });
  if (location.hash !== "#" + name) {
    history.replaceState(null, "", "#" + name);
  }
}

function initTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab));
  });
  window.addEventListener("hashchange", () => activate(location.hash.slice(1)));
  activate(location.hash.slice(1) || "about");

  // self-check: after init exactly one panel is active
  const active = document.querySelectorAll(".panel.is-active").length;
  console.assert(active === 1, "[app] expected exactly one active panel, got " + active);
}

initTabs();
```

- [ ] **Step 2: Reload and verify default tab**

Reload `http://localhost:8000`. Expected: About tab active, others hidden. `browser_console_messages`: no assertion failure, no errors.

- [ ] **Step 3: Verify clicking a tab switches panels and updates hash**

In Playwright: `browser_click` the "Resume" tab. Then `browser_snapshot` — Resume panel visible, About hidden. Check URL is now `…#resume` (via `browser_evaluate` returning `location.hash`, expected `"#resume"`).

- [ ] **Step 4: Verify deep link**

`browser_navigate` to `http://localhost:8000/#portfolio`. Expected: Portfolio tab active on load.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js
git commit -m "feat: tab switching with hash deep-links"
```

---

## Task 5: About panel content

**Files:**
- Modify: `index.html` (fill `#about`)
- Modify: `styles.css` (append About styles)

- [ ] **Step 1: Fill the About panel markup**

Replace `<section class="panel is-active" id="about" data-panel="about"><!-- Task 5 --></section>` with:

```html
<section class="panel is-active" id="about" data-panel="about">
  <h3 class="section-title">About Me</h3>
  <div class="section-rule"></div>
  <div class="about-grid">
    <img class="portrait" src="assets/portrait.jpg" alt="Christian Tobin" />
    <div>
      <p>I'm a Software Engineer specializing in IoT and embedded systems, building scalable cloud solutions at the intersection of hardware and software. I'm an AWS Certified Solutions Architect based in San Diego, working across embedded firmware, edge computing, and serverless cloud architecture.</p>
      <p class="muted-p">Outside of code I'm into running, mixed martial arts, gaming, and photography &amp; video editing.</p>
      <p class="quote">"When in doubt, <code>cout&lt;&lt;</code>"</p>
    </div>
  </div>

  <h3 class="section-title" style="margin-top:28px">What I Do</h3>
  <div class="section-rule"></div>
  <div class="card-grid">
    <div class="card"><h4>⚡ Embedded Systems</h4><p>Firmware on Zephyr RTOS and Arduino, embedded C/C++ for connected devices.</p></div>
    <div class="card"><h4>☁ Cloud / AWS</h4><p>IoT Core, Lambda, DynamoDB, API Gateway, CDK — serverless and microservices.</p></div>
    <div class="card"><h4>🌐 IoT &amp; Edge</h4><p>End-to-end IoT: device to cloud, edge compute, telemetry pipelines.</p></div>
    <div class="card"><h4>🤖 AI / ML</h4><p>Applied ML and AI agents with Bedrock and SageMaker.</p></div>
  </div>
</section>
```

- [ ] **Step 2: Append About styles**

```css
.about-grid { display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: start; }
.portrait { width: 100%; border-radius: 12px; border: 1px solid var(--border); object-fit: cover; }
.muted-p { color: var(--muted); margin-top: 12px; }
.quote { margin-top: 14px; color: var(--teal); font-style: italic; }
.quote code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; font-style: normal; }
@media (max-width: 560px) { .about-grid { grid-template-columns: 1fr; } .portrait { max-width: 220px; } }
```

- [ ] **Step 3: Reload, screenshot, verify portrait loads**

Reload (About tab). `browser_take_screenshot`. Expected: portrait photo + bio, four "What I Do" cards. `browser_console_messages`: no 404 for `assets/portrait.jpg`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: About panel with portrait and what-I-do cards"
```

---

## Task 6: Resume panel content

**Files:**
- Modify: `index.html` (fill `#resume`)
- Modify: `styles.css` (append resume styles)

- [ ] **Step 1: Fill the Resume panel markup (high-level, no dates)**

Replace `<section class="panel" id="resume" data-panel="resume"><!-- Task 6 --></section>` with:

```html
<section class="panel" id="resume" data-panel="resume">
  <h3 class="section-title">Experience</h3>
  <div class="section-rule"></div>
  <div class="timeline">
    <div class="t-item"><h4>Software Engineer — IoT &amp; Embedded</h4><span class="t-org">Fluidra North America</span><p>Connected-device firmware and AWS cloud infrastructure for smart pool &amp; water systems.</p></div>
  </div>

  <h3 class="section-title" style="margin-top:28px">Education</h3>
  <div class="section-rule"></div>
  <div class="timeline">
    <div class="t-item"><h4>Georgia Institute of Technology</h4><span class="t-org">Computer Science</span></div>
    <div class="t-item"><h4>California State University San Marcos</h4></div>
  </div>

  <h3 class="section-title" style="margin-top:28px">Certifications</h3>
  <div class="section-rule"></div>
  <div class="timeline">
    <div class="t-item"><h4>AWS Certified Solutions Architect</h4><span class="t-org">Amazon Web Services</span></div>
  </div>

  <h3 class="section-title" style="margin-top:28px">Skills</h3>
  <div class="section-rule"></div>
  <div class="skills">
    <div class="skill-cat"><h5>Languages</h5><div class="chips"><span>C++</span><span>Swift</span><span>Python</span><span>TypeScript</span><span>Rust</span></div></div>
    <div class="skill-cat"><h5>Cloud (AWS)</h5><div class="chips"><span>Lambda</span><span>IoT Core</span><span>DynamoDB</span><span>S3</span><span>API Gateway</span><span>SageMaker</span><span>Bedrock</span><span>EC2</span><span>Cognito</span><span>CDK</span></div></div>
    <div class="skill-cat"><h5>Embedded</h5><div class="chips"><span>Zephyr RTOS</span><span>Arduino</span><span>Embedded C/C++</span></div></div>
    <div class="skill-cat"><h5>Tools</h5><div class="chips"><span>Neovim</span><span>Git</span><span>CMake</span><span>Jest</span><span>npm</span></div></div>
  </div>
</section>
```

- [ ] **Step 2: Append resume styles**

```css
.timeline { display: flex; flex-direction: column; gap: 12px; }
.t-item { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--teal); border-radius: 10px; padding: 14px 16px; }
.t-item h4 { font-size: 1rem; }
.t-org { color: var(--blue); font-size: .85rem; font-weight: 600; }
.t-item p { color: var(--muted); font-size: .9rem; margin-top: 6px; }
.skills { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.skill-cat h5 { font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin-bottom: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips span { font-size: .8rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; }
@media (max-width: 560px) { .skills { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Verify**

In Playwright `browser_click` Resume tab, `browser_take_screenshot`. Expected: Experience/Education/Certifications timeline items and four skill chip groups. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: Resume panel (experience, education, skills)"
```

---

## Task 7: Portfolio panel content

**Files:**
- Modify: `index.html` (fill `#portfolio`)
- Modify: `styles.css` (append featured-card styles)

- [ ] **Step 1: Fill the Portfolio panel with the six curated GitHub projects**

Replace `<section class="panel" id="portfolio" data-panel="portfolio"><!-- Task 7 --></section>` with:

```html
<section class="panel" id="portfolio" data-panel="portfolio">
  <h3 class="section-title">Selected Projects</h3>
  <div class="section-rule"></div>
  <a class="card featured" href="https://github.com/christiantobin/tobot-agent" target="_blank" rel="noopener">
    <span class="featured-flag">★ Featured</span>
    <h4>Tobot Agent</h4>
    <p>Open-source AWS CDK template for an org-wide AI agent — Slack + webhook front doors, with pluggable MCP tools via AgentCore Gateway. Deploy your own AI agent with one stack.</p>
    <span class="tag">TypeScript · AWS CDK · MCP</span>
  </a>
  <div class="card-grid">
    <a class="card" href="https://github.com/christiantobin/NovuSelfHostedCDKApp" target="_blank" rel="noopener">
      <h4>Novu Self-Hosted (CDK)</h4>
      <p>AWS CDK app deploying self-hosted Novu notification infrastructure — ECS cluster, RDS, and S3, fully provisioned.</p>
      <span class="tag">TypeScript</span>
    </a>
    <a class="card" href="https://github.com/christiantobin/AWS-Hosted-LLM-Endpoint" target="_blank" rel="noopener">
      <h4>AWS-Hosted LLM Endpoint</h4>
      <p>CDK project that hosts a HuggingFace LLM on AWS SageMaker behind API Gateway.</p>
      <span class="tag">TypeScript</span>
    </a>
    <a class="card" href="https://github.com/christiantobin/universal-serverless-scheduler" target="_blank" rel="noopener">
      <h4>Universal Serverless Scheduler</h4>
      <p>A reusable serverless scheduling primitive for cloud workloads.</p>
      <span class="tag">TypeScript</span>
    </a>
    <a class="card" href="https://github.com/christiantobin/nextjs-apis-mongodb-cdkv2-construct" target="_blank" rel="noopener">
      <h4>Next.js + DocumentDB CDK Construct</h4>
      <p>Next.js app on AWS with backend Lambdas talking to DocumentDB, packaged as a publishable CDK construct.</p>
      <span class="tag">TypeScript</span>
    </a>
    <a class="card" href="https://github.com/christiantobin/branch-to-be" target="_blank" rel="noopener">
      <h4>branch-to-be</h4>
      <p>CLI that generates the would-be state of a base branch if all open PRs targeting it were merged.</p>
      <span class="tag">TypeScript</span>
    </a>
    <a class="card" href="https://github.com/christiantobin/PostureGuard" target="_blank" rel="noopener">
      <h4>PostureGuard</h4>
      <p>Open-source posture-monitoring project — born from a real back-pain problem.</p>
      <span class="tag">Open Source</span>
    </a>
  </div>
  <p style="margin-top:18px"><a href="https://github.com/christiantobin" target="_blank" rel="noopener" style="color:var(--teal);font-weight:600">See all on GitHub →</a></p>
</section>
```

- [ ] **Step 2: Append featured-card styles to `styles.css`**

```css
.card.featured {
  display: block; position: relative; margin-bottom: 14px;
  background: linear-gradient(135deg, var(--surface) 0%, #142028 100%);
  border-color: var(--teal);
  box-shadow: 0 0 0 1px rgba(94,234,212,.15), 0 8px 28px rgba(0,0,0,.35);
}
.card.featured h4 { font-size: 1.15rem; }
.featured-flag {
  display: inline-block; font-size: .7rem; font-weight: 700; letter-spacing: .5px;
  color: var(--bg); background: var(--teal); border-radius: 6px; padding: 2px 8px; margin-bottom: 8px;
}
```

- [ ] **Step 3: Verify**

`browser_click` Portfolio tab, `browser_take_screenshot`. Expected: the **Tobot Agent** featured card spanning the top (teal border, "★ Featured" flag), then six project cards in a responsive grid + "See all on GitHub" link. Hover a card (`browser_hover`) — border turns teal. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: Portfolio panel with pinned Tobot Agent + curated projects"
```

---

## Task 8: Contact panel content

**Files:**
- Modify: `index.html` (fill `#contact`)
- Modify: `styles.css` (append contact styles)

- [ ] **Step 1: Fill the Contact panel markup**

Replace `<section class="panel" id="contact" data-panel="contact"><!-- Task 8 --></section>` with:

```html
<section class="panel" id="contact" data-panel="contact">
  <h3 class="section-title">Get In Touch</h3>
  <div class="section-rule"></div>
  <p class="muted-p" style="margin-top:0">Open to interesting problems in IoT, embedded, and cloud. The fastest way to reach me is email.</p>
  <div class="contact-grid">
    <a class="contact-btn" href="mailto:christian@wirelesseco.com"><span>✉</span> christian@wirelesseco.com</a>
    <a class="contact-btn" href="https://www.linkedin.com/in/christian-tobin-37a6b9169" target="_blank" rel="noopener"><span>in</span> LinkedIn</a>
    <a class="contact-btn" href="https://github.com/christiantobin" target="_blank" rel="noopener"><span>GH</span> GitHub</a>
    <a class="contact-btn" href="https://x.com/christianjtobin" target="_blank" rel="noopener"><span>X</span> @christianjtobin</a>
    <a class="contact-btn" href="https://www.youtube.com/@christiantobin6006" target="_blank" rel="noopener"><span>▶</span> YouTube</a>
    <div class="contact-btn static"><span>📍</span> San Diego, California</div>
  </div>
</section>
```

- [ ] **Step 2: Append contact styles**

```css
.contact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.contact-btn {
  display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 16px; font-weight: 600; transition: border-color .15s, transform .15s;
}
.contact-btn:hover { border-color: var(--teal); transform: translateY(-2px); }
.contact-btn.static { color: var(--muted); cursor: default; }
.contact-btn.static:hover { border-color: var(--border); transform: none; }
.contact-btn span {
  width: 30px; height: 30px; flex-shrink: 0; display: grid; place-items: center;
  background: var(--surface-2); border-radius: 8px; font-size: .8rem; color: var(--teal);
}
```

- [ ] **Step 3: Verify**

`browser_click` Contact tab, `browser_take_screenshot`. Expected: contact buttons grid (email, LinkedIn, GitHub, X, YouTube, location). No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: Contact panel"
```

---

## Task 9: Generate the land-mask asset

**Files:**
- Create: `assets/land-mask.png` (512×256, white = land, black = ocean)

- [ ] **Step 1: Download a public-domain equirectangular land/ocean image and threshold it to a mask**

Primary approach — Python + Pillow. The NASA "Blue Marble" topo/bathymetry is public domain; we download a small version and treat non-blue/bright pixels as land. Simpler and more reliable: use a dedicated land-sea mask. Run:

```bash
python3 - <<'PY'
import urllib.request, io
from PIL import Image
# Public-domain land/ocean mask from Natural Earth (via a Wikimedia raster).
# Equirectangular, white-ish land on dark ocean OR vice-versa; we normalize below.
URL = "https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg"
raw = urllib.request.urlopen(URL, timeout=30).read()
img = Image.open(io.BytesIO(raw)).convert("L").resize((512, 256))
# In this source, land is lighter than ocean. Threshold to pure B/W.
bw = img.point(lambda p: 255 if p > 90 else 0)
bw.convert("L").save("assets/land-mask.png")
print("wrote assets/land-mask.png", bw.size)
PY
```

If that specific URL is unavailable, substitute any equirectangular world map where land differs in brightness from ocean, and adjust the `> 90` threshold so the saved mask clearly shows continents. **Acceptance:** open `assets/land-mask.png` and confirm recognizable continents in white on black.

- [ ] **Step 2: Fallback if no network / Pillow — generate a coarse procedural mask**

Only if Step 1 cannot run. Run:

```bash
python3 - <<'PY'
from PIL import Image, ImageDraw
img = Image.new("L", (512, 256), 0)
d = ImageDraw.Draw(img)
# crude continent blobs (x,y,w,h) in 512x256 equirectangular space
blobs = [(70,60,120,90),(150,150,70,80),(250,40,90,70),(250,120,60,90),
         (300,70,120,80),(380,150,70,40),(120,40,60,40)]
for x,y,w,h in blobs: d.ellipse([x,y,x+w,y+h], fill=255)
img.save("assets/land-mask.png")
print("wrote procedural mask")
PY
```

- [ ] **Step 3: Verify the mask exists and is the right size**

Run: `file assets/land-mask.png` → expect `PNG image data, 512 x 256`. View it (Playwright `browser_navigate` to `http://localhost:8000/assets/land-mask.png`, screenshot) — expect white land shapes on black.

- [ ] **Step 4: Commit**

```bash
git add assets/land-mask.png
git commit -m "chore: add equirectangular land-mask for globe"
```

---

## Task 10: three.js dotted globe module (`globe.js`)

**Files:**
- Create: `globe.js`

- [ ] **Step 1: Write `globe.js`**

three.js is imported from CDN as an ES module (pinned). The module reads the land mask, places a point per land pixel on a sphere, adds a few pulsing arcs, supports drag-to-rotate + idle auto-rotate, and exposes lifecycle controls. It throws/returns a fallback flag if WebGL is unavailable so `app.js` can show a static image.

```js
// globe.js — interactive dotted "connected" globe.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const MASK_SRC = "assets/land-mask.png";
const RADIUS = 1;
// home + hub cities [lat, lng] for connection arcs (San Diego is home)
const HOME = [32.7, -117.2];
const HUBS = [[51.5, -0.12], [35.7, 139.7], [-33.9, 151.2], [1.35, 103.8], [37.77, -122.4]];

function latLngToVec3(lat, lng, r = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (_) { return false; }
}

function sampleLandPoints(img) {
  const W = img.width, H = img.height;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data; // may throw if tainted (see plan note)
  const pts = [];
  const step = 2; // sample density
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const lum = data[(y * W + x) * 4];
      if (lum > 128) {
        const lat = 90 - (y / H) * 180;
        const lng = (x / W) * 360 - 180;
        pts.push(latLngToVec3(lat, lng, RADIUS));
      }
    }
  }
  return pts;
}

export function createGlobe(container) {
  if (!hasWebGL()) return { ok: false, pause() {}, resume() {}, destroy() {} };

  const size = container.clientWidth || 220;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size);
  container.appendChild(renderer.domElement);

  const root = new THREE.Group();
  scene.add(root);

  // faint ocean sphere for depth
  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 0.99, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x0b2a3a, transparent: true, opacity: 0.35 })
  );
  root.add(ocean);

  const arcs = [];
  let running = true, raf = 0;
  let velX = 0.0008, velY = 0.0016; // idle auto-rotate
  let dragging = false, lastX = 0, lastY = 0;

  // --- load mask, build points ---
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    let points;
    try { points = sampleLandPoints(img); }
    catch (e) { console.warn("[globe] mask sampling failed:", e); points = []; }

    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => { arr[i*3]=p.x; arr[i*3+1]=p.y; arr[i*3+2]=p.z; });
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const dots = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x5eead4, size: 0.025, sizeAttenuation: true })
    );
    root.add(dots);

    // connection arcs from home to hubs
    HUBS.forEach((hub, i) => {
      const a = latLngToVec3(HOME[0], HOME[1]);
      const b = latLngToVec3(hub[0], hub[1]);
      const mid = a.clone().add(b).multiplyScalar(0.5).setLength(RADIUS * 1.35);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const cg = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
      const cm = new THREE.LineBasicMaterial({
        color: i % 2 ? 0x2563eb : 0x5eead4, transparent: true, opacity: 0.5,
      });
      const line = new THREE.Line(cg, cm);
      line.userData.phase = i;
      root.add(line);
      arcs.push(line);
    });
  };
  img.onerror = () => console.warn("[globe] land mask failed to load");
  img.src = MASK_SRC;

  // --- interaction ---
  const el = renderer.domElement;
  el.style.cursor = "grab";
  function onDown(e) { dragging = true; el.style.cursor = "grabbing"; lastX = e.clientX; lastY = e.clientY; }
  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.005; velX = dy * 0.005;
    root.rotation.y += velY; root.rotation.x += velX;
  }
  function onUp() { dragging = false; el.style.cursor = "grab"; }
  el.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);

  // --- render loop ---
  let t = 0;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    t += 0.016;
    if (!dragging) {
      // ease back toward gentle idle spin
      velY += (0.0016 - velY) * 0.02;
      velX += (0.0 - velX) * 0.04;
      root.rotation.y += velY;
      root.rotation.x += velX;
    }
    // pulse arcs
    arcs.forEach((ln, i) => { ln.material.opacity = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.5 + i)); });
    renderer.render(scene, camera);
  }
  frame();

  function pause() { if (running) { running = false; cancelAnimationFrame(raf); } }
  function resume() { if (!running) { running = true; frame(); } }
  function destroy() {
    pause();
    el.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    renderer.dispose();
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  return { ok: true, pause, resume, destroy };
}
```

- [ ] **Step 2: Sanity-check the math helper in isolation**

Run in Playwright via `browser_evaluate` after navigating to a page that imports the module — or quick Node check. Inline check: north pole (lat 90) should map to ≈ (0, 1, 0). Add this temporary assertion at the end of Step 3's wiring and confirm in console, then remove. (Verified properly in Task 11.)

- [ ] **Step 3: Commit**

```bash
git add globe.js
git commit -m "feat: three.js dotted connected globe module"
```

---

## Task 11: Wire the globe into the hero + lifecycle + fallback

**Files:**
- Modify: `app.js` (import and mount globe, observers)
- Modify: `styles.css` (fallback image style)

- [ ] **Step 1: Append globe wiring to `app.js`**

Add to the end of `app.js`:

```js
// --- globe mount + lifecycle ---
import { createGlobe } from "./globe.js";

const globeEl = document.getElementById("globe");
let globe = null;

function mountGlobe() {
  if (!globeEl) return;
  try {
    globe = createGlobe(globeEl);
  } catch (e) {
    console.warn("[app] globe init failed:", e);
    globe = null;
  }
  if (!globe || !globe.ok) showGlobeFallback();
}

function showGlobeFallback() {
  globeEl.innerHTML =
    '<div class="globe-fallback" role="img" aria-label="Stylized globe"></div>';
}

// pause when tab hidden
document.addEventListener("visibilitychange", () => {
  if (!globe || !globe.ok) return;
  if (document.hidden) globe.pause(); else globe.resume();
});

// pause when scrolled offscreen
if (globeEl && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    if (!globe || !globe.ok) return;
    entries.forEach((en) => (en.isIntersecting ? globe.resume() : globe.pause()));
  }, { threshold: 0.05 });
  io.observe(globeEl);
}

mountGlobe();
```

Note: ES module `import` statements are hoisted, so placing the `import` here is valid; it executes with the other imports at module load.

- [ ] **Step 2: Add fallback style to `styles.css`**

```css
.globe-fallback {
  width: 100%; height: 100%; border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #1e5fa8, #0d3a6b 60%, #06203f 100%);
  box-shadow: 0 0 28px rgba(94,234,212,.3), inset -10px -8px 26px rgba(0,0,0,.6);
}
```

- [ ] **Step 3: Verify the globe renders and is interactive**

Reload `http://localhost:8000`. Expected in `browser_take_screenshot`: a teal dotted globe in the hero. `browser_console_messages`: no errors; specifically **no canvas-tainted `getImageData` SecurityError** (confirms serving over HTTP works). Drag across the globe with Playwright (`browser_drag` over the canvas) and screenshot — rotation visibly changes.

- [ ] **Step 4: Verify pixel-math correctness**

`browser_evaluate`:
```js
const m = await import('./globe.js');
// re-expose helper via a tiny probe is overkill; instead assert visually that
// continents are upright and recognizable in the screenshot from Step 3.
'ok'
```
Acceptance: in the Step 3 screenshot the dotted continents read as Earth (not mirrored upside-down). If upside-down/mirrored, fix sign in `latLngToVec3` and re-verify.

- [ ] **Step 5: Verify fallback path**

In Playwright, emulate no-WebGL by `browser_evaluate` temporarily overriding (or simply trust the `hasWebGL` guard) — at minimum confirm `showGlobeFallback` CSS renders by manually setting `globeEl.innerHTML`. Expected: a glossy gradient globe placeholder, no errors.

- [ ] **Step 6: Commit**

```bash
git add app.js styles.css
git commit -m "feat: mount globe in hero with lifecycle + WebGL fallback"
```

---

## Task 12: Responsive + cross-tab final verification

**Files:** none (verification only; fix CSS if issues found)

- [ ] **Step 1: Desktop full pass**

Serve and `browser_navigate` to `http://localhost:8000`. For each tab (about, resume, portfolio, contact): `browser_click` and `browser_take_screenshot`. Expected: each renders cleanly, globe stays in hero, no console errors anywhere (`browser_console_messages`).

- [ ] **Step 2: Mobile layout pass**

`browser_resize` to 390×800. Reload. Expected: sidebar stacks above hero, hero text centers, globe centered and ~200px, tabs wrap, cards become single/again-fit columns. Screenshot each tab. Fix any overflow in `styles.css` media queries if found, then re-verify and commit the fix.

- [ ] **Step 3: Deep-link + hash pass**

`browser_navigate` to `http://localhost:8000/#resume` and `…/#contact`. Expected: correct tab active on load each time.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: responsive polish for portfolio" || echo "no fixes needed"
```

---

## Task 13: README + finalize

**Files:**
- Modify (replace): `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
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
```

- [ ] **Step 2: Final verification that the site still loads clean**

`browser_navigate` to `http://localhost:8000`, confirm About tab + globe render, `browser_console_messages` shows no errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for vCard portfolio"
```

- [ ] **Step 4: Stop the dev server**

```bash
kill %1 2>/dev/null || pkill -f "http.server 8000" || true
```

---

## Self-Review Notes (author)

- **Spec coverage:** vCard layout (T1–T3), dark theme (T2), dotted globe + arcs + drag + auto-rotate (T9–T11), tabs with hash (T4), About+portrait+what-I-do (T5), Resume high-level+skills (T6), Portfolio 6 GitHub projects (T7), Contact (T8), both photos used (T0/T3/T5), archive old files (T0), WebGL fallback (T11), responsive (T2/T12), README (T13). All spec sections mapped.
- **Naming consistency:** globe module exports `createGlobe(container)` returning `{ ok, pause, resume, destroy }`; `app.js` consumes exactly those. Tab data attributes `data-tab` / `data-panel` and the `VALID` list match the HTML in T1.
- **No placeholders:** every code step contains full content; the only intentional flexibility is the land-mask source URL/threshold in T9, which has an explicit acceptance check and a self-contained procedural fallback.
```
