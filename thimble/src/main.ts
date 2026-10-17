import './styles.css';
import { GROUPS, TOOLS, resolveDefault, type Field, type Output, type Tool, type Values } from './tools';
import { inputText, parseLength, parseNumber, unitLabel, type Unit } from './units';

const STORAGE_KEY = 'thimble.v1';

interface State {
  unit: Unit;
  tool: string;
  values: Record<string, Values>;
}

function load(): State {
  const fallback: State = { unit: 'cm', tool: TOOLS[0]!.id, values: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      unit: parsed.unit === 'in' ? 'in' : 'cm',
      tool: TOOLS.some((t) => t.id === parsed.tool) ? (parsed.tool as string) : fallback.tool,
      values: typeof parsed.values === 'object' && parsed.values ? parsed.values : {},
    };
  } catch {
    return fallback;
  }
}

function save(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private window or blocked storage: the page still works */
  }
}

const state = load();
const hashTool = location.hash.replace('#', '');
if (TOOLS.some((t) => t.id === hashTool)) state.tool = hashTool;

function defaultsFor(tool: Tool, unit: Unit): Values {
  const v: Values = {};
  for (const f of tool.fields) v[f.key] = f.kind === 'length' ? resolveDefault(f.default, unit) : f.default;
  return v;
}

function valuesFor(tool: Tool): Values {
  const stored = state.values[tool.id];
  const defaults = defaultsFor(tool, state.unit);
  if (!stored) {
    state.values[tool.id] = defaults;
    return defaults;
  }
  for (const f of tool.fields) if (!(f.key in stored)) stored[f.key] = defaults[f.key] ?? null;
  return stored;
}

/** Values still at their default in the old unit move to the default in the new one. */
function switchUnit(next: Unit): void {
  const prev = state.unit;
  if (prev === next) return;
  for (const tool of TOOLS) {
    const v = state.values[tool.id];
    if (!v) continue;
    for (const f of tool.fields) {
      if (f.kind !== 'length') continue;
      const oldDefault = resolveDefault(f.default, prev);
      const cur = v[f.key];
      if (oldDefault !== null && typeof cur === 'number' && Math.abs(cur - oldDefault) < 1e-6) v[f.key] = resolveDefault(f.default, next);
    }
  }
  state.unit = next;
  save(state);
  render();
}

// ---------- DOM helpers

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: Array<Node | string | null | undefined>): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs)) {
    if (k === 'class') node.className = val;
    else node.setAttribute(k, val);
  }
  for (const c of children) if (c !== null && c !== undefined) node.append(c);
  return node;
}

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 12a7 7 0 0 1 14 0v14H9z" fill="var(--accent)"/><circle cx="16" cy="9" r="1.4" fill="var(--accent-ink)"/><circle cx="12" cy="11" r="1.4" fill="var(--accent-ink)"/><circle cx="20" cy="11" r="1.4" fill="var(--accent-ink)"/><circle cx="14" cy="14" r="1.4" fill="var(--accent-ink)"/><circle cx="18" cy="14" r="1.4" fill="var(--accent-ink)"/><rect x="9" y="22" width="14" height="4" fill="var(--accent-ink)" opacity="0.35"/></svg>`;

// ---------- rendering

const root = document.getElementById('app')!;

function render(): void {
  root.replaceChildren();
  const tool = TOOLS.find((t) => t.id === state.tool) ?? TOOLS[0]!;

  const unitToggle = el('div', { class: 'units', role: 'group', 'aria-label': 'Units' });
  for (const u of ['cm', 'in'] as Unit[]) {
    const b = el('button', { type: 'button', id: `unit-${u}`, 'aria-pressed': String(state.unit === u) }, u === 'cm' ? 'cm' : 'inches');
    b.addEventListener('click', () => switchUnit(u));
    unitToggle.append(b);
  }
  const brand = el('div', { class: 'brand' });
  brand.innerHTML = LOGO;
  brand.append(el('div', {}, el('h1', {}, 'Thimble'), el('p', {}, 'Cutting-table calculators')));
  const header = el('header', { class: 'header' }, brand, unitToggle);

  const open = (id: string) => {
    state.tool = id;
    save(state);
    history.replaceState(null, '', `#${id}`);
    render();
    document.getElementById(`tool-${id}`)?.focus();
  };
  const list = el('div', { class: 'nav-list' });
  const select = el('select', { class: 'nav-select', id: 'nav-select', 'aria-label': 'Calculator' });
  for (const g of GROUPS) {
    const tools = TOOLS.filter((t) => t.group === g);
    if (!tools.length) continue;
    list.append(el('h3', { class: 'nav-group' }, g));
    const og = el('optgroup', { label: g });
    for (const t of tools) {
      const b = el('button', { type: 'button', id: `nav-${t.id}` }, t.name);
      if (t.id === tool.id) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => open(t.id));
      list.append(b);
      og.append(el('option', { value: t.id }, t.name));
    }
    select.append(og);
  }
  select.value = tool.id;
  select.addEventListener('change', () => open(select.value));
  const nav = el('nav', { class: 'nav', 'aria-label': 'Calculators' }, select, list);

  const panel = renderTool(tool);
  const app = el('div', { class: 'app' }, header, el('div', { class: 'body' }, nav, panel),
    el('footer', { class: 'footer' },
      el('p', {}, 'Lengths take fractions (1 1/2, 5/8) and unit suffixes (45", 2 yd, 1.2 m). Your numbers stay in this browser.'),
      el('p', {}, `Rules of thumb are starting points: test on a scrap. Thimble ${__THIMBLE_VERSION__}.`)));
  root.append(app);
}

function renderTool(tool: Tool): HTMLElement {
  const values = valuesFor(tool);
  const head = el('div', { class: 'tool-head' }, el('h2', { id: `tool-${tool.id}`, tabindex: '-1' }, tool.name), el('p', {}, tool.blurb));
  const form = el('form', { class: 'form', autocomplete: 'off' });
  form.addEventListener('submit', (e) => e.preventDefault());
  const body = el('div', { class: 'results-body', 'aria-live': 'polite' });
  const copy = el('button', { type: 'button', class: 'copy', id: `copy-${tool.id}` }, 'Copy');
  const results = el('section', { class: 'results', 'aria-label': 'Results' },
    el('div', { class: 'results-bar' }, el('span', {}, 'Results'), copy), body);
  const wrappers = new Map<string, HTMLElement>();
  const inputs = new Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>();
  let latest: Output = {};

  const refresh = () => {
    for (const f of tool.fields) {
      const w = wrappers.get(f.key);
      if (w) w.hidden = f.showIf ? !f.showIf(values) : false;
    }
    latest = tool.compute(values, state.unit);
    renderOutput(body, latest);
    copy.hidden = !!latest.empty;
    save(state);
  };

  copy.addEventListener('click', () => {
    const text = describe(tool, values, latest, state.unit);
    const done = () => {
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
    };
    const fallback = () => {
      const ta = el('textarea', { 'aria-hidden': 'true' });
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch { copy.textContent = 'Select and copy'; }
      ta.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  for (const f of tool.fields) {
    const id = `${tool.id}-${f.key}`;
    const wrapper = el('div', { class: `field${f.wide ? ' wide' : ''}${f.kind === 'check' ? ' check' : ''}` });
    const label = el('label', { for: id }, f.label);

    if (f.kind === 'select') {
      const select = el('select', { id });
      for (const o of f.options) select.append(el('option', { value: o.value }, o.label));
      select.value = String(values[f.key] ?? f.default);
      select.addEventListener('change', () => {
        values[f.key] = select.value;
        if (f.sets) {
          for (const [k, val] of Object.entries(f.sets(select.value, state.unit))) {
            values[k] = val;
            const target = inputs.get(k);
            const tf = tool.fields.find((x) => x.key === k);
            if (target) target.value = typeof val === 'number' ? (tf?.kind === 'length' ? inputText(val, state.unit, tf.long) : String(val)) : String(val ?? '');
          }
        }
        refresh();
      });
      inputs.set(f.key, select);
      wrapper.append(label, el('div', { class: 'control' }, select));
    } else if (f.kind === 'check') {
      const input = el('input', { type: 'checkbox', id });
      input.checked = values[f.key] === true;
      input.addEventListener('change', () => {
        values[f.key] = input.checked;
        refresh();
      });
      inputs.set(f.key, input);
      wrapper.append(input, label);
    } else if (f.kind === 'lines') {
      const area = el('textarea', { id, rows: '5', placeholder: f.placeholder ?? '', spellcheck: 'false' });
      area.value = String(values[f.key] ?? '');
      area.addEventListener('input', () => {
        values[f.key] = area.value;
        refresh();
      });
      inputs.set(f.key, area);
      wrapper.append(label, el('div', { class: 'control' }, area));
    } else if (f.kind === 'text') {
      const input = el('input', { type: 'search', id, placeholder: f.placeholder ?? '' });
      input.value = String(values[f.key] ?? '');
      input.addEventListener('input', () => {
        values[f.key] = input.value;
        refresh();
      });
      inputs.set(f.key, input);
      wrapper.append(label, el('div', { class: 'control' }, input));
    } else {
      const input = el('input', { type: 'text', id, inputmode: 'decimal' });
      const suffix = f.kind === 'length' ? unitLabel(state.unit, f.long) : f.kind === 'percent' ? '%' : f.kind === 'number' && f.suffix ? f.suffix : '';
      if (f.kind === 'length') input.dataset.unit = state.unit;
      const cur = values[f.key];
      if (typeof cur === 'number') input.value = f.kind === 'length' ? inputText(cur, state.unit, f.long) : String(cur);
      input.addEventListener('input', () => {
        const text = input.value;
        let parsed: number | null;
        if (f.kind === 'length') parsed = parseLength(text, state.unit, f.long);
        else if (f.kind === 'int') {
          const n = parseNumber(text);
          parsed = n === null ? null : Math.round(n);
        } else parsed = parseNumber(text);
        values[f.key] = parsed;
        input.setAttribute('aria-invalid', String(text.trim() !== '' && parsed === null));
        refresh();
      });
      inputs.set(f.key, input);
      const control = el('div', { class: 'control' }, input);
      if (suffix) {
        if (f.kind === 'length') input.dataset.unit = state.unit;
        else input.style.paddingRight = '44px';
        control.append(el('span', { class: 'suffix' }, suffix));
      }
      wrapper.append(label, control);
    }
    if (f.hint) wrapper.append(el('span', { class: 'hint' }, f.hint));
    wrappers.set(f.key, wrapper);
    form.append(wrapper);
  }

  refresh();
  return el('div', { class: 'tool' }, head, form, results);
}

/** What a field shows, as text, for the copied summary. */
function fieldText(f: Field, values: Values, unit: Unit): string | null {
  const v = values[f.key];
  switch (f.kind) {
    case 'length': return typeof v === 'number' ? `${inputText(v, unit, f.long)} ${unitLabel(unit, f.long)}` : null;
    case 'number': return typeof v === 'number' ? `${v}${f.suffix ?? ''}` : null;
    case 'percent': return typeof v === 'number' ? `${v}%` : null;
    case 'int': return typeof v === 'number' ? `${v}` : null;
    case 'select': return f.options.find((o) => o.value === v)?.label ?? null;
    case 'check': return v ? 'yes' : 'no';
    case 'text': return typeof v === 'string' && v ? v : null;
    case 'lines': return typeof v === 'string' && v ? '\n  ' + v.trim().split('\n').join('\n  ') : null;
  }
}

/** The inputs and results as plain text, for pasting into project notes. */
export function describe(tool: Tool, values: Values, out: Output, unit: Unit): string {
  const lines: string[] = [`${tool.name} (Thimble)`, ''];
  for (const f of tool.fields) {
    if (f.showIf && !f.showIf(values)) continue;
    const t = fieldText(f, values, unit);
    if (t !== null) lines.push(`${f.label}: ${t}`);
  }
  lines.push('');
  if (out.warn) lines.push(`! ${out.warn}`);
  if (out.headline) lines.push(`${out.headline.label}: ${out.headline.value}${out.headline.note ? ` (${out.headline.note})` : ''}`);
  for (const r of out.rows ?? []) lines.push(`${r.label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}`);
  if (out.table) {
    lines.push('', out.table.head.join('\t'));
    for (const row of out.table.rows) lines.push(row.map((c) => c.text).join('\t'));
  }
  for (const c of out.cards ?? []) {
    lines.push('', `${c.title} (${c.subtitle})`);
    for (const [k, v] of c.pairs) lines.push(`  ${k}: ${v}`);
    lines.push(`  ${c.tip}`);
  }
  if (out.notes?.length) lines.push('', ...out.notes.map((n) => `- ${n}`));
  return lines.join('\n').trim() + '\n';
}

function renderOutput(target: HTMLElement, out: Output): void {
  target.replaceChildren();
  if (out.empty) {
    target.append(el('p', { class: 'empty' }, out.empty));
    return;
  }
  if (out.warn) target.append(el('div', { class: 'warn', role: 'status' }, out.warn));
  if (out.headline) {
    target.append(el('div', { class: 'headline' },
      el('span', { class: 'label' }, out.headline.label),
      el('span', { class: 'value' }, out.headline.value),
      out.headline.note ? el('span', { class: 'note' }, out.headline.note) : null));
  }
  if (out.rows?.length) {
    const dl = el('dl', { class: 'rows' });
    for (const r of out.rows) {
      dl.append(el('dt', {}, r.label), el('dd', {}, r.value));
      if (r.sub) dl.append(el('div', { class: 'sub' }, r.sub));
    }
    target.append(dl);
  }
  if (out.table) {
    const table = el('table');
    const tr = el('tr');
    out.table.head.forEach((h, i) => tr.append(el('th', { class: out.table!.numeric?.[i] ? 'num' : '' }, h)));
    table.append(el('thead', {}, tr));
    const tbody = el('tbody');
    for (const row of out.table.rows) {
      const r = el('tr');
      row.forEach((c, i) => r.append(el('td', { class: `${out.table!.numeric?.[i] ? 'num' : ''} ${c.cls ?? ''}`.trim() }, c.text)));
      tbody.append(r);
    }
    table.append(tbody);
    target.append(el('div', { class: 'table-wrap' }, table));
  }
  if (out.cards?.length) {
    const grid = el('div', { class: 'cards' });
    for (const c of out.cards) {
      const dl = el('dl');
      for (const [k, v] of c.pairs) dl.append(el('dt', {}, k), el('dd', {}, v));
      grid.append(el('article', { class: 'card' }, el('h3', {}, c.title), el('p', { class: 'examples' }, c.subtitle), dl, el('p', { class: 'tip' }, c.tip)));
    }
    target.append(grid);
  }
  if (out.notes?.length) {
    const ul = el('ul', { class: 'notes' });
    for (const n of out.notes) ul.append(el('li', {}, n));
    target.append(ul);
  }
}

render();

// Offline copy for the published page. Nothing to do when opened as a file or
// inside another page.
try {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
} catch {
  /* not available here */
}
