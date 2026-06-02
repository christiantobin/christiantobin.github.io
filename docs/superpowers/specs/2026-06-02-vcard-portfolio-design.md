# Design: Christian Tobin — vCard Portfolio with 3D Globe

**Date:** 2026-06-02
**Status:** Approved pending user review

## Goal

Replace the existing interactive bash-simulator portfolio (which confuses recruiters
and non-technical visitors) with a clean, single-page portfolio that is immediately
legible *and* memorable. The site should impress technical peers and read clearly to
non-technical recruiters at the same time.

## Constraints

- **Plain HTML / CSS / JS only**, plus three.js via CDN for the 3D element. No
  build step, no framework — matches the owner's stated ethos ("No overly-complex
  frameworks").
- Single page, fully static, deployable on **GitHub Pages** (the repo is
  `christiantobin.github.io`).
- Must look good and stay performant on mobile.

## Visual Direction

- **Layout:** vCard style — a fixed/sticky **sidebar profile card** on the left, a
  **main content panel** with tabbed navigation on the right.
- **Theme:** Dark "space" aesthetic. Deep navy/black background, GitHub-dark surfaces
  (`#0d1117` page, `#161b22` cards, `#21262d` borders), with **teal `#5eead4`** and
  **electric-blue `#2563eb`** accents.
- **Signature element:** an interactive **dotted "connected" globe** rendered in
  three.js — continents drawn as glowing points, with pulsing great-circle arcs
  linking cities to evoke a connected IoT network. Auto-rotates when idle, drag to
  spin.

## Page Structure

```
┌───────────────────────────────────────────────────────────┐
│  SIDEBAR (sticky)        │  MAIN PANEL                      │
│  ┌────────────────┐      │  ┌─────────────────────────────┐ │
│  │  [headshot]    │      │  │  HERO                       │ │
│  │  Christian     │      │  │  Christian Tobin   [GLOBE]  │ │
│  │  Tobin         │      │  │  Software Engineer  (3D,    │ │
│  │  [SW Engineer] │      │  │  IoT & Embedded     drag-   │ │
│  │  ────────────  │      │  │  + tagline          able)   │ │
│  │  ✉ email       │      │  └─────────────────────────────┘ │
│  │  📍 San Diego  │      │  [ About | Resume | Portfolio |  │
│  │  in  x  ▶      │      │    Contact ]   (sticky tab bar)  │
│  └────────────────┘      │  ┌─────────────────────────────┐ │
│                          │  │  active tab content          │ │
│                          │  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

- **Responsive:** below ~860px the sidebar stacks above the main panel, tabs wrap,
  the globe scales down. The globe pauses rendering when the document is hidden
  (`visibilitychange`) or scrolled fully offscreen (IntersectionObserver) to save
  battery/CPU.
- **Tab switching** is client-side only (show/hide sections), no page reload, no
  routing library. Active tab persists via `location.hash` so deep links work
  (e.g. `#portfolio`).

## Content

Sourced from the GitHub profile (github.com/christiantobin) and provided photos.

### Sidebar profile card
- **Avatar:** the headshot photo (`download.jfif`, actually a PNG).
- **Name:** Christian Tobin
- **Badge:** Software Engineer
- **Contacts:** email (mailto), location "San Diego, California", social links —
  LinkedIn (`in/christian-tobin-37a6b9169`), X (`@christianjtobin`),
  YouTube (`@christiantobin6006`).

### Hero
- Name, title "Software Engineer · IoT & Embedded Systems", one-line tagline
  ("Building scalable cloud solutions at the intersection of hardware and software").
- The interactive globe sits beside/above the text depending on width.

### About tab
- Bio paragraph (from profile).
- The full-body photo (`Image from iOS.jpg`) used as a portrait alongside the bio.
- "What I do" cards: **Embedded Systems** (Zephyr RTOS, C/C++), **Cloud / AWS**
  (IoT Core, Lambda, DynamoDB, API Gateway), **IoT & Edge**, **AI / ML**
  (Bedrock, SageMaker).
- Short "beyond code" line: running, mixed martial arts, photography, video editing.
- Optional flourish: the "When in doubt, cout<<" quote as a small accent.

### Resume tab
**High-level, no dates** (per owner's choice — clean and maintenance-free).
- **Experience:** Software Engineer, IoT & Embedded — Fluidra North America.
- **Education:** Georgia Tech · California State University San Marcos.
- **Certifications:** AWS Certified Solutions Architect.
- **Skills grid** by category:
  - Languages: C++, Swift, Python, TypeScript, Rust
  - Cloud (AWS): Lambda, IoT Core, DynamoDB, S3, API Gateway, SageMaker, Bedrock,
    EC2, Cognito, CDK
  - Embedded: Zephyr RTOS, Arduino, embedded C/C++
  - Tools: Neovim, Git, CMake, Jest, npm

### Portfolio tab
Auto-curated from public GitHub repos. Featured project cards (title, blurb, language
tag, GitHub link):
1. **NovuSelfHostedCDKApp** — Self-hosted Novu notification infrastructure on AWS
   (ECS, RDS, S3) via CDK. *TypeScript*
2. **AWS-Hosted-LLM-Endpoint** — Host a HuggingFace LLM on AWS SageMaker + API
   Gateway with CDK. *TypeScript*
3. **universal-serverless-scheduler** — Serverless scheduling primitive. *TypeScript*
4. **nextjs-apis-mongodb-cdkv2-construct** — Next.js on AWS with Lambda + DocumentDB,
   packaged as a reusable CDK construct. *TypeScript*
5. **branch-to-be** — CLI that generates the would-be branch state if all open PRs
   were merged. *TypeScript*
6. **PostureGuard** — Open-source posture-monitoring project.

A "See all on GitHub →" link points to the profile.

### Contact tab
- Email (mailto link), San Diego location, and the social links repeated as larger
  buttons. No backend/form (static site) — direct links only.

## Components / Files

| File | Responsibility |
|------|----------------|
| `index.html` | Markup: sidebar card, hero, tab nav, four tab sections. |
| `styles.css` | All styling, dark theme, responsive layout. |
| `app.js` | Tab switching + `location.hash` sync; globe pause/resume observers. |
| `globe.js` | three.js dotted globe: point-cloud continents, pulsing arcs, drag-to-rotate, idle auto-rotate. |
| `assets/` | `avatar.png` (headshot), `portrait.jpg` (full body). |

Each unit has one clear job and a narrow interface: `globe.js` exposes a single
init function taking a canvas/container element and returns `{ pause, resume }`;
`app.js` owns only tab state and wiring. They don't share globals beyond the DOM.

### three.js globe approach
- Sphere of `THREE.Points`. Land points generated by sampling a small bundled
  low-resolution equirectangular **land-mask image** (a few KB, e.g. 512×256) on
  load: opaque/white pixels → place a dot, converted lat/long → 3D position. This
  gives accurate continent shapes without a large/photographic texture.
- A handful of animated great-circle **arcs** between fixed city coordinates
  (San Diego as the home node + a few global hubs), with a traveling pulse.
- Additive blending for glow. `OrbitControls` (or a ~30-line custom drag handler)
  for rotate-only interaction; zoom/pan disabled. Auto-rotate resumes after idle.
- three.js loaded from CDN (pinned version) with a graceful fallback: if WebGL or
  the CDN is unavailable, show a static styled globe image/CSS so the hero never
  looks broken.

## Repo cleanup

Old bash-simulator assets are preserved, not deleted:
- Move `scene.js`, `script.js`, `webgl-test.html`, and `dir/` into a new
  `archive/` folder.
- Replace `index.html` and `styles.css` with the new versions.
- Update `README.md` to describe the new portfolio.

## Out of Scope (YAGNI)

- No contact form / backend.
- No CMS or dynamic GitHub fetch at runtime — project cards are hand-curated at
  build time (static).
- No analytics, no blog tab, no light-mode toggle (can add later if wanted).

## Testing / Verification

- Manual: open `index.html` locally, verify all four tabs switch, hash deep-links
  work, globe renders and drags, WebGL-off fallback shows.
- Responsive: check sidebar-stacks layout at mobile width.
- Cross-check that both photos load and no console errors.
