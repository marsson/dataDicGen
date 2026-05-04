import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { FieldEntry, ObjectEntry } from '../dictionary.js';
import { loadD3Source, renderSchemaPanel, SCHEMA_SCRIPT, SCHEMA_STYLES } from './schemaViewer.js';

export type BuildOptions = {
  outputDir: string;
  baseName: string;
  objects: ObjectEntry[];
};

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function describeType(field: FieldEntry): string {
  if (field.type === 'reference' && field.referenceTo.length > 0) {
    const kind = field.relationshipKind === 'master-detail' ? 'master-detail' : 'lookup';
    return `${kind} → ${field.referenceTo.join(', ')}`;
  }
  if (field.length != null && (field.type === 'string' || field.type === 'textarea')) {
    return `${field.type}(${field.length})`;
  }
  if (
    field.precision != null &&
    (field.type === 'currency' || field.type === 'double' || field.type === 'percent')
  ) {
    return `${field.type}(${field.precision},${field.scale ?? 0})`;
  }
  return field.type;
}

function renderClassification(field: FieldEntry): string {
  const c = field.classification;
  const pills: string[] = [];
  if (c.securityClassification) {
    pills.push(`<span class="class-sec" title="Security classification">${escapeHtml(c.securityClassification)}</span>`);
  }
  for (const tag of c.complianceGroup) {
    pills.push(`<span class="class-comp" title="Compliance category">${escapeHtml(tag)}</span>`);
  }
  if (c.businessStatus) {
    pills.push(`<span class="class-biz" title="Business status">${escapeHtml(c.businessStatus)}</span>`);
  }
  return pills.join('');
}

function fieldFlags(field: FieldEntry): string[] {
  const flags: string[] = [];
  if (field.required) flags.push('required');
  if (field.unique) flags.push('unique');
  if (field.externalId) flags.push('external-id');
  if (field.custom) flags.push('custom');
  if (field.formula) flags.push('formula');
  return flags;
}

function renderField(field: FieldEntry): string {
  const flags = fieldFlags(field);
  const flagBadges = flags.map((f) => `<span class="flag flag-${f}">${f}</span>`).join('');
  const picklist =
    field.picklistValues.length > 0
      ? `<details class="picklist"><summary>${field.picklistValues.length} values</summary><ul>${field.picklistValues
          .map((p) => `<li><code>${escapeHtml(p.value)}</code>${p.label !== p.value ? ` <span class="muted">${escapeHtml(p.label)}</span>` : ''}${p.defaultValue ? ' <span class="tag">default</span>' : ''}${!p.active ? ' <span class="tag tag-warn">inactive</span>' : ''}</li>`)
          .join('')}</ul></details>`
      : '';
  const formula = field.formula
    ? `<details class="formula"><summary>formula</summary><pre><code>${escapeHtml(field.formula)}</code></pre></details>`
    : '';
  const description = field.description
    ? `<div class="desc">${escapeHtml(field.description)}</div>`
    : '';
  const help = field.inlineHelpText
    ? `<div class="help">💡 ${escapeHtml(field.inlineHelpText)}</div>`
    : '';

  return `
    <tr data-field="${escapeHtml(field.name)}" data-flags="${flags.join(' ')}">
      <td><code class="api">${escapeHtml(field.name)}</code></td>
      <td>${escapeHtml(field.label)}</td>
      <td><span class="type type-${escapeHtml(field.type)}">${escapeHtml(describeType(field))}</span></td>
      <td>${flagBadges}</td>
      <td class="cls-cell">${renderClassification(field)}</td>
      <td>${description}${help}${picklist}${formula}</td>
    </tr>`;
}

function renderObjectCard(obj: ObjectEntry): string {
  const customFieldCount = obj.fields.filter((f) => f.custom).length;
  const description = obj.description
    ? `<p class="obj-desc">${escapeHtml(obj.description)}</p>`
    : '';
  const rows = obj.fields.map(renderField).join('');
  return `
    <section id="obj-${escapeHtml(obj.apiName)}" class="obj" data-name="${escapeHtml(obj.apiName)}" data-label="${escapeHtml(obj.label)}">
      <header class="obj-head">
        <h2><code class="api">${escapeHtml(obj.apiName)}</code> <span class="obj-label">${escapeHtml(obj.label)}</span> ${obj.custom ? '<span class="tag tag-custom">custom</span>' : ''}</h2>
        <div class="stat-row">
          <span class="stat"><strong>${obj.fields.length}</strong> fields</span>
          <span class="stat"><strong>${customFieldCount}</strong> custom</span>
        </div>
      </header>
      ${description}
      <table class="fields">
        <thead>
          <tr><th>API Name</th><th>Label</th><th>Type</th><th>Flags</th><th>Classification</th><th>Details</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

const SHARED_STYLES = `
:root {
  --bg: #0f1115;
  --surface: #161922;
  --surface-2: #1c2030;
  --border: #2a3041;
  --text: #e6e8ee;
  --muted: #8a93a6;
  --accent: #6d8eff;
  --accent-soft: #6d8eff22;
  --green: #58d68d;
  --orange: #f5a76b;
  --red: #ff7a8a;
  --yellow: #ffd166;
  --pink: #f48fb1;
  --cyan: #6cdaff;
  --md: #f5a76b;
  --lookup: #8a93a6;
  --shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  --topbar-h: 50px;
}
:root[data-theme="light"] {
  --bg: #f6f7fb;
  --surface: #ffffff;
  --surface-2: #f0f2f8;
  --border: #d8dbe6;
  --text: #1d2230;
  --muted: #5b6478;
  --accent: #3a5fff;
  --accent-soft: #3a5fff14;
  --shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  line-height: 1.55;
  overflow: hidden;
}
.topbar {
  position: fixed; top: 0; left: 0; right: 0; height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px; padding: 0 18px;
  z-index: 100;
}
.topbar .brand {
  font-weight: 700; font-size: 15px;
  display: flex; align-items: center; gap: 10px; margin-right: 22px;
}
.topbar .brand-mark {
  width: 26px; height: 26px; border-radius: 6px;
  background: linear-gradient(135deg, var(--accent), var(--cyan));
  display: inline-flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 12px;
  box-shadow: var(--shadow);
}
.topbar .tabs { display: flex; gap: 4px; }
.topbar .tab {
  padding: 7px 14px; font-size: 13px; border-radius: 7px;
  background: transparent; color: var(--text);
  border: 1px solid transparent; cursor: pointer;
}
.topbar .tab:hover { background: var(--surface-2); }
.topbar .tab.active { background: var(--accent); color: white; }
.topbar .topbar-right {
  margin-left: auto; display: flex; gap: 10px; align-items: center;
  font-size: 12px; color: var(--muted);
}
.topbar .theme-toggle {
  background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
  border-radius: 7px; padding: 6px 12px; cursor: pointer; font-size: 12px;
}

.view {
  position: fixed; top: var(--topbar-h); left: 0; right: 0; bottom: 0;
  display: none;
}
.view.active { display: block; }

/* Reference view */
.view-ref { display: none; }
.view-ref.active {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: calc(100vh - var(--topbar-h));
}
.view-ref aside.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 22px 18px;
  overflow-y: auto;
  height: 100%;
}
.view-ref .tagline { color: var(--muted); font-size: 12px; margin-bottom: 18px; }
.view-ref .search {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border); outline: none;
  font-size: 13px; margin-bottom: 14px;
}
.view-ref .search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.view-ref .nav { list-style: none; margin: 0; padding: 0; }
.view-ref .nav li { margin-bottom: 2px; }
.view-ref .nav a {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 10px; color: var(--text); text-decoration: none; border-radius: 6px;
  font-size: 13px; gap: 8px;
}
.view-ref .nav a:hover { background: var(--surface-2); }
.view-ref .nav a code { color: var(--text); font-size: 12px; }
.view-ref .nav .count {
  font-size: 11px; color: var(--muted);
  background: var(--surface-2); padding: 1px 6px; border-radius: 999px;
}
.view-ref main { padding: 28px 40px 80px; max-width: 1200px; overflow-y: auto; height: 100%; }
.view-ref .hero {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 1px solid var(--border); padding-bottom: 22px; margin-bottom: 26px; gap: 24px;
}
.view-ref .hero h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.5px; }
.view-ref .hero .meta { color: var(--muted); font-size: 13px; }
.view-ref .hero-stats { display: flex; gap: 16px; }
.view-ref .hero-stats .stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  min-width: 110px;
  box-shadow: var(--shadow);
}
.view-ref .hero-stats .stat-card .num { font-size: 22px; font-weight: 700; }
.view-ref .hero-stats .stat-card .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
.view-ref .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
.view-ref .toolbar .filter-pill {
  font-size: 12px; padding: 6px 10px; border-radius: 999px;
  background: var(--surface); color: var(--text);
  border: 1px solid var(--border); cursor: pointer; user-select: none;
}
.view-ref .toolbar .filter-pill.active { background: var(--accent); color: white; border-color: var(--accent); }
.view-ref section.obj {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px 24px;
  margin-bottom: 22px;
  box-shadow: var(--shadow);
}
.view-ref .obj-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
.view-ref .obj-head h2 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.view-ref .obj-head .obj-label { color: var(--muted); font-weight: 500; font-size: 14px; }
.view-ref .stat-row { display: flex; gap: 14px; }
.view-ref .stat { font-size: 12px; color: var(--muted); }
.view-ref .stat strong { color: var(--text); margin-right: 4px; font-size: 14px; }
.view-ref .obj-desc { color: var(--muted); margin: 6px 0 14px; font-size: 14px; }
.view-ref table.fields { width: 100%; border-collapse: collapse; font-size: 13px; }
.view-ref table.fields th {
  text-align: left; padding: 10px 12px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface);
}
.view-ref table.fields td {
  padding: 12px; border-bottom: 1px solid var(--border); vertical-align: top;
}
.view-ref table.fields tr:last-child td { border-bottom: none; }
.view-ref code.api { font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace; color: var(--cyan); font-size: 12.5px; }
.view-ref .type {
  font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
  font-size: 11.5px; padding: 3px 8px; border-radius: 6px;
  background: var(--surface-2); color: var(--text); white-space: nowrap;
}
.view-ref .type-string, .view-ref .type-textarea { color: var(--green); }
.view-ref .type-reference { color: var(--cyan); }
.view-ref .type-picklist, .view-ref .type-multipicklist { color: var(--pink); }
.view-ref .type-boolean { color: var(--yellow); }
.view-ref .type-currency, .view-ref .type-double, .view-ref .type-percent, .view-ref .type-int { color: var(--orange); }
.view-ref .type-date, .view-ref .type-datetime, .view-ref .type-time { color: var(--accent); }
.view-ref .flag {
  display: inline-block; padding: 2px 7px; margin-right: 4px; margin-bottom: 2px;
  font-size: 10.5px; letter-spacing: 0.4px; text-transform: uppercase;
  border-radius: 999px; background: var(--surface-2); color: var(--muted);
  border: 1px solid var(--border);
}
.view-ref .flag-required { color: var(--red); border-color: var(--red); }
.view-ref .flag-unique { color: var(--accent); border-color: var(--accent); }
.view-ref .flag-custom { color: var(--green); border-color: var(--green); }
.view-ref .flag-formula { color: var(--orange); border-color: var(--orange); }
.view-ref .flag-external-id { color: var(--cyan); border-color: var(--cyan); }
.view-ref .cls-cell { white-space: normal; }
.view-ref .class-sec, .view-ref .class-comp, .view-ref .class-biz {
  display: inline-block; padding: 2px 7px; margin-right: 4px; margin-bottom: 3px;
  font-size: 10.5px; letter-spacing: 0.3px; border-radius: 999px;
  border: 1px solid var(--border); white-space: nowrap;
}
.view-ref .class-sec { color: var(--red); border-color: var(--red); background: rgba(255, 122, 138, 0.10); }
.view-ref .class-comp { color: var(--orange); border-color: var(--orange); background: rgba(245, 167, 107, 0.10); }
.view-ref .class-biz { color: var(--cyan); border-color: var(--cyan); background: rgba(108, 218, 255, 0.10); }
.view-ref .tag {
  display: inline-block; padding: 1px 6px; margin-left: 4px;
  font-size: 10px; border-radius: 4px; background: var(--accent-soft); color: var(--accent);
}
.view-ref .tag-warn { background: rgba(255, 122, 138, 0.18); color: var(--red); }
.view-ref .tag-custom { background: rgba(88, 214, 141, 0.18); color: var(--green); }
.view-ref .desc { font-size: 12.5px; color: var(--text); margin-bottom: 4px; }
.view-ref .help { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.view-ref .muted { color: var(--muted); }
.view-ref details.picklist, .view-ref details.formula { margin-top: 6px; }
.view-ref details summary { cursor: pointer; font-size: 11.5px; color: var(--accent); user-select: none; }
.view-ref details ul { margin: 6px 0 0; padding-left: 18px; font-size: 12.5px; }
.view-ref details ul li { margin-bottom: 2px; }
.view-ref details pre {
  background: var(--surface-2); padding: 10px 12px; border-radius: 6px;
  font-size: 12px; overflow-x: auto; margin: 6px 0 0;
}
.view-ref .empty-ref { padding: 80px 20px; text-align: center; color: var(--muted); }
@media (max-width: 900px) {
  .view-ref.active { grid-template-columns: 1fr; }
  .view-ref aside.sidebar { display: none; }
  .view-ref main { padding: 22px 18px 60px; }
}
`;

const REF_SCRIPT = `
(function () {
  const search = document.getElementById('search');
  const navLinks = Array.from(document.querySelectorAll('.view-ref .nav a'));
  const sections = Array.from(document.querySelectorAll('.view-ref section.obj'));
  const filterPills = Array.from(document.querySelectorAll('.view-ref .filter-pill'));
  const themeToggle = document.getElementById('themeToggle');
  const emptyRef = document.getElementById('emptyRef');

  function applyFilter() {
    const q = (search.value || '').toLowerCase();
    const activePill = document.querySelector('.view-ref .filter-pill.active');
    const flagFilter = activePill ? activePill.dataset.flag : '';
    let visibleCount = 0;
    sections.forEach((sec) => {
      const text = (sec.dataset.name + ' ' + sec.dataset.label).toLowerCase();
      const matchesQuery = !q || text.includes(q) || sec.querySelector('tbody').textContent.toLowerCase().includes(q);
      let matchesFlag = true;
      if (flagFilter === 'custom') matchesFlag = sec.dataset.name.endsWith('__c');
      if (flagFilter === 'standard') matchesFlag = !sec.dataset.name.endsWith('__c');
      const show = matchesQuery && matchesFlag;
      sec.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });
    navLinks.forEach((a) => {
      const target = a.getAttribute('href').slice(1);
      const sec = document.getElementById(target);
      a.style.display = sec && sec.style.display !== 'none' ? '' : 'none';
    });
    emptyRef.style.display = visibleCount === 0 ? '' : 'none';
  }

  search.addEventListener('input', applyFilter);
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const wasActive = pill.classList.contains('active');
      filterPills.forEach((p) => p.classList.remove('active'));
      if (!wasActive) pill.classList.add('active');
      applyFilter();
    });
  });

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ddg-theme', next); } catch (e) {}
  });
  try {
    const saved = localStorage.getItem('ddg-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  } catch (e) {}
})();
`;

const TAB_SCRIPT = `
(function () {
  const tabs = Array.from(document.querySelectorAll('.topbar .tab'));
  const views = {
    reference: document.getElementById('view-reference'),
    schema: document.getElementById('view-schema'),
  };
  function activate(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    Object.entries(views).forEach(([k, v]) => v.classList.toggle('active', k === name));
    if (name === 'schema' && typeof window.__initSchemaView === 'function') {
      // Defer so the layout has applied before D3 measures the canvas.
      requestAnimationFrame(() => window.__initSchemaView());
    }
  }
  tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.view)));
})();
`;

export async function buildHtml({ outputDir, baseName, objects }: BuildOptions): Promise<string> {
  const filePath = path.join(outputDir, `${baseName}.html`);
  const totalFields = objects.reduce((acc, o) => acc + o.fields.length, 0);
  const customCount = objects.filter((o) => o.custom).length;

  const navItems = objects
    .map(
      (o) => `
        <li>
          <a href="#obj-${escapeHtml(o.apiName)}">
            <code class="api">${escapeHtml(o.apiName)}</code>
            <span class="count">${o.fields.length}</span>
          </a>
        </li>`
    )
    .join('');

  const cards = objects.map(renderObjectCard).join('');

  const d3Source = await loadD3Source();
  const schema = renderSchemaPanel({ objects, baseName });

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(baseName)} — Data Dictionary</title>
<style>${SHARED_STYLES}${SCHEMA_STYLES}</style>
<script>${d3Source}</script>
</head>
<body>
<nav class="topbar">
  <div class="brand"><span class="brand-mark">DD</span> ${escapeHtml(baseName)}</div>
  <div class="tabs">
    <button class="tab active" data-view="reference">Reference</button>
    <button class="tab" data-view="schema">Schema map</button>
  </div>
  <div class="topbar-right">
    <span>${objects.length} objects · ${totalFields} fields</span>
    <button id="themeToggle" class="theme-toggle">Toggle theme</button>
  </div>
</nav>

<div id="view-reference" class="view view-ref active">
  <aside class="sidebar">
    <div class="tagline">Reference · ${objects.length} objects</div>
    <input id="search" class="search" placeholder="Search objects or fields…" />
    <ul class="nav">${navItems}</ul>
  </aside>
  <main>
    <section class="hero">
      <div>
        <h1>Data Dictionary</h1>
        <div class="meta">Generated ${new Date().toISOString()}</div>
      </div>
      <div class="hero-stats">
        <div class="stat-card"><div class="num">${objects.length}</div><div class="lbl">Objects</div></div>
        <div class="stat-card"><div class="num">${customCount}</div><div class="lbl">Custom</div></div>
        <div class="stat-card"><div class="num">${totalFields}</div><div class="lbl">Fields</div></div>
      </div>
    </section>
    <div class="toolbar">
      <span class="filter-pill" data-flag="custom">Custom only</span>
      <span class="filter-pill" data-flag="standard">Standard only</span>
    </div>
    ${cards}
    <div id="emptyRef" class="empty-ref" style="display:none">No matching objects.</div>
  </main>
</div>

<div id="view-schema" class="view view-schema">${schema.html}</div>

<script>${schema.dataScript}</script>
<script>${REF_SCRIPT}${SCHEMA_SCRIPT}${TAB_SCRIPT}</script>
</body>
</html>`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, html, 'utf8');
  return filePath;
}
