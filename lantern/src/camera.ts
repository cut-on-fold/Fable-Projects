// A camera window for calibrating from a chair: a webcam (or an iPhone over
// the table as a Mac webcam) shown in a small floating panel, zoomed in on
// whichever calibration point is selected, so the point can be nudged with
// the arrow keys while watching the mat on screen instead of standing over
// it.
//
// The camera is never measured. Clicking the four corner crosses once in
// the picture gives a rough map from the screen to the camera picture, and
// that is only used to decide where to zoom; the eye does the aligning.

import { applyHomography, homographyFromPoints, type Pt } from './calc/homography';

export interface CameraSetup {
  deviceId: string | null;
  /** 1, 2, 4 or 8. */
  zoom: number;
  /** Degrees to turn the picture: 0, 90, 180 or 270. */
  turn: number;
  mirror: boolean;
  /** Where the four mesh corners (top-left, top-right, bottom-right, bottom-left) show in the picture, in video pixels; null until clicked. */
  corners: Pt[] | null;
}

export function defaultCameraSetup(): CameraSetup {
  return { deviceId: null, zoom: 4, turn: 0, mirror: false, corners: null };
}

export function parseCameraSetup(raw: unknown): CameraSetup {
  const d = defaultCameraSetup();
  if (!raw || typeof raw !== 'object') return d;
  const c = raw as Partial<CameraSetup>;
  const pt = (p: unknown): p is Pt => !!p && typeof p === 'object' && Number.isFinite((p as Pt).x) && Number.isFinite((p as Pt).y);
  return {
    deviceId: typeof c.deviceId === 'string' ? c.deviceId : null,
    zoom: [1, 2, 4, 8].includes(c.zoom as number) ? (c.zoom as number) : d.zoom,
    turn: [0, 90, 180, 270].includes(c.turn as number) ? (c.turn as number) : 0,
    mirror: !!c.mirror,
    corners: Array.isArray(c.corners) && c.corners.length === 4 && c.corners.every(pt) ? c.corners.map((p) => ({ x: p.x, y: p.y })) : null,
  };
}

export interface CameraHost {
  getSetup(): CameraSetup;
  setSetup(s: CameraSetup): void;
  /** The mesh's corners on the screen: top-left, top-right, bottom-right, bottom-left. */
  screenCorners(): [Pt, Pt, Pt, Pt];
  /** The selected calibration point on the screen, and a label for it. */
  selected(): { screen: Pt; label: string; key: string } | null;
  onClose(): void;
}

const CORNER_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Array<Node | string>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') e.className = String(v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, String(v));
  }
  e.append(...children);
  return e;
}

export class CameraPanel {
  readonly root: HTMLElement;
  private video = document.createElement('video');
  private canvas: HTMLCanvasElement;
  private status: HTMLElement;
  private deviceSelect: HTMLSelectElement;
  private zoomButtons: HTMLButtonElement[] = [];
  private stream: MediaStream | null = null;
  private frame = 0;
  private open = false;
  /** While clicking the corners: which one is next. */
  private setupStep: number | null = null;
  private setupClicks: Pt[] = [];
  /** During setup: the rough click the window has zoomed in on, waiting for the close-up click. */
  private setupNear: Pt | null = null;
  /** A click in the picture to look somewhere else until the selection changes. */
  private manualCentre: Pt | null = null;
  private lastKey: string | null = null;
  private dragFrom: { x: number; y: number; left: number; top: number } | null = null;

  constructor(private host: CameraHost) {
    this.video.muted = true;
    this.video.playsInline = true;
    this.canvas = el('canvas', { id: 'cam-canvas', 'aria-label': 'Camera picture' });
    this.status = el('p', { class: 'cam-status', id: 'cam-status' });
    this.deviceSelect = el('select', { id: 'cam-device', 'aria-label': 'Camera', onchange: () => this.pickDevice(this.deviceSelect.value) });
    const zoomGroup = el('div', { class: 'units', role: 'group', 'aria-label': 'Zoom' });
    for (const z of [1, 2, 4, 8]) {
      const b = el('button', { type: 'button', id: `cam-zoom-${z}`, 'aria-pressed': String(host.getSetup().zoom === z), onclick: () => this.setZoom(z) }, `${z}×`);
      this.zoomButtons.push(b);
      zoomGroup.append(b);
    }
    const head = el(
      'div',
      { class: 'cam-head', id: 'cam-head' },
      this.deviceSelect,
      zoomGroup,
      el('button', { type: 'button', class: 'btn', id: 'cam-turn', title: 'Turn the picture a quarter turn', onclick: () => this.update({ turn: (this.host.getSetup().turn + 90) % 360 }) }, 'Turn'),
      el('button', { type: 'button', class: 'btn', id: 'cam-mirror', 'aria-pressed': String(host.getSetup().mirror), title: 'Mirror the picture', onclick: () => this.update({ mirror: !this.host.getSetup().mirror }) }, 'Mirror'),
      el('button', { type: 'button', class: 'btn', id: 'cam-corners', title: 'Click the four corner crosses in the picture, so the view can follow the selected point', onclick: () => this.startSetup() }, 'Find corners'),
      el('button', { type: 'button', class: 'btn', id: 'cam-close', 'aria-label': 'Close the camera', onclick: () => this.close() }, '×'),
    );
    head.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button, select')) return;
      const r = this.root.getBoundingClientRect();
      this.dragFrom = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', (e) => {
      if (!this.dragFrom) return;
      this.root.style.left = `${Math.max(0, this.dragFrom.left + e.clientX - this.dragFrom.x)}px`;
      this.root.style.top = `${Math.max(0, this.dragFrom.top + e.clientY - this.dragFrom.y)}px`;
      this.root.style.right = 'auto';
      this.root.style.bottom = 'auto';
    });
    const endDrag = () => (this.dragFrom = null);
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);
    this.canvas.addEventListener('click', (e) => this.clicked(e));
    this.root = el('div', { class: 'cam', id: 'cam', role: 'dialog', 'aria-label': 'Camera' }, head, this.canvas, this.status);
    new ResizeObserver(() => this.draw()).observe(this.canvas);
  }

  private say(text: string, warn = false): void {
    this.status.textContent = text;
    this.status.classList.toggle('warn', warn);
  }

  async start(): Promise<void> {
    this.open = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.say(window.isSecureContext ? 'This browser has no camera support.' : 'The camera needs the page served over https (or from localhost), not opened as a file.', true);
      return;
    }
    await this.pickDevice(this.host.getSetup().deviceId);
    this.loop();
  }

  private async pickDevice(deviceId: string | null): Promise<void> {
    this.stopStream();
    this.say('Starting the camera…');
    const video: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    if (deviceId) video.deviceId = { exact: deviceId };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (e) {
      if (deviceId) return this.pickDevice(null); // that camera has gone: take whatever there is
      const name = (e as Error).name;
      this.say(name === 'NotAllowedError' ? 'Camera access was refused. Allow it for this page in the browser and try again.' : name === 'NotFoundError' ? 'No camera was found.' : `The camera could not start: ${(e as Error).message}`, true);
      return;
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    const track = this.stream.getVideoTracks()[0];
    const usedId = track?.getSettings().deviceId ?? deviceId;
    this.update({ deviceId: usedId ?? null });
    await this.listDevices(usedId ?? null);
    this.sayState();
  }

  private async listDevices(current: string | null): Promise<void> {
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      this.deviceSelect.replaceChildren();
      devices.forEach((d, i) => this.deviceSelect.append(el('option', { value: d.deviceId, selected: d.deviceId === current }, d.label || `Camera ${i + 1}`)));
      this.deviceSelect.hidden = devices.length < 2;
    } catch {
      this.deviceSelect.hidden = true;
    }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  close(): void {
    this.open = false;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.stopStream();
    this.root.remove();
    this.host.onClose();
  }

  private update(patch: Partial<CameraSetup>): void {
    const next = { ...this.host.getSetup(), ...patch };
    this.host.setSetup(next);
    for (const b of this.zoomButtons) b.setAttribute('aria-pressed', String(b.id === `cam-zoom-${next.zoom}`));
    document.getElementById('cam-mirror')?.setAttribute('aria-pressed', String(next.mirror));
    this.draw();
  }

  private setZoom(z: number): void {
    this.update({ zoom: z });
  }

  private startSetup(): void {
    this.setupStep = 0;
    this.setupClicks = [];
    this.setupNear = null;
    this.manualCentre = null;
    this.say(`Click near the ${CORNER_NAMES[0]} corner cross in the picture (1 of 4); the window zooms in for a second, closer click.`);
    this.draw();
  }

  private sayState(): void {
    const sel = this.host.selected();
    const s = this.host.getSetup();
    if (!s.corners) this.say(`Showing the whole picture. Find corners lets the view follow the selected point; a click looks there instead.${sel ? ` Selected: ${sel.label}.` : ''}`);
    else if (this.manualCentre) this.say(`Looking where you clicked. Select another point to follow it again.`);
    else this.say(sel ? `Following ${sel.label}. Arrow keys nudge it; Tab picks the next along the row, Shift+Tab down.` : 'Select a point to follow it.');
  }

  /** The map from video pixels to the canvas's CSS pixels. */
  private matrix(): DOMMatrix | null {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    if (!vw || !vh) return null;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const s = this.host.getSetup();
    const turned = s.turn === 90 || s.turn === 270;
    const fit = Math.min(W / (turned ? vh : vw), H / (turned ? vw : vh));
    // Setting corners: the whole picture for the rough click, then 4× on that spot for the close one.
    const zoom = this.setupStep !== null ? (this.setupNear ? 4 : 1) : s.zoom;
    const centre = this.setupStep !== null ? (this.setupNear ?? { x: vw / 2, y: vh / 2 }) : this.centre(vw, vh);
    return new DOMMatrix()
      .translate(W / 2, H / 2)
      .scale(fit * zoom)
      .scale(s.mirror ? -1 : 1, 1)
      .rotate(s.turn)
      .translate(-centre.x, -centre.y);
  }

  /** Where to look, in video pixels: the selected point through the corners, a click, or the middle. */
  private centre(vw: number, vh: number): Pt {
    const sel = this.host.selected();
    const key = sel?.key ?? null;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.manualCentre = null;
    }
    if (this.manualCentre) return this.manualCentre;
    const s = this.host.getSetup();
    if (sel && s.corners) {
      const h = homographyFromPoints(this.host.screenCorners(), s.corners);
      if (h) {
        const p = applyHomography(h, sel.screen);
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: Math.max(0, Math.min(vw, p.x)), y: Math.max(0, Math.min(vh, p.y)) };
      }
    }
    return { x: vw / 2, y: vh / 2 };
  }

  private clicked(e: MouseEvent): void {
    const m = this.matrix();
    if (!m) return;
    const r = this.canvas.getBoundingClientRect();
    const p = m.inverse().transformPoint(new DOMPoint(e.clientX - r.left, e.clientY - r.top));
    const raw = { x: p.x, y: p.y };
    if (this.setupStep !== null) {
      if (!this.setupNear) {
        // the rough click: zoom in there and ask for the close one
        this.setupNear = raw;
        this.say(`Now click the ${CORNER_NAMES[this.setupStep]} corner cross itself, close up (${this.setupStep + 1} of 4).`);
      } else {
        this.setupClicks.push(raw);
        this.setupNear = null;
        this.setupStep++;
        if (this.setupStep < 4) {
          this.say(`Click near the ${CORNER_NAMES[this.setupStep]} corner cross in the picture (${this.setupStep + 1} of 4).`);
        } else {
          this.setupStep = null;
          this.update({ corners: this.setupClicks });
          this.sayState();
        }
      }
    } else {
      this.manualCentre = raw;
      this.sayState();
    }
    this.draw();
  }

  private loop(): void {
    if (!this.open) return;
    this.draw();
    this.frame = requestAnimationFrame(() => this.loop());
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    if (!W || !H) return;
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, pw, ph);
    const m = this.matrix();
    if (!m) return;
    ctx.setTransform(new DOMMatrix().scale(dpr).multiply(m));
    ctx.drawImage(this.video, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.setupStep !== null) {
      // the corners clicked so far
      ctx.fillStyle = '#ffd166';
      for (const c of this.setupClicks) {
        const q = m.transformPoint(new DOMPoint(c.x, c.y));
        ctx.beginPath();
        ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Nothing is drawn over the picture while following: the projected cross is there in the video, and a
    // marker at the window's centre only ever sat a little off it (the corner clicks give a rough map), which
    // read as something to align with.

    if (this.setupStep === null && this.open && this.stream) this.sayState();
  }
}
