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
