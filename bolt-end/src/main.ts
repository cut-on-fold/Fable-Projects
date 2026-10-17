import './styles.css';
import { defaultColumns, parseCsv, statuses, toRecords, type Record } from './csv';
import { PAGE_SIZES, TEMPLATES, perPage, position, type Template } from './templates';

const STORAGE_KEY = 'bolt-end.v1';

interface Settings {
  template: string;
  columns: string[];
  titleColumn: string;
  showKeys: boolean;
  fontPt: number;
  skip: number;
  statuses: string[];
  search: string;
}

const defaults: Settings = { template: 'L7160', columns: [], titleColumn: 'Name', showKeys: true, fontPt: 8, skip: 0, statuses: [], search: '' };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* fine without */
  }
}

// Example rows in the shape of Stash's Fabric.csv, so the page shows what it does before a file is dropped.
const SAMPLE_CSV = `Name,Status,Fabric type,Composition,Fabric category,Purchase length,Remaining length,Width,Weight,Stretch crosswise,Colours,Prewashed,Thread match,Shop,Location
Liberty lawn Betsy blue,Uncut,Lawn,100% cotton,Woven,2 m,2 m,137 cm,75 gsm,,"Blue, white",Yes,Gütermann 322,Shaukat,Shelf B2
Navy ponte,Remnant,Ponte,70% viscose 25% nylon 5% elastane,Knit,3 m,1.4 m,150 cm,330 gsm,40%,Navy,Yes,Gütermann 339,Lamazi,Box 4
Washed linen rust,Uncut,Linen,100% linen,Woven,2.5 m,2.5 m,140 cm,190 gsm,,Rust,Yes,Gütermann 982,Merchant & Mills,Shelf A1
Cotton lycra stripe,Uncut,Cotton lycra,95% cotton 5% elastane,Knit,2 m,2 m,160 cm,240 gsm,60%,"Cream, black",No,Toldi Lock 1000,Pound Fabrics,Box 2
Tencel twill sage,Remnant,Tencel twill,100% lyocell,Woven,3 m,0.8 m,145 cm,210 gsm,,Sage,Yes,Gütermann 724,Cashmerette,Shelf C3
Swim lycra teal,Uncut,Swimwear lycra,80% nylon 20% elastane,Knit,1.5 m,1.5 m,150 cm,200 gsm,80%,Teal,No,Gütermann 189,Funki Fabrics,Box 5
Chambray mid blue,Uncut,Chambray,100% cotton,Woven,2 m,2 m,150 cm,140 gsm,,Blue,Yes,Gütermann 112,Lamazi,Shelf B1`;

const settings = loadSettings();
let header: string[] = [];
let records: Record[] = [];
let fileName = 'Example rows (not your stash)';
let isSample = true;

function loadText(text: string, name: string, sample = false): void {
  const table = parseCsv(text);
  header = table.header;
  records = toRecords(table);
  fileName = name;
  isSample = sample;
  const known = header.filter((h) => settings.columns.includes(h));
  if (!known.length) settings.columns = defaultColumns(header);
  else settings.columns = known;
  if (!header.includes(settings.titleColumn)) settings.titleColumn = header[0] ?? 'Name';
  settings.statuses = settings.statuses.filter((s) => statuses(records).includes(s));
  render();
}

// ---------- DOM helpers
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: { [k: string]: string } = {}, ...children: Array<Node | string | null | undefined>): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined) node.append(c);
  return node;
}

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="8" width="24" height="16" rx="2" fill="var(--accent)"/><rect x="7" y="12" width="10" height="2" fill="var(--accent-ink)"/><rect x="7" y="16" width="14" height="2" fill="var(--accent-ink)" opacity=".7"/><rect x="7" y="20" width="8" height="1.5" fill="var(--accent-ink)" opacity=".5"/></svg>`;

const root = document.getElementById('app')!;
const pageStyle = document.getElementById('pagesize') as HTMLStyleElement;

function template(): Template {
  return TEMPLATES.find((t) => t.id === settings.template) ?? TEMPLATES[0]!;
}

function selected(): Record[] {
  const q = settings.search.trim().toLowerCase();
  return records.filter((r) => {
    if (settings.statuses.length && !settings.statuses.includes(r.Status ?? '')) return false;
    if (q && !Object.values(r).join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
}

function render(): void {
  root.replaceChildren();
  const t = template();
  const page = PAGE_SIZES[t.page];
  pageStyle.textContent = `@page { size: ${t.page} portrait; margin: 0; }`;

  const printBtn = el('button', { type: 'button', class: 'print', id: 'print' }, 'Print…');
  printBtn.addEventListener('click', () => window.print());
  const brand = el('div', { class: 'brand' });
  brand.innerHTML = LOGO;
  brand.append(el('div', {}, el('h1', {}, 'Bolt End'), el('p', {}, 'Shelf labels and swatch cards from a Stash export')));
  root.append(el('header', { class: 'header' }, brand, printBtn));

  // ---- settings panel
  const panel = el('section', { class: 'panel', 'aria-label': 'Settings' });

  const fileInput = el('input', { type: 'file', id: 'file', accept: '.csv,text/csv' });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) f.text().then((text) => loadText(text, f.name));
  });
  const sampleBtn = el('button', { type: 'button', id: 'sample' }, 'Example rows');
  sampleBtn.addEventListener('click', () => loadText(SAMPLE_CSV, 'Example rows (not your stash)', true));
  panel.append(el('div', { class: 'field wide' },
    el('span', { class: 'lbl' }, 'Stash export'),
    el('div', { class: 'file' }, el('label', { class: 'btn', for: 'file' }, 'Choose a CSV…'), fileInput, sampleBtn, el('span', { class: 'name', id: 'file-name' }, `${fileName} · ${records.length} rows`)),
    el('span', { class: 'hint' }, 'In Stash: Backups & export → Export everything, then pick Fabric.csv (or Patterns.csv, Notions.csv: any category works). The file stays in this browser.')));

  const tSel = el('select', { id: 'template' });
  for (const x of TEMPLATES) tSel.append(el('option', { value: x.id }, x.name));
  tSel.value = t.id;
  tSel.addEventListener('change', () => { settings.template = tSel.value; settings.fontPt = template().fontPt; settings.skip = 0; saveSettings(); render(); });
  panel.append(el('div', { class: 'field' }, el('label', { for: 'template' }, 'Labels'), tSel, el('span', { class: 'hint' }, `${perPage(t)} a sheet on ${t.page}. Print a sheet on plain paper first and hold it against the labels.`)));

  const titleSel = el('select', { id: 'title' });
  for (const h of header) titleSel.append(el('option', { value: h }, h));
  titleSel.value = settings.titleColumn;
  titleSel.addEventListener('change', () => { settings.titleColumn = titleSel.value; saveSettings(); render(); });
  panel.append(el('div', { class: 'field' }, el('label', { for: 'title' }, 'Title line'), titleSel));

  const font = el('input', { type: 'number', id: 'font', min: '5', max: '16', step: '0.5' });
  font.value = String(settings.fontPt);
  font.addEventListener('change', () => { settings.fontPt = Math.min(16, Math.max(5, parseFloat(font.value) || 8)); saveSettings(); render(); });
  panel.append(el('div', { class: 'field' }, el('label', { for: 'font' }, 'Text size (pt)'), font));

  const skip = el('input', { type: 'number', id: 'skip', min: '0', max: String(perPage(t) - 1), step: '1' });
  skip.value = String(settings.skip);
  skip.addEventListener('change', () => { settings.skip = Math.min(perPage(t) - 1, Math.max(0, parseInt(font.value ? skip.value : '0', 10) || 0)); saveSettings(); render(); });
  panel.append(el('div', { class: 'field' }, el('label', { for: 'skip' }, 'Start at label'), skip, el('span', { class: 'hint' }, 'Labels already used on the first sheet, counted across then down.')));

  const search = el('input', { type: 'text', id: 'search', placeholder: 'linen, Shelf B, Lamazi…' });
  search.value = settings.search;
  search.addEventListener('input', () => { settings.search = search.value; saveSettings(); renderSheets(); });
  panel.append(el('div', { class: 'field' }, el('label', { for: 'search' }, 'Only rows containing'), search));

  const sts = statuses(records);
  if (sts.length) {
    const checks = el('div', { class: 'checks' });
    for (const s of sts) {
      const cb = el('input', { type: 'checkbox', id: `st-${s}` });
      cb.checked = !settings.statuses.length || settings.statuses.includes(s);
      cb.addEventListener('change', () => {
        const on = sts.filter((x) => (document.getElementById(`st-${x}`) as HTMLInputElement).checked);
        settings.statuses = on.length === sts.length ? [] : on;
        saveSettings();
        renderSheets();
      });
      checks.append(el('label', {}, cb, s));
    }
    panel.append(el('div', { class: 'field wide' }, el('span', { class: 'lbl' }, 'Statuses'), checks));
  }

  const cols = el('div', { class: 'checks' });
  for (const h of header) {
    if (h === settings.titleColumn || h === 'Photos') continue;
    const cb = el('input', { type: 'checkbox', id: `col-${h}` });
    cb.checked = settings.columns.includes(h);
    cb.addEventListener('change', () => {
      settings.columns = header.filter((x) => x !== settings.titleColumn && (document.getElementById(`col-${x}`) as HTMLInputElement | null)?.checked);
      saveSettings();
      renderSheets();
    });
    cols.append(el('label', {}, cb, h));
  }
  const keys = el('input', { type: 'checkbox', id: 'keys' });
  keys.checked = settings.showKeys;
  keys.addEventListener('change', () => { settings.showKeys = keys.checked; saveSettings(); renderSheets(); });
  panel.append(el('div', { class: 'field wide' }, el('span', { class: 'lbl' }, 'Lines on each label'), cols, el('label', { class: 'checks' }, keys, 'Show the field names')));

  const drop = el('div', { class: 'drop' }, 'Or drop a CSV anywhere on this page');
  panel.append(drop);
  root.append(panel);

  const sheets = el('div', { class: 'sheets', id: 'sheets' });
  root.append(sheets);
  root.append(el('footer', { class: 'footer' }, el('p', {}, `Sheet: ${t.page} ${page.width.toFixed(0)} × ${page.height.toFixed(0)} mm. Print at 100% with no scaling and margins set to none; the browser's print dialog has a "Scale" setting that must say 100.`)));
  renderSheets();
  fitZoom();
}

function renderSheets(): void {
  const sheets = document.getElementById('sheets');
  if (!sheets) return;
  sheets.replaceChildren();
  const t = template();
  const page = PAGE_SIZES[t.page];
  const rows = selected();
  const n = perPage(t);
  const total = rows.length + settings.skip;
  const pages = Math.max(1, Math.ceil(total / n));
  for (let p = 0; p < pages; p++) {
    const sheet = el('div', { class: 'sheet', style: `width:${page.width}mm;height:${page.height}mm;--fs:${settings.fontPt}pt` });
    for (let k = 0; k < n; k++) {
      const idx = p * n + k - settings.skip;
      if (idx < 0 || idx >= rows.length) {
        if (t.outline) {
          const { x, y } = position(t, k);
          sheet.append(el('div', { class: 'label outline', style: `left:${x}mm;top:${y}mm;width:${t.width}mm;height:${t.height}mm` }));
        }
        continue;
      }
      sheet.append(labelFor(rows[idx]!, t, k));
    }
    sheet.append(el('div', { class: 'guide' }, `${t.name} · sheet ${p + 1} of ${pages}${isSample ? ' · example rows' : ''}`));
    sheets.append(sheet);
  }
  const name = document.getElementById('file-name');
  if (name) name.textContent = `${fileName} · ${rows.length} of ${records.length} rows · ${pages} sheet${pages === 1 ? '' : 's'}`;
}

function labelFor(r: Record, t: Template, k: number): HTMLElement {
  const { x, y } = position(t, k);
  const label = el('div', { class: `label${t.outline ? ' outline' : ''}${t.height >= 55 ? ' roomy' : ''}`, style: `left:${x}mm;top:${y}mm;width:${t.width}mm;height:${t.height}mm` });
  if (t.swatch) label.append(el('div', { class: 'swatch', style: `width:${t.swatchSize}mm;height:${t.swatchSize}mm` }, 'swatch'));
  const text = el('div', { class: 'text' });
  text.append(el('div', { class: 'title' }, r[settings.titleColumn] || '(no name)'));
  for (const c of settings.columns) {
    const v = (r[c] ?? '').replace(/\s+/g, ' ').trim();
    if (!v) continue;
    const line = el('div', { class: 'line' });
    if (settings.showKeys) line.append(el('span', { class: 'k' }, `${c}: `));
    line.append(v);
    text.append(line);
  }
  label.append(text);
  return label;
}

function fitZoom(): void {
  const sheets = document.getElementById('sheets');
  if (!sheets) return;
  const page = PAGE_SIZES[template().page];
  const px = (page.width * 96) / 25.4;
  const zoom = Math.min(1, sheets.clientWidth / px);
  document.documentElement.style.setProperty('--zoom', zoom.toFixed(3));
}

window.addEventListener('resize', fitZoom);
window.addEventListener('dragover', (e) => { e.preventDefault(); document.querySelector('.drop')?.classList.add('over'); });
window.addEventListener('dragleave', () => document.querySelector('.drop')?.classList.remove('over'));
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.querySelector('.drop')?.classList.remove('over');
  const f = e.dataTransfer?.files?.[0];
  if (f) f.text().then((text) => loadText(text, f.name));
});

loadText(SAMPLE_CSV, 'Example rows (not your stash)', true);
