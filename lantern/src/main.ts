import './styles.css';
import type { Pt } from './calc/homography';
import {
  cellLines, cols, corners, foldedCells, gridLines, isCornersOnly, meshFromCorners, nearestPoint, parseMesh, pixelsPerCm, pointAt, rows, screenToTable,
  spacing, tablePointAt, tableToScreen, triangulate, withPoint, withSize, withSpacing, type Mesh,
} from './calc/mesh';
import { centred, flippedAcross, flippedDown, moved, pageCorners, parsePlacement, rotated, tableToPage, type PageSize, type Placement } from './calc/placement';
import { openFile, type Opened } from './document';
import { card } from '../../calibration/card.mjs';
import { CameraPanel, defaultCameraSetup, parseCameraSetup, type CameraSetup } from './camera';
import { Renderer } from './render';
import { CM_PER_IN, formatLength, inputText, parseLength, type Unit } from './units';

const STORAGE_KEY = 'lantern.v1';

interface ScreenInfo {
  w: number;
  h: number;
  dpr: number;
  full: boolean;
}

interface Calibration {
  name: string;
  mesh: Mesh;
  /** The window the mesh was made in, so a different one can be pointed out. */
  screen: ScreenInfo | null;
  /** The webcam over this table, if one is used. */
  camera: CameraSetup;
}

interface State {
  mode: 'calibrate' | 'project';
  unit: Unit;
  calibrations: Calibration[];
  current: number;
  placement: Placement | null;
  invert: boolean;
  weight: number;
  showGrid: boolean;
  showOutline: boolean;
  barHidden: boolean;
}

// ---------- state

function screenInfo(): ScreenInfo {
  return { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1, full: !!document.fullscreenElement };
}

/** A fresh table that fills most of the window: 90 × 60 cm, or 36 × 24 in. */
function freshCalibration(name: string, unit: Unit): Calibration {
  const w = unit === 'in' ? 36 * CM_PER_IN : 90;
  const h = unit === 'in' ? 24 * CM_PER_IN : 60;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const mx = W * 0.1;
  const my = H * 0.18;
  const mesh = meshFromCorners(w, h, [
    { x: mx, y: my },
    { x: W - mx, y: my },
    { x: W - mx, y: H - my },
    { x: mx, y: H - my },
  ]);
  return { name, mesh, screen: null, camera: defaultCameraSetup() };
}

function load(): State {
  const fallback: State = {
    mode: 'calibrate',
    unit: 'cm',
    calibrations: [],
    current: 0,
    placement: null,
    invert: false,
    weight: 0,
    showGrid: false,
    showOutline: true,
    barHidden: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<State>;
    const calibrations: Calibration[] = [];
    if (Array.isArray(p.calibrations)) {
      for (const c of p.calibrations as Array<Partial<Calibration>>) {
        const mesh = parseMesh(c?.mesh);
        if (mesh && typeof c.name === 'string') calibrations.push({ name: c.name, mesh, screen: c.screen && typeof c.screen.w === 'number' ? c.screen : null, camera: parseCameraSetup(c.camera) });
      }
    }
    return {
      mode: p.mode === 'project' ? 'project' : 'calibrate',
      unit: p.unit === 'in' ? 'in' : 'cm',
      calibrations,
      current: typeof p.current === 'number' && p.current >= 0 && p.current < calibrations.length ? p.current : 0,
      placement: parsePlacement(p.placement),
      invert: !!p.invert,
      weight: typeof p.weight === 'number' ? Math.max(0, Math.min(2, Math.round(p.weight))) : 0,
      showGrid: !!p.showGrid,
      showOutline: p.showOutline !== false,
      barHidden: false,
    };
  } catch {
    return fallback;
  }
}

let saveTimer = 0;
function save(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private window or blocked storage: the page still works */
    }
  }, 150);
}

const state = load();
if (state.calibrations.length === 0) state.calibrations.push(freshCalibration('Table', state.unit));

const cal = (): Calibration => state.calibrations[state.current] ?? state.calibrations[0]!;
const mesh = (): Mesh => cal().mesh;
function setMesh(m: Mesh, touched = true): void {
  const c = cal();
  c.mesh = m;
  if (touched) c.screen = screenInfo();
  meshDirty = true;
  save();
  redraw();
}

// Document
let doc: Opened | null = null;
let page = 1;
let pageSize: PageSize | null = null;
let pageCanvas: HTMLCanvasElement | null = null;
let renderToken = 0;

// Calibration interaction
let selected: { i: number; j: number } | null = { i: 0, j: 0 };
let cameraPanel: CameraPanel | null = null;
let dragging: { kind: 'point'; i: number; j: number; dx: number; dy: number } | { kind: 'pattern'; last: Pt } | null = null;
let meshDirty = true;

// ---------- DOM helpers

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Array<Node | string | null | undefined | false>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') e.className = String(v);
    else if (k === 'text') e.textContent = String(v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}
function btn(label: string, attrs: Attrs, key?: string): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'btn', ...attrs }, label);
  if (key) b.append(' ', el('kbd', { text: key }));
  return b;
}

// ---------- the page

const app = document.getElementById('app')!;
const glCanvas = el('canvas', { id: 'gl', 'aria-hidden': 'true' });
const overlay = el('canvas', { id: 'overlay', 'aria-hidden': 'true' });
const stage = el('div', { class: 'stage', id: 'stage' }, glCanvas, overlay);
const bar = el('header', { class: 'bar', id: 'bar' });
const peek = el('button', { type: 'button', class: 'peek', id: 'peek', hidden: true, onclick: () => setBarHidden(false) }, 'Show tools (H)');
const popHost = el('div', { id: 'pop' });
const welcome = el('div', { class: 'welcome', id: 'welcome', hidden: true });
const toast = el('div', { class: 'toast', id: 'toast', role: 'status', hidden: true });
app.append(stage, bar, peek, popHost, welcome, toast);

let renderer: Renderer | null = null;
try {
  renderer = new Renderer(glCanvas);
} catch (e) {
  showToast((e as Error).message, 0);
}

const overlayCtx = overlay.getContext('2d')!;

let toastTimer = 0;
function showToast(text: string, ms = 4000): void {
  toast.textContent = text;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  if (ms) toastTimer = window.setTimeout(() => (toast.hidden = true), ms);
}

// ---------- the toolbar

function fmtCm(cm: number): string {
  return formatLength(cm, state.unit, { decimals: 1 });
}
function coords(p: Pt): string {
  return `${inputText(p.x, state.unit)} × ${inputText(p.y, state.unit)} ${state.unit}`;
}

function buildBar(): void {
  bar.replaceChildren();
  const m = mesh();
  const brand = el('div', { class: 'brand' });
  brand.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#2f6f8f"/><path d="M24 20h16l12 30H12z" fill="#f1f1ec" opacity=".35"/><rect x="22" y="12" width="20" height="11" rx="3" fill="#f1f1ec"/><circle cx="32" cy="17.5" r="3" fill="#2f6f8f"/><path d="M16 50h32" stroke="#f1f1ec" stroke-width="3" stroke-linecap="round"/></svg>`;
  brand.append(el('div', {}, el('h1', { text: 'Lantern' }), el('small', { text: `v${__LANTERN_VERSION__}` })));

  const tabs = el(
    'div',
    { class: 'tabs', role: 'tablist' },
    el('button', { type: 'button', id: 'tab-calibrate', 'aria-pressed': String(state.mode === 'calibrate'), onclick: () => setMode('calibrate') }, 'Calibrate'),
    el('button', { type: 'button', id: 'tab-project', 'aria-pressed': String(state.mode === 'project'), onclick: () => setMode('project') }, 'Project'),
  );

  // Which table, and the unit
  const calSelect = el('select', { id: 'cal-select', 'aria-label': 'Calibration', onchange: () => switchCalibration(calSelect.selectedIndex) });
  state.calibrations.forEach((c, i) => calSelect.append(el('option', { value: String(i), selected: i === state.current }, c.name)));
  const units = el(
    'div',
    { class: 'units', role: 'group', 'aria-label': 'Units' },
    el('button', { type: 'button', id: 'unit-cm', 'aria-pressed': String(state.unit === 'cm'), onclick: () => setUnit('cm') }, 'cm'),
    el('button', { type: 'button', id: 'unit-in', 'aria-pressed': String(state.unit === 'in'), onclick: () => setUnit('in') }, 'in'),
  );
  bar.append(brand, tabs, el('div', { class: 'group' }, el('label', {}, 'Table', calSelect), units));

  if (state.mode === 'calibrate') {
    const widthBox = el('input', { type: 'text', id: 'table-width', inputmode: 'decimal', value: inputText(m.width, state.unit), 'aria-label': 'Table width' });
    const heightBox = el('input', { type: 'text', id: 'table-height', inputmode: 'decimal', value: inputText(m.height, state.unit), 'aria-label': 'Table height' });
    const onSize = () => {
      const w = parseLength(widthBox.value, state.unit);
      const h = parseLength(heightBox.value, state.unit);
      widthBox.setAttribute('aria-invalid', String(!(w && w > 0)));
      heightBox.setAttribute('aria-invalid', String(!(h && h > 0)));
      if (w && h && w > 0 && h > 0 && (w !== mesh().width || h !== mesh().height)) {
        setMesh(withSize(mesh(), w, h));
        selected = { i: 0, j: 0 };
        refreshSpacing();
      }
    };
    widthBox.addEventListener('change', onSize);
    heightBox.addEventListener('change', onSize);
    const sizeGroup = el('div', { class: 'group' }, el('label', {}, 'Size', widthBox, '×', heightBox, el('span', { text: state.unit })));

    // Points every so many centimetres or inches from the top-left corner, so each lands on a mat line.
    const defaultStep = state.unit === 'in' ? 6 * CM_PER_IN : 15;
    const stepBox = el('input', { type: 'text', id: 'spacing', inputmode: 'decimal', value: spacing(m) === null ? '' : inputText(spacing(m), state.unit), placeholder: inputText(defaultStep, state.unit), 'aria-label': 'Space between points' });
    const count = el('small', { id: 'points' });
    const refreshSpacing = () => {
      const mm = mesh();
      count.textContent = isCornersOnly(mm) ? 'corners only' : `${mm.xs.length} × ${mm.ys.length} points`;
      const addOrReset = document.getElementById('add-points') ?? document.getElementById('reset-corners');
      if (addOrReset && (addOrReset.id === 'add-points') !== isCornersOnly(mm)) buildBar();
    };
    const applyStep = (step: number) => {
      setMesh(withSpacing(mesh(), step), false);
      selected = { i: 0, j: 0 };
      refreshSpacing();
    };
    stepBox.addEventListener('change', () => {
      const step = stepBox.value.trim() === '' ? 0 : parseLength(stepBox.value, state.unit);
      stepBox.setAttribute('aria-invalid', String(step === null || step < 0));
      if (step !== null && step >= 0) applyStep(step);
    });
    refreshSpacing();
    const pointsGroup = el(
      'div',
      { class: 'group' },
      el('label', { title: 'Points this far apart, counted from the top-left corner; the last cell takes what is left' }, 'Points every', stepBox, el('span', { text: state.unit }), count),
      isCornersOnly(m)
        ? btn('Add points', { id: 'add-points', class: 'btn primary', title: 'Put a point every 15 cm or 6 in between the corners, to drag where the table is out', onclick: () => { stepBox.value = inputText(defaultStep, state.unit); applyStep(defaultStep); } })
        : btn('Corners only', { id: 'reset-corners', title: 'Forget the inner points and go back to four corners', onclick: () => { stepBox.value = ''; applyStep(0); } }),
    );

    const manage = el(
      'div',
      { class: 'group' },
      btn('New table', { id: 'cal-new', onclick: newCalibration }),
      btn('Delete', { id: 'cal-delete', disabled: state.calibrations.length < 2, onclick: deleteCalibration }),
    );
    const cardGroup = el(
      'div',
      { class: 'group' },
      btn('Project the card', { id: 'project-card', title: 'A calibration card the size of this table, to check the calibration on the mat with a tape', onclick: () => void loadFile(cardFile()) }),
      btn('Save card', { id: 'save-card', title: 'The same card as an SVG, for Pattern Projector or to print', onclick: saveCard }),
    );
    const view = el(
      'div',
      { class: 'group' },
      btn('Camera', { id: 'camera', 'aria-pressed': String(!!cameraPanel), title: 'A webcam over the table, zoomed in on the selected point, so you can calibrate sitting down', onclick: toggleCamera }),
      btn('Invert', { id: 'invert', 'aria-pressed': String(state.invert), onclick: () => toggle('invert') }, 'I'),
      btn('Full screen', { id: 'fullscreen', onclick: toggleFullscreen }),
      btn('Hide tools', { id: 'hide', onclick: () => setBarHidden(true) }, 'H'),
      btn('?', { id: 'help', 'aria-label': 'Keys and help', onclick: () => togglePop('help') }),
    );
    const done = el('div', { class: 'group' }, btn('Project →', { id: 'go-project', class: 'btn primary', onclick: () => setMode('project') }));
    bar.append(sizeGroup, pointsGroup, manage, cardGroup, view, el('div', { class: 'spacer' }), done);
    bar.append(el('p', { class: 'hint', id: 'hint' }));
  } else {
    const fileInput = el('input', { type: 'file', id: 'file', accept: '.pdf,.svg,application/pdf,image/svg+xml', hidden: true, onchange: () => fileInput.files?.[0] && loadFile(fileInput.files[0]) });
    const open = el('div', { class: 'group' }, fileInput, btn(doc ? doc.name : 'Open PDF or SVG', { id: 'open', title: 'Or drop a file on the page', onclick: () => fileInput.click() }));
    if (doc && doc.pages > 1) {
      const pageSel = el('select', { id: 'page', 'aria-label': 'Page', onchange: () => { page = pageSel.selectedIndex + 1; renderPage(); } });
      for (let n = 1; n <= doc.pages; n++) pageSel.append(el('option', { value: String(n), selected: n === page }, `Page ${n} of ${doc.pages}`));
      open.append(pageSel);
    }
    if (doc && doc.layers.length) open.append(btn(`Layers (${doc.layers.filter((l) => l.visible).length}/${doc.layers.length})`, { id: 'layers', onclick: () => togglePop('layers') }));

    const degrees = el('input', { type: 'number', id: 'degrees', min: 0, max: 360, step: 1, value: String(state.placement?.rotation ?? 0), 'aria-label': 'Rotation in degrees' });
    degrees.addEventListener('change', () => {
      const d = parseFloat(degrees.value);
      if (Number.isFinite(d) && state.placement) setPlacement({ ...state.placement, rotation: ((d % 360) + 360) % 360 });
    });
    const scale = el('input', { type: 'number', id: 'scale', min: 10, max: 400, step: 0.5, value: String(Math.round((state.placement?.scale ?? 1) * 1000) / 10), 'aria-label': 'Scale percent' });
    scale.addEventListener('change', () => {
      const s = parseFloat(scale.value);
      if (Number.isFinite(s) && s > 0 && state.placement) setPlacement({ ...state.placement, scale: s / 100 });
    });
    const place = el(
      'div',
      { class: 'group' },
      btn('Turn 90°', { id: 'rotate', onclick: () => rotateBy(90) }, 'R'),
      el('label', {}, degrees, '°'),
      btn('Flip ⇋', { id: 'flip-x', title: 'Mirror left to right', onclick: () => state.placement && setPlacement(flippedAcross(state.placement)) }, 'F'),
      btn('Flip ⇵', { id: 'flip-y', title: 'Mirror top to bottom', onclick: () => state.placement && setPlacement(flippedDown(state.placement)) }, 'V'),
      el('label', {}, 'Scale', scale, '%'),
      btn('Recentre', { id: 'recentre', onclick: recentre }, '0'),
    );
    const weightOut = el('output', { id: 'weight', text: String(state.weight) });
    const look = el(
      'div',
      { class: 'group' },
      btn('Invert', { id: 'invert', 'aria-pressed': String(state.invert), onclick: () => toggle('invert') }, 'I'),
      el('label', { title: 'Thicker lines' }, 'Lines', el('div', { class: 'stepper' }, el('button', { type: 'button', id: 'weight-less', 'aria-label': 'Thinner lines', onclick: () => setWeight(state.weight - 1) }, '−'), weightOut, el('button', { type: 'button', id: 'weight-more', 'aria-label': 'Thicker lines', onclick: () => setWeight(state.weight + 1) }, '+'))),
      btn('Grid', { id: 'grid', 'aria-pressed': String(state.showGrid), title: 'Project the calibration grid, to check the grain or the calibration', onclick: () => toggle('showGrid') }, 'G'),
      btn('Outline', { id: 'outline', 'aria-pressed': String(state.showOutline), title: 'Show the page edge', onclick: () => toggle('showOutline') }, 'O'),
    );
    const view = el(
      'div',
      { class: 'group' },
      btn('Full screen', { id: 'fullscreen', onclick: toggleFullscreen }),
      btn('Hide tools', { id: 'hide', onclick: () => setBarHidden(true) }, 'H'),
      btn('?', { id: 'help', 'aria-label': 'Keys and help', onclick: () => togglePop('help') }),
    );
    bar.append(open, place, look, view);
    bar.append(el('p', { class: 'hint', id: 'hint' }));
  }
  refreshHint();
  refreshWelcome();
}

function refreshHint(): void {
  const hint = document.getElementById('hint');
  if (!hint) return;
  const m = mesh();
  const folded = foldedCells(m);
  const info = cal().screen;
  const now = screenInfo();
  const moved = info && (info.w !== now.w || info.h !== now.h || Math.abs(info.dpr - now.dpr) > 0.01 || info.full !== now.full);
  hint.classList.toggle('warn', !!(folded.length || moved));
  if (folded.length) {
    hint.textContent = `A point has been dragged past its neighbour, so the picture would fold there. Move it back.`;
  } else if (moved) {
    hint.textContent = `This table was calibrated in a ${info!.w} × ${info!.h} ${info!.full ? 'full-screen ' : ''}window; this one is ${now.w} × ${now.h}${now.full ? ' full screen' : ''}. Go full screen the same way, or calibrate again.`;
  } else if (state.mode === 'calibrate') {
    hint.textContent =
      isCornersOnly(m)
        ? 'Step 1: go full screen and drag the four corner circles onto the corners of the mat (or a measured rectangle) until the grid lines land on the mat’s lines. Step 2, if the middle is still out: there are no inner points yet, so press Add points, or type how far apart you want them (6 in lands on a mat’s inch lines). Circles appear at the new crossings and drag like the corners. Arrow keys nudge the selected circle; Tab picks the next one along the row, Shift+Tab the next one down; H hides these tools if a corner is under them.'
        : 'Drag each circle until it sits on the mat crossing it is labelled with (the labels are distances from the top-left corner). Where the table dips or the lens bulges, the grid bends to follow. Arrow keys nudge the selected circle (Shift for 10 px, Alt for ¼ px); Tab picks the next one along the row, Shift+Tab the next one down. Points every sets how far apart they are.'
  } else {
    hint.textContent = doc
      ? 'Drag to move the pattern. Arrow keys move it 1 cm (Shift 10 cm, Alt 1 mm). The picture bends with the calibration, so a dip in the table is already allowed for.'
      : 'Open a PDF pattern or an SVG (a Grain-Nest export or a calibration card). It is drawn at true size through the calibration.';
  }
}

function refreshWelcome(): void {
  const show = state.mode === 'project' && !doc;
  welcome.hidden = !show;
  if (!show) return;
  welcome.replaceChildren(
    el('h2', { text: 'Lantern' }),
    el('p', { text: 'Projector cutting with a calibration that bends, so a table with a dip or a lens with a bulge still projects true.' }),
    el(
      'ol',
      {},
      el('li', {}, 'Calibrate once per table: drag the corners onto the mat, then add points and bend the grid to meet the mat’s lines where it is out.'),
      el('li', {}, 'Open a PDF pattern or an SVG. It is drawn at true size through the calibration.'),
      el('li', {}, 'Drag it into place, turn or flip it, hide the tools, cut.'),
    ),
    el('div', { class: 'row' }, btn('Open PDF or SVG', { class: 'btn primary', id: 'welcome-open', onclick: () => (document.getElementById('file') as HTMLInputElement | null)?.click() }), btn('Calibrate first', { id: 'welcome-calibrate', onclick: () => setMode('calibrate') })),
  );
}

// ---------- popovers

let popOpen: 'layers' | 'help' | null = null;
function togglePop(which: 'layers' | 'help'): void {
  popOpen = popOpen === which ? null : which;
  renderPop();
}
function renderPop(): void {
  popHost.replaceChildren();
  if (!popOpen) return;
  const box = el('div', { class: 'pop', id: `pop-${popOpen}`, role: 'dialog' });
  if (popOpen === 'layers' && doc) {
    box.append(el('h2', { text: 'Layers' }), el('p', { text: 'Pattern sizes are usually layers: show the one you are cutting.' }));
    for (const l of doc.layers) {
      const cb = el('input', { type: 'checkbox', checked: l.visible });
      cb.addEventListener('change', () => {
        l.visible = cb.checked;
        renderPage();
        const b = document.getElementById('layers');
        if (b && doc) b.textContent = `Layers (${doc.layers.filter((x) => x.visible).length}/${doc.layers.length})`;
      });
      box.append(el('label', {}, cb, l.name));
    }
    const all = (on: boolean) => {
      if (!doc) return;
      for (const l of doc.layers) l.visible = on;
      renderPage();
      renderPop();
      buildBar();
    };
    box.append(el('div', { class: 'row' }, btn('All on', { onclick: () => all(true) }), btn('All off', { onclick: () => all(false) }), btn('Close', { onclick: () => togglePop('layers') })));
  } else if (popOpen === 'help') {
    box.append(
      el('h2', { text: 'Keys' }),
      el('p', { text: 'With the picture in front of you, not a text box:' }),
      el(
        'ul',
        {},
        el('li', {}, el('kbd', { text: 'C' }), ' calibrate, ', el('kbd', { text: 'P' }), ' project, ', el('kbd', { text: 'H' }), ' hide or show the tools, ', el('kbd', { text: 'Esc' }), ' show them'),
        el('li', {}, el('kbd', { text: '← ↑ → ↓' }), ' nudge the selected point (calibrating) or the pattern (projecting); ', el('kbd', { text: 'Shift' }), ' bigger steps, ', el('kbd', { text: 'Alt' }), ' smaller'),
        el('li', {}, el('kbd', { text: 'Tab' }), ' select the next calibration point along the row, ', el('kbd', { text: 'Shift' }), '+', el('kbd', { text: 'Tab' }), ' the next one down the column; ', el('kbd', { text: '[' }), ' ', el('kbd', { text: ']' }), ' the previous or next'),
        el('li', {}, el('kbd', { text: 'R' }), ' turn 90°, ', el('kbd', { text: ',' }), ' ', el('kbd', { text: '.' }), ' turn 1° either way, ', el('kbd', { text: 'F' }), ' flip left–right, ', el('kbd', { text: 'V' }), ' flip top–bottom, ', el('kbd', { text: '0' }), ' recentre'),
        el('li', {}, el('kbd', { text: 'I' }), ' invert, ', el('kbd', { text: 'G' }), ' grid, ', el('kbd', { text: 'O' }), ' outline, ', el('kbd', { text: '+' }), ' ', el('kbd', { text: '−' }), ' line weight'),
      ),
      el('h2', { text: 'Calibrating from a chair' }),
      el('p', { text: 'Camera opens a webcam over the table (an iPhone on a mount works as a Mac webcam) in a small window. Press Find corners and click the four corner crosses in the picture once; after that the window zooms in on whichever point is selected, so you can nudge it with the arrow keys and move on with [ and ] while watching the mat on screen. The camera needs the page served over https or from localhost.' }),
      el('h2', { text: 'Calibrating with a tape' }),
      el('p', { text: 'No gridded mat, as on a floor? Mark a rectangle of the size in the boxes with tape, drag the corners onto it, then lay a tape measure along each grid line: every point is labelled with its distance from the top-left corner.' }),
      el('p', {}, 'Each table keeps its own calibration; the window size it was made in is remembered, so calibrate in full screen and project in full screen. Lantern ', `v${__LANTERN_VERSION__}`, '.'),
      el('div', { class: 'row' }, btn('Close', { onclick: () => togglePop('help') })),
    );
  }
  popHost.append(box);
}

// ---------- actions

function toggleCamera(): void {
  if (cameraPanel) {
    cameraPanel.close();
    return;
  }
  const panel = new CameraPanel({
    getSetup: () => cal().camera,
    setSetup: (c) => {
      cal().camera = c;
      save();
    },
    screenCorners: () => corners(mesh()),
    selected: () => {
      if (!selected) return null;
      const m = mesh();
      if (selected.i > cols(m) || selected.j > rows(m)) return null;
      return { screen: pointAt(m, selected.i, selected.j), label: coords(tablePointAt(m, selected.i, selected.j)), key: `${selected.i},${selected.j}` };
    },
    onClose: () => {
      cameraPanel = null;
      document.getElementById('camera')?.setAttribute('aria-pressed', 'false');
    },
  });
  cameraPanel = panel;
  app.append(panel.root);
  document.getElementById('camera')?.setAttribute('aria-pressed', 'true');
  void panel.start();
}

function setMode(mode: State['mode']): void {
  if (mode !== 'calibrate') cameraPanel?.close();
  state.mode = mode;
  popOpen = null;
  renderPop();
  save();
  buildBar();
  redraw();
}

function setUnit(unit: Unit): void {
  state.unit = unit;
  save();
  buildBar();
  redraw();
}

function toggle(key: 'invert' | 'showGrid' | 'showOutline'): void {
  state[key] = !state[key];
  save();
  const b = document.getElementById(key === 'invert' ? 'invert' : key === 'showGrid' ? 'grid' : 'outline');
  if (b) b.setAttribute('aria-pressed', String(state[key]));
  redraw();
}

function setWeight(w: number): void {
  state.weight = Math.max(0, Math.min(2, w));
  save();
  const out = document.getElementById('weight');
  if (out) out.textContent = String(state.weight);
  redraw();
}

function setBarHidden(hidden: boolean): void {
  state.barHidden = hidden;
  bar.hidden = hidden;
  peek.hidden = !hidden;
  if (hidden) {
    popOpen = null;
    renderPop();
  }
}

function switchCalibration(i: number): void {
  if (i < 0 || i >= state.calibrations.length) return;
  cameraPanel?.close();
  state.current = i;
  selected = { i: 0, j: 0 };
  meshDirty = true;
  save();
  buildBar();
  redraw();
}

function newCalibration(): void {
  const name = window.prompt('A name for this table (Desk, Floor, …)', `Table ${state.calibrations.length + 1}`);
  if (!name) return;
  state.calibrations.push(freshCalibration(name.trim() || `Table ${state.calibrations.length + 1}`, state.unit));
  switchCalibration(state.calibrations.length - 1);
}

function deleteCalibration(): void {
  if (state.calibrations.length < 2) return;
  if (!window.confirm(`Delete the calibration “${cal().name}”?`)) return;
  state.calibrations.splice(state.current, 1);
  switchCalibration(Math.max(0, state.current - 1));
}

function setPlacement(p: Placement): void {
  state.placement = p;
  save();
  const d = document.getElementById('degrees') as HTMLInputElement | null;
  if (d && document.activeElement !== d) d.value = String(Math.round(p.rotation * 10) / 10);
  const s = document.getElementById('scale') as HTMLInputElement | null;
  if (s && document.activeElement !== s) s.value = String(Math.round(p.scale * 1000) / 10);
  redraw();
}

function rotateBy(deg: number): void {
  if (state.placement) setPlacement(rotated(state.placement, deg));
}

function recentre(): void {
  const m = mesh();
  setPlacement({ ...centred({ width: m.width, height: m.height }), scale: state.placement?.scale ?? 1 });
}

/** A calibration card the size of the current table, with the grid in the current unit. */
function cardFile(): File {
  const m = mesh();
  const label = `${inputText(m.width, state.unit)} × ${inputText(m.height, state.unit)} ${state.unit}`;
  const svg = card({
    width: Math.round(m.width * 10 * 1000) / 1000,
    height: Math.round(m.height * 10 * 1000) / 1000,
    unit: state.unit,
    name: `Calibration card ${label}`,
    purpose: `${cal().name}, from Lantern`,
  });
  const slug = `${inputText(m.width, state.unit)}x${inputText(m.height, state.unit)}${state.unit}`.replace(/\s+/g, '').replace(/\//g, '-');
  return new File([svg], `calibration-card-${slug}.svg`, { type: 'image/svg+xml' });
}

function saveCard(): void {
  const file = cardFile();
  const url = URL.createObjectURL(file);
  const a = el('a', { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Saved ${file.name}`);
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => showToast('Full screen is not allowed here; use the browser’s own full-screen instead.'));
}

async function loadFile(file: File): Promise<void> {
  try {
    showToast(`Opening ${file.name}…`, 0);
    const opened = await openFile(file);
    doc?.close();
    doc = opened;
    page = 1;
    pageCanvas = null;
    if (!state.placement) recentre();
    toast.hidden = true;
    if (state.mode !== 'project') state.mode = 'project';
    buildBar();
    await renderPage();
  } catch (e) {
    showToast(`Could not open ${file.name}: ${(e as Error).message}`);
  }
}

/** Draw the current page at a resolution to suit the calibration, then hand it to the renderer. */
async function renderPage(): Promise<void> {
  if (!doc || !renderer) return;
  const token = ++renderToken;
  const dpr = window.devicePixelRatio || 1;
  const want = Math.max(8, Math.min(48, pixelsPerCm(mesh()) * dpr * 1.5));
  const maxPx = Math.min(renderer.maxTexture, 8192);
  try {
    const r = await doc.render(page, want, maxPx);
    if (token !== renderToken) return;
    pageCanvas = r.canvas;
    pageSize = r.size;
    renderer.setPage(pageCanvas);
    redraw();
  } catch (e) {
    if (token === renderToken) showToast(`Could not draw the page: ${(e as Error).message}`);
  }
}

// ---------- drawing

let frame = 0;
function redraw(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    draw();
  });
}

function draw(): void {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const m = mesh();
  stage.classList.toggle('inverted', state.invert);
  stage.classList.toggle('mode-calibrate', state.mode === 'calibrate');
  stage.classList.toggle('mode-project', state.mode === 'project');

  if (renderer) {
    renderer.resize(W, H, dpr);
    if (meshDirty) {
      renderer.setMesh(triangulate(m, 8));
      meshDirty = false;
    }
    const showPage = state.mode === 'project' && !!doc && !!pageSize && !!pageCanvas && !!state.placement;
    renderer.draw(W, H, {
      show: showPage,
      tableToPage: showPage ? tableToPage(state.placement!, pageSize!) : [1, 0, 0, 0, 1, 0, 0, 0, 1],
      pageSize: pageSize ?? { width: 1, height: 1 },
      invert: state.invert,
      weight: state.weight,
    });
  }

  overlay.width = Math.round(W * dpr);
  overlay.height = Math.round(H * dpr);
  const ctx = overlayCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const ink = state.invert ? '#e8eaec' : '#22272b';
  const accent = state.invert ? '#8fc3dd' : '#2f6f8f';
  const chalk = state.invert ? '#ffd166' : '#b8471f';

  const polyline = (pts: Pt[]) => {
    ctx.beginPath();
    pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  };

  const fineStep = state.unit === 'in' ? CM_PER_IN : 1;
  const mediumEvery = state.unit === 'in' ? 6 * CM_PER_IN : 5;
  const heavyEvery = state.unit === 'in' ? 12 * CM_PER_IN : 10;
  const isMultiple = (v: number, of: number) => Math.abs(v / of - Math.round(v / of)) < 1e-6;

  if (state.mode === 'calibrate' || state.showGrid) {
    const calibrating = state.mode === 'calibrate';
    ctx.lineCap = 'butt';
    for (const line of gridLines(m, fineStep)) {
      const heavy = isMultiple(line.at, heavyEvery);
      const medium = isMultiple(line.at, mediumEvery);
      ctx.strokeStyle = calibrating ? ink : accent;
      ctx.globalAlpha = heavy ? 0.9 : medium ? 0.6 : 0.3;
      ctx.lineWidth = heavy ? 1.5 : 1;
      polyline(line.points);
    }
    ctx.globalAlpha = 1;
    // numbers along the top and left edges every heavy line
    if (calibrating) {
      ctx.fillStyle = ink;
      ctx.font = '12px Atkinson Hyperlegible, sans-serif';
      ctx.textBaseline = 'top';
      for (let v = heavyEvery; v < m.width - 1e-6; v += heavyEvery) {
        const p = tableToScreen(m, { x: v, y: 0 });
        ctx.fillText(inputText(v, state.unit), p.x + 3, p.y + 3);
      }
      for (let v = heavyEvery; v < m.height - 1e-6; v += heavyEvery) {
        const p = tableToScreen(m, { x: 0, y: v });
        ctx.fillText(inputText(v, state.unit), p.x + 3, p.y + 3);
      }
    }
  }

  if (state.mode === 'calibrate') {
    // the mesh's own cell lines, heavier, and the table edge
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    for (const line of cellLines(m)) polyline(line.points);
    ctx.lineWidth = 3;
    for (const line of gridLines(m, Math.max(m.width, m.height))) polyline(line.points);
    // diagonals: on a flat table they are straight
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    const diag = (a: Pt, b: Pt) => {
      const pts: Pt[] = [];
      for (let k = 0; k <= 40; k++) pts.push(tableToScreen(m, { x: a.x + ((b.x - a.x) * k) / 40, y: a.y + ((b.y - a.y) * k) / 40 }));
      polyline(pts);
    };
    diag({ x: 0, y: 0 }, { x: m.width, y: m.height });
    diag({ x: m.width, y: 0 }, { x: 0, y: m.height });
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // handles with their table position
    ctx.font = '12px Atkinson Hyperlegible, sans-serif';
    ctx.textBaseline = 'middle';
    for (let j = 0; j <= rows(m); j++) {
      for (let i = 0; i <= cols(m); i++) {
        const p = pointAt(m, i, j);
        const isSel = !!selected && selected.i === i && selected.j === j;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSel ? 13 : 11, 0, Math.PI * 2);
        // Inverted, the inside of the ring is lit a little so a dot on the mat shows inside it.
        ctx.fillStyle = isSel ? chalk : state.invert ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isSel ? chalk : accent;
        ctx.stroke();
        // the selected point gets long arms, so it is easy to find in a camera picture
        // The arms stop short of the centre, so a mark on the mat sits in a clear hole with the arms pointing at it.
        const arm = isSel ? 40 : 14;
        const gap = isSel ? 8 : 5;
        ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          ctx.moveTo(p.x + dx * gap, p.y + dy * gap);
          ctx.lineTo(p.x + dx * arm, p.y + dy * arm);
        }
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.stroke();
        const label = coords(tablePointAt(m, i, j));
        const right = i < cols(m) / 2;
        const below = j < rows(m) / 2;
        ctx.textAlign = right ? 'left' : 'right';
        const tx = p.x + (right ? 16 : -16);
        const ty = p.y + (below ? 14 : -14);
        const w = ctx.measureText(label).width;
        ctx.fillStyle = state.invert ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
        ctx.fillRect(right ? tx - 2 : tx - w - 2, ty - 8, w + 4, 16);
        ctx.fillStyle = isSel ? chalk : ink;
        ctx.fillText(label, tx, ty);
      }
    }
    ctx.textAlign = 'left';
  }

  if (state.mode === 'project' && state.showOutline && doc && pageSize && state.placement) {
    const c = pageCorners(state.placement, pageSize);
    ctx.strokeStyle = accent;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    const edge = (a: Pt, b: Pt) => {
      const pts: Pt[] = [];
      for (let k = 0; k <= 24; k++) pts.push(tableToScreen(m, { x: a.x + ((b.x - a.x) * k) / 24, y: a.y + ((b.y - a.y) * k) / 24 }));
      return pts;
    };
    polyline([...edge(c[0], c[1]), ...edge(c[1], c[2]), ...edge(c[2], c[3]), ...edge(c[3], c[0])]);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

// ---------- pointer and keys

/** How close a press has to be to a circle to pick it up, in CSS px: generous for a trackpad or a finger. */
const HANDLE_RADIUS = 28;

stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const p = { x: e.clientX, y: e.clientY };
  if (state.mode === 'calibrate') {
    const hit = nearestPoint(mesh(), p, HANDLE_RADIUS);
    if (hit) {
      const q = pointAt(mesh(), hit.i, hit.j);
      selected = hit;
      dragging = { kind: 'point', i: hit.i, j: hit.j, dx: q.x - p.x, dy: q.y - p.y };
      stage.setPointerCapture(e.pointerId);
      redraw();
    }
  } else if (doc && state.placement) {
    dragging = { kind: 'pattern', last: p };
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  }
  if (popOpen) {
    popOpen = null;
    renderPop();
  }
});

stage.addEventListener('pointermove', (e) => {
  const p = { x: e.clientX, y: e.clientY };
  if (!dragging) {
    if (state.mode === 'calibrate') stage.classList.toggle('over-point', !!nearestPoint(mesh(), p, HANDLE_RADIUS));
    return;
  }
  if (dragging.kind === 'point') {
    setMesh(withPoint(mesh(), dragging.i, dragging.j, { x: p.x + dragging.dx, y: p.y + dragging.dy }));
  } else if (state.placement) {
    const m = mesh();
    const a = screenToTable(m, dragging.last);
    const b = screenToTable(m, p);
    if (Number.isFinite(a.x) && Number.isFinite(b.x)) setPlacement(moved(state.placement, b.x - a.x, b.y - a.y));
    dragging.last = p;
  }
});

const endDrag = (e: PointerEvent) => {
  if (!dragging) return;
  dragging = null;
  stage.classList.remove('dragging');
  try {
    stage.releasePointerCapture(e.pointerId);
  } catch {
    /* already released */
  }
  refreshHint();
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  const typing = t && (t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['checkbox', 'file', 'button'].includes((t as HTMLInputElement).type)));
  if (typing) return;
  if (e.metaKey || e.ctrlKey) return;
  const key = e.key;
  const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (key in arrows) {
    const [dx, dy] = arrows[key]!;
    e.preventDefault();
    if (state.mode === 'calibrate' && selected) {
      const step = e.shiftKey ? 10 : e.altKey ? 0.25 : 1;
      const q = pointAt(mesh(), selected.i, selected.j);
      setMesh(withPoint(mesh(), selected.i, selected.j, { x: q.x + dx * step, y: q.y + dy * step }));
      refreshHint();
    } else if (state.mode === 'project' && state.placement) {
      const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      setPlacement(moved(state.placement, dx * step, dy * step));
    }
    return;
  }
  switch (key.toLowerCase()) {
    case 'h':
      setBarHidden(!state.barHidden);
      break;
    case 'escape':
      if (popOpen) togglePop(popOpen);
      else setBarHidden(false);
      break;
    case 'c':
      setMode('calibrate');
      break;
    case 'p':
      setMode('project');
      break;
    case 'i':
      toggle('invert');
      break;
    case 'g':
      if (state.mode === 'project') toggle('showGrid');
      break;
    case 'o':
      if (state.mode === 'project') toggle('showOutline');
      break;
    case 'r':
      if (state.mode === 'project') rotateBy(e.shiftKey ? -90 : 90);
      break;
    case ',':
      if (state.mode === 'project') rotateBy(-1);
      break;
    case '.':
      if (state.mode === 'project') rotateBy(1);
      break;
    case 'f':
      if (state.mode === 'project' && state.placement) setPlacement(flippedAcross(state.placement));
      break;
    case 'v':
      if (state.mode === 'project' && state.placement) setPlacement(flippedDown(state.placement));
      break;
    case '0':
      if (state.mode === 'project') recentre();
      break;
    case '+':
    case '=':
      if (state.mode === 'project') setWeight(state.weight + 1);
      break;
    case '-':
    case '_':
      if (state.mode === 'project') setWeight(state.weight - 1);
      break;
    case '[':
    case ']': {
      if (state.mode !== 'calibrate') break;
      const m = mesh();
      const n = m.xs.length * m.ys.length;
      const cur = selected ? selected.j * m.xs.length + selected.i : -1;
      const next = (cur + (key === ']' ? 1 : n - 1) + n) % n;
      selected = { i: next % m.xs.length, j: Math.floor(next / m.xs.length) };
      redraw();
      break;
    }
    case 'tab': {
      // Tab walks along the row, Shift+Tab down the column, each wrapping to the next line.
      if (state.mode !== 'calibrate') return;
      if (t && t !== document.body) (t as HTMLElement).blur();
      const m = mesh();
      const nx = m.xs.length;
      const ny = m.ys.length;
      let { i, j } = selected ?? { i: -1, j: 0 };
      if (e.shiftKey) {
        j++;
        if (j >= ny) {
          j = 0;
          i = (i + 1) % nx;
        }
      } else {
        i++;
        if (i >= nx) {
          i = 0;
          j = (j + 1) % ny;
        }
      }
      selected = { i: Math.max(0, i), j: Math.max(0, j) };
      redraw();
      break;
    }
    case '?':
      togglePop('help');
      break;
    default:
      return;
  }
  e.preventDefault();
});

// Files dropped anywhere on the page
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) void loadFile(f);
});

window.addEventListener('resize', () => {
  refreshHint();
  redraw();
});
document.addEventListener('fullscreenchange', () => {
  const b = document.getElementById('fullscreen');
  if (b) b.textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen';
  refreshHint();
  redraw();
});

// ---------- go

buildBar();
setBarHidden(false);
redraw();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
