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
