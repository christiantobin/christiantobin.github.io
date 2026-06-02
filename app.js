// app.js — tab switching with location.hash sync.
// Globe wiring is added in Task 11.

const VALID = ["about", "resume", "portfolio", "contact"];

function activate(name) {
  if (!VALID.includes(name)) name = "about";
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("is-active", t.dataset.tab === name);
    t.setAttribute("aria-selected", t.dataset.tab === name ? "true" : "false");
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

// --- globe mount + lifecycle ---
const globeEl = document.getElementById("globe");
let globe = null;

async function mountGlobe() {
  if (!globeEl) return;
  try {
    const { createGlobe } = await import("./globe.js");
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
