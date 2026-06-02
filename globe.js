// globe.js — interactive dotted "connected" globe with city hotspots,
// animated flight-path pulses, and hover labels.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const MASK_SRC = "assets/land-mask.png";
const RADIUS = 1;

// ── EDIT ME ──────────────────────────────────────────────────────────────
// Home base + the cities to feature. Replace destinations with your real list;
// flight arcs are drawn from `home` to each destination. lat/lng in degrees.
const HOME = { name: "San Diego", lat: 32.7157, lng: -117.1611 };
const CITIES = [
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Austin",        lat: 30.2672, lng: -97.7431 },
  { name: "New York",      lat: 40.7128, lng: -74.006 },
  { name: "London",        lat: 51.5074, lng: -0.1278 },
  { name: "Tokyo",         lat: 35.6762, lng: 139.6503 },
];
// ─────────────────────────────────────────────────────────────────────────

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
  container.style.position = "relative";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size);
  container.appendChild(renderer.domElement);
  const el = renderer.domElement;

  // hover label overlay
  const label = document.createElement("div");
  label.className = "globe-label";
  label.style.opacity = "0";
  container.appendChild(label);

  const root = new THREE.Group();
  scene.add(root);

  function onResize() {
    const s = container.clientWidth || size;
    renderer.setSize(s, s);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  // faint ocean sphere for depth
  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 0.99, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x0b2a3a, transparent: true, opacity: 0.35 })
  );
  root.add(ocean);

  const arcs = [];      // { pulse, curve, line, phase }
  const markers = [];   // marker meshes (raycast targets), userData.name set
  let running = true, raf = 0;
  let velX = 0.0008, velY = 0.0016; // idle auto-rotate
  let dragging = false, lastX = 0, lastY = 0;

  // shared marker geometries/materials (warm colors pop against the teal globe)
  const markerGeo = new THREE.SphereGeometry(0.03, 14, 14);
  const homeMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b });   // home = coral
  const cityMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });   // cities = amber
  const pulseGeo = new THREE.SphereGeometry(0.016, 8, 8);

  function addMarker(city, isHome) {
    const m = new THREE.Mesh(markerGeo, isHome ? homeMat : cityMat);
    m.position.copy(latLngToVec3(city.lat, city.lng, RADIUS * 1.012));
    m.userData = { name: city.name, base: m.position.clone(), home: isHome };
    root.add(m);
    markers.push(m);
    return m;
  }

  // --- load mask, build points + markers + arcs ---
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

    // markers: home + each city
    addMarker(HOME, true);
    CITIES.forEach((c) => addMarker(c, false));

    // flight-path arcs from home to each city, each with a traveling pulse
    const home3 = latLngToVec3(HOME.lat, HOME.lng);
    CITIES.forEach((city, i) => {
      const b = latLngToVec3(city.lat, city.lng);
      const mid = home3.clone().add(b).multiplyScalar(0.5).setLength(RADIUS * 1.35);
      const curve = new THREE.QuadraticBezierCurve3(home3.clone(), mid, b);
      const cg = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      const cm = new THREE.LineBasicMaterial({
        color: i % 2 ? 0x2563eb : 0x5eead4, transparent: true, opacity: 0.4,
      });
      const line = new THREE.Line(cg, cm);
      root.add(line);

      const pulse = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      root.add(pulse);

      arcs.push({ line, curve, pulse, phase: i / CITIES.length });
    });
  };
  img.onerror = () => console.warn("[globe] land mask failed to load");
  img.src = MASK_SRC;

  // --- drag to rotate ---
  el.style.cursor = "grab";
  function onDown(e) { dragging = true; el.style.cursor = "grabbing"; lastX = e.clientX; lastY = e.clientY; }
  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.005; velX = dy * 0.005;
    root.rotation.y += velY; root.rotation.x += velX;
    root.rotation.x = Math.max(-1.2, Math.min(1.2, root.rotation.x));
  }
  function onUp() { dragging = false; el.style.cursor = "grab"; }
  el.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);

  // --- hover to label cities ---
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  function onHover(e) {
    if (dragging) { hovered = null; return; }
    const rect = el.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(markers, false);
    hovered = hits.length ? hits[0].object : null;
    el.style.cursor = hovered ? "pointer" : (dragging ? "grabbing" : "grab");
  }
  function onLeave() { hovered = null; }
  el.addEventListener("pointermove", onHover);
  el.addEventListener("pointerleave", onLeave);

  // project a world position to container-local pixels
  const tmp = new THREE.Vector3();
  function updateLabel() {
    if (!hovered) { label.style.opacity = "0"; return; }
    hovered.getWorldPosition(tmp);
    // hide if the marker is on the far side of the globe (facing away from camera)
    if (tmp.z < -0.05) { label.style.opacity = "0"; return; }
    const w = el.clientWidth, h = el.clientHeight;
    const p = tmp.clone().project(camera);
    const x = (p.x * 0.5 + 0.5) * w;
    const y = (-p.y * 0.5 + 0.5) * h;
    label.textContent = hovered.userData.name;
    label.style.left = x + "px";
    label.style.top = y + "px";
    label.style.opacity = "1";
  }

  // --- render loop ---
  let t = 0;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    t += 0.016;
    if (!dragging) {
      velY += (0.0016 - velY) * 0.02;
      velX += (0.0 - velX) * 0.04;
      root.rotation.y += velY;
      root.rotation.x += velX;
      root.rotation.x = Math.max(-1.2, Math.min(1.2, root.rotation.x));
    }
    // pulsing hotspot markers
    markers.forEach((m, i) => {
      const s = 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2 + i));
      m.scale.setScalar(s);
    });
    // animate flight pulses along their arcs + breathe arc opacity
    arcs.forEach((a, i) => {
      const u = (t * 0.12 + a.phase) % 1;
      a.curve.getPoint(u, a.pulse.position);
      a.line.material.opacity = 0.22 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.5 + i));
    });
    updateLabel();
    renderer.render(scene, camera);
  }
  frame();

  function pause() { if (running) { running = false; cancelAnimationFrame(raf); } }
  function resume() { if (!running) { running = true; frame(); } }
  function destroy() {
    pause();
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onHover);
    el.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("resize", onResize);
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    renderer.dispose();
    if (label.parentNode) label.parentNode.removeChild(label);
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  return { ok: true, pause, resume, destroy };
}
