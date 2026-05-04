import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { ObjectEntry, extractRelationships } from '../dictionary.js';

const require = createRequire(import.meta.url);

let cachedD3Source: string | null = null;

export async function loadD3Source(): Promise<string> {
  if (cachedD3Source != null) return cachedD3Source;
  // d3's package "exports" only expose ./dist/d3.min.js under the "umd" condition,
  // which require.resolve can't request directly — resolve the main entry and walk up.
  const d3Main = require.resolve('d3');
  const d3Path = path.resolve(path.dirname(d3Main), '..', 'dist', 'd3.min.js');
  cachedD3Source = await fs.readFile(d3Path, 'utf8');
  return cachedD3Source;
}

export const SCHEMA_STYLES = `
/* .view-schema.active selector is intentional: it must beat .view.active's display:block
   (same specificity, later in source) so the schema container becomes a left/right grid. */
.view-schema { display: none; }
.view-schema.active {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: calc(100vh - var(--topbar-h));
  min-height: 0;
}
.view-schema .s-aside {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.view-schema .s-head { padding: 18px 18px 14px; border-bottom: 1px solid var(--border); }
.view-schema .s-head .title { font-weight: 700; font-size: 14px; }
.view-schema .s-subtitle { color: var(--muted); font-size: 12px; margin-top: 2px; }
.view-schema .s-controls {
  padding: 14px 18px; border-bottom: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 10px;
}
.view-schema .s-search {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border); outline: none; font-size: 13px;
}
.view-schema .s-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.view-schema .s-btn-row { display: flex; gap: 6px; flex-wrap: wrap; }
.view-schema .s-btn {
  padding: 6px 10px; font-size: 11.5px; border-radius: 6px;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border); cursor: pointer; flex: 1; min-width: 0;
  white-space: nowrap;
}
.view-schema .s-btn:hover { border-color: var(--accent); color: var(--accent); }
.view-schema .s-btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
.view-schema .s-btn-primary:hover { color: white; opacity: 0.9; }
.view-schema .s-list { flex: 1; overflow-y: auto; padding: 8px 10px; min-height: 0; }
.view-schema .s-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 8px; border-radius: 6px; cursor: pointer;
  font-size: 12.5px; user-select: none;
}
.view-schema .s-item:hover { background: var(--surface-2); }
.view-schema .s-item input { accent-color: var(--accent); cursor: pointer; }
.view-schema .s-item .api {
  font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
  color: var(--cyan); font-size: 12px;
}
.view-schema .s-item .badge { margin-left: auto; font-size: 10px; color: var(--muted); }
.view-schema .s-item.custom .api { color: var(--green); }
.view-schema .s-footer {
  padding: 12px 18px; font-size: 11.5px; color: var(--muted);
  border-top: 1px solid var(--border);
  display: flex; justify-content: space-between;
}
.view-schema .s-main { position: relative; min-width: 0; min-height: 0; overflow: hidden; }
.view-schema #s-chart { width: 100%; height: 100%; display: block; }
.view-schema .s-legend {
  position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 16px; font-size: 12px;
  box-shadow: var(--shadow);
  display: flex; gap: 22px; flex-wrap: wrap; align-items: center;
}
.view-schema .s-legend-row { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.view-schema .s-swatch {
  width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
  border: 1.5px solid var(--accent);
  background: rgba(109, 142, 255, 0.18);
}
.view-schema .s-swatch.custom { border-color: var(--green); background: rgba(88, 214, 141, 0.18); }
.view-schema .s-line { width: 26px; height: 0; flex-shrink: 0; }
.view-schema .s-line.lookup { border-bottom: 2px dashed var(--lookup, #8a93a6); }
.view-schema .s-line.master { border-bottom: 3px solid var(--md, #f5a76b); }
.view-schema .s-detail {
  position: absolute; top: 16px; right: 16px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 14px 16px; font-size: 12.5px;
  width: 280px; max-height: calc(100% - 32px); overflow-y: auto;
  box-shadow: var(--shadow); display: none;
}
.view-schema .s-detail.show { display: block; }
.view-schema .s-detail h3 { margin: 0 0 4px; font-size: 14px; }
.view-schema .s-detail h3 code { color: var(--cyan); }
.view-schema .s-detail .desc { color: var(--muted); font-size: 11.5px; margin-bottom: 8px; }
.view-schema .s-detail ul { margin: 0; padding-left: 16px; font-size: 11.5px; max-height: 200px; overflow-y: auto; }
.view-schema .s-detail .close {
  float: right; background: none; border: none; color: var(--muted);
  cursor: pointer; font-size: 16px; padding: 0; line-height: 1;
}
.view-schema .s-detail .kind-md { color: var(--md, #f5a76b); font-weight: 600; }
.view-schema .s-detail .kind-lookup { color: var(--lookup, #8a93a6); }
.view-schema .s-empty {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--muted); font-size: 13px; pointer-events: none;
  padding: 0 40px; text-align: center;
}
@media (max-width: 900px) {
  .view-schema { grid-template-columns: 1fr; }
  .view-schema .s-aside { display: none; }
}
`;

export const SCHEMA_SCRIPT = `
window.__initSchemaView = function () {
  if (window.__schemaInited) { window.__updateSchemaView && window.__updateSchemaView(); return; }
  window.__schemaInited = true;

  const empty = document.getElementById('s-empty');
  if (typeof d3 === 'undefined') {
    empty.textContent = 'Schema viewer failed to load D3.js. Please regenerate this file.';
    empty.style.display = 'flex';
    return;
  }
  const data = window.__SCHEMA_DATA__;
  const search = document.getElementById('s-search');
  const list = document.getElementById('s-list');
  const selectedCount = document.getElementById('s-count');
  const detail = document.getElementById('s-detail');

  const objectsByName = new Map(data.objects.map((o) => [o.apiName, o]));
  const selected = new Set(data.objects.map((o) => o.apiName));
  function nodeBoxWidth(name) { return Math.max(96, Math.ceil(name.length * 6.6) + 22); }
  const NODE_HEIGHT = 30;

  function renderList() {
    const q = (search.value || '').toLowerCase();
    list.innerHTML = '';
    data.objects.forEach((o) => {
      if (q && !o.apiName.toLowerCase().includes(q) && !o.label.toLowerCase().includes(q)) return;
      const row = document.createElement('label');
      row.className = 's-item' + (o.custom ? ' custom' : '');
      row.innerHTML = '<input type="checkbox" ' + (selected.has(o.apiName) ? 'checked' : '') + '/>'
        + '<span class="api">' + o.apiName + '</span>'
        + '<span class="badge">' + o.fieldCount + 'f</span>';
      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(o.apiName); else selected.delete(o.apiName);
        update();
      });
      list.appendChild(row);
    });
  }

  function setSelection(predicate) {
    selected.clear();
    data.objects.forEach((o) => { if (predicate(o)) selected.add(o.apiName); });
    renderList();
    update();
  }

  document.getElementById('s-selAll').addEventListener('click', () => setSelection(() => true));
  document.getElementById('s-selClear').addEventListener('click', () => setSelection(() => false));
  document.getElementById('s-selCustom').addEventListener('click', () => setSelection((o) => o.custom));
  document.getElementById('s-selStandard').addEventListener('click', () => setSelection((o) => !o.custom));
  document.getElementById('s-selConnected').addEventListener('click', () => {
    const connectedNames = new Set();
    data.relationships.forEach((r) => { connectedNames.add(r.from); connectedNames.add(r.to); });
    setSelection((o) => connectedNames.has(o.apiName));
  });
  search.addEventListener('input', renderList);

  const svg = d3.select('#s-chart');
  const g = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', (event) => g.attr('transform', event.transform));
  svg.call(zoom);

  let simulation = null;

  function update() {
    selectedCount.textContent = selected.size + ' selected';

    const nodes = data.objects
      .filter((o) => selected.has(o.apiName))
      .map((o) => ({ ...o, boxWidth: nodeBoxWidth(o.apiName), boxHeight: NODE_HEIGHT }));
    const nodeSet = new Set(nodes.map((n) => n.apiName));
    const links = data.relationships
      .filter((r) => nodeSet.has(r.from) && nodeSet.has(r.to))
      .map((r) => ({ source: r.from, target: r.to, viaField: r.viaField, fieldLabel: r.fieldLabel, kind: r.kind }));

    empty.style.display = nodes.length === 0 ? 'flex' : 'none';

    g.selectAll('*').remove();
    if (nodes.length === 0) { if (simulation) simulation.stop(); return; }

    const main = svg.node().parentElement;
    const rect = main.getBoundingClientRect();
    const width = Math.max(400, rect.width || window.innerWidth - 320);
    const height = Math.max(400, rect.height || window.innerHeight);
    svg.attr('width', width).attr('height', height).attr('viewBox', '0 0 ' + width + ' ' + height);

    if (simulation) simulation.stop();
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.apiName).distance(140).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-520))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d) => Math.max(d.boxWidth, d.boxHeight) / 2 + 12));

    const linkSel = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => d.kind === 'master-detail' ? '#f5a76b' : '#8a93a6')
      .attr('stroke-opacity', (d) => d.kind === 'master-detail' ? 0.85 : 0.55)
      .attr('stroke-width', (d) => d.kind === 'master-detail' ? 2.2 : 1.3)
      .attr('stroke-dasharray', (d) => d.kind === 'master-detail' ? null : '4 3');

    const nodeSel = g.append('g')
      .selectAll('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    nodeSel.append('rect')
      .attr('x', (d) => -d.boxWidth / 2)
      .attr('y', (d) => -d.boxHeight / 2)
      .attr('width', (d) => d.boxWidth)
      .attr('height', (d) => d.boxHeight)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => d.custom ? 'rgba(88, 214, 141, 0.18)' : 'rgba(109, 142, 255, 0.18)')
      .attr('stroke', (d) => d.custom ? '#58d68d' : '#6d8eff')
      .attr('stroke-width', 1.5);

    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#e6e8ee')
      .attr('font-family', 'ui-monospace, "SF Mono", Menlo, monospace')
      .attr('font-size', 11.5)
      .attr('pointer-events', 'none')
      .text((d) => d.apiName);

    nodeSel.on('click', (event, d) => {
      const obj = objectsByName.get(d.apiName);
      const peers = data.relationships.filter((r) => r.from === d.apiName || r.to === d.apiName);
      detail.classList.add('show');
      detail.innerHTML = '<button class="close" id="s-detailClose">×</button>'
        + '<h3><code>' + obj.apiName + '</code></h3>'
        + '<div class="desc">' + (obj.label || '') + ' · ' + obj.fieldCount + ' fields</div>'
        + (obj.description ? '<div class="desc">' + obj.description + '</div>' : '')
        + '<strong>Relationships</strong>'
        + (peers.length === 0 ? '<div class="desc">No relationships in current selection.</div>' :
          '<ul>' + peers.map((p) => {
            const direction = p.from === d.apiName ? '→' : '←';
            const other = p.from === d.apiName ? p.to : p.from;
            const kindClass = p.kind === 'master-detail' ? 'kind-md' : 'kind-lookup';
            const kindLabel = p.kind === 'master-detail' ? 'master-detail' : 'lookup';
            return '<li>' + direction + ' <code>' + other + '</code> · '
              + '<span class="' + kindClass + '">' + kindLabel + '</span> · '
              + '<span class="desc" style="display:inline">' + p.viaField + '</span></li>';
          }).join('') + '</ul>');
      document.getElementById('s-detailClose').addEventListener('click', () => detail.classList.remove('show'));
    });

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      nodeSel.attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')');
    });
  }

  window.__updateSchemaView = update;
  renderList();
  update();
  window.addEventListener('resize', () => { if (window.__schemaInited) update(); });
};
`;

export type SchemaPanelOpts = { objects: ObjectEntry[]; baseName: string };

export type SchemaPanelParts = {
  html: string;
  dataScript: string;
  relationshipCount: number;
};

export function renderSchemaPanel({ objects, baseName }: SchemaPanelOpts): SchemaPanelParts {
  const relationships = extractRelationships(objects);
  const data = {
    project: baseName,
    objects: objects.map((o) => ({
      apiName: o.apiName,
      label: o.label,
      description: o.description,
      custom: o.custom,
      fieldCount: o.fields.length,
    })),
    relationships,
  };
  const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');

  const html = `
    <aside class="s-aside">
      <div class="s-head">
        <div class="title">Schema map</div>
        <div class="s-subtitle">${objects.length} objects · ${relationships.length} relationships</div>
      </div>
      <div class="s-controls">
        <input id="s-search" class="s-search" placeholder="Filter objects…" />
        <div class="s-btn-row">
          <button id="s-selAll" class="s-btn s-btn-primary">All</button>
          <button id="s-selClear" class="s-btn">None</button>
          <button id="s-selConnected" class="s-btn">Connected</button>
        </div>
        <div class="s-btn-row">
          <button id="s-selCustom" class="s-btn">Custom</button>
          <button id="s-selStandard" class="s-btn">Standard</button>
        </div>
      </div>
      <div id="s-list" class="s-list"></div>
      <div class="s-footer">
        <span id="s-count">${objects.length} selected</span>
        <span>drag · scroll to zoom</span>
      </div>
    </aside>
    <main class="s-main">
      <svg id="s-chart"></svg>
      <div class="s-legend">
        <div class="s-legend-row"><span class="s-swatch"></span> Standard object</div>
        <div class="s-legend-row"><span class="s-swatch custom"></span> Custom object</div>
        <div class="s-legend-row"><span class="s-line lookup"></span> Lookup</div>
        <div class="s-legend-row"><span class="s-line master"></span> Master-detail</div>
      </div>
      <div id="s-detail" class="s-detail"></div>
      <div id="s-empty" class="s-empty" style="display:none">Select objects from the sidebar.</div>
    </main>`;

  const dataScript = `window.__SCHEMA_DATA__ = ${dataJson};`;

  return { html, dataScript, relationshipCount: relationships.length };
}
