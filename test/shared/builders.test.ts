import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect } from 'chai';
import { buildJson } from '../../src/shared/builders/jsonBuilder.js';
import { buildMarkdown } from '../../src/shared/builders/mdBuilder.js';
import { buildHtml } from '../../src/shared/builders/htmlBuilder.js';
import { renderSchemaPanel } from '../../src/shared/builders/schemaViewer.js';
import { allObjects } from './fixtures.js';

describe('shared/builders', () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ddg-out-'));
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  describe('buildJson', () => {
    it('writes a JSON file containing every object and field', async () => {
      const filePath = await buildJson({ outputDir, baseName: 'demo', objects: allObjects });
      expect(filePath).to.equal(path.join(outputDir, 'demo.json'));
      const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
      expect(parsed.objectCount).to.equal(allObjects.length);
      expect(parsed.objects).to.have.lengthOf(allObjects.length);
      expect(parsed.objects[0].fields).to.be.an('array');
      expect(parsed.generatedAt).to.match(/T/);
    });
  });

  describe('buildMarkdown', () => {
    it('writes a Markdown file with an index and one section per object', async () => {
      const filePath = await buildMarkdown({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(filePath).to.equal(path.join(outputDir, 'demo.md'));
      expect(content).to.include('# demo — Data Dictionary');
      expect(content).to.include('## `Account`');
      expect(content).to.include('## `Project__c`');
      expect(content).to.include('Total__c');
      expect(content).to.include('Amount__c * Quantity__c');
    });

    it('includes a default-selection note that mentions Opportunity and Lead as the example', async () => {
      const filePath = await buildMarkdown({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).to.include('Default selection');
      expect(content).to.include('`Account`');
      expect(content).to.include('`Contact`');
      expect(content).to.include('`User`');
      expect(content).to.include('-s Opportunity,Lead');
    });

    it('labels reference fields as lookup or master-detail (not just "reference")', async () => {
      const filePath = await buildMarkdown({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      // Contact.AccountId is a lookup, Project__c.Account__c is master-detail.
      expect(content).to.match(/AccountId[^|]+\|[^|]+\|[^|]*lookup → Account/);
      expect(content).to.match(/Account__c[^|]+\|[^|]+\|[^|]*master-detail → Account/);
      expect(content).to.not.match(/\|\s*reference → /);
    });

    it('emits a Classification column populated with security + compliance values', async () => {
      const filePath = await buildMarkdown({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).to.include('| API Name | Label | Type | Flags | Classification | Description |');
      expect(content).to.include('| --- | --- | --- | --- | --- | --- |');
      // Contact.Email carries Confidential + GDPR, PII.
      expect(content).to.match(/Email[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]*Confidential · GDPR, PII/);
    });

    it('escapes pipe characters in field metadata to keep tables valid', async () => {
      const objects = [{
        ...allObjects[0],
        fields: [{
          ...allObjects[0].fields[0],
          description: 'a | b | c',
        }],
      }];
      const filePath = await buildMarkdown({ outputDir, baseName: 'demo', objects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).to.include('a \\| b \\| c');
    });
  });

  describe('buildHtml (combined report + schema map)', () => {
    it('writes a single HTML file containing the reference view, the schema view, and an inlined D3', async () => {
      const filePath = await buildHtml({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(filePath).to.equal(path.join(outputDir, 'demo.html'));
      expect(content).to.include('<title>demo — Data Dictionary</title>');
      // Reference view content
      expect(content).to.include('id="obj-Account"');
      expect(content).to.include('id="obj-Project__c"');
      // Tabs
      expect(content).to.include('data-view="reference"');
      expect(content).to.include('data-view="schema"');
      // Schema view content (sidebar + canvas + legend)
      expect(content).to.include('id="s-chart"');
      expect(content).to.include('Standard object');
      expect(content).to.include('Custom object');
      expect(content).to.include('Lookup');
      expect(content).to.include('Master-detail');
      // Schema data + D3 are inlined; no external assets
      expect(content).to.include('window.__SCHEMA_DATA__ =');
      expect(content).to.not.include('cdn.jsdelivr.net');
      // No external script/style/link loads (D3 is inlined; XML namespace URLs in d3 are fine).
      expect(content).to.not.match(/<script\b[^>]*\bsrc=["']https?:/);
      expect(content).to.not.match(/<link\b[^>]*\bhref=["']https?:/);
      // Combined file should include the D3 bundle (~270 KB) plus the rest.
      expect(content.length).to.be.greaterThan(280_000);
    });

    it('produces no separate schema file in the output directory', async () => {
      await buildHtml({ outputDir, baseName: 'demo', objects: allObjects });
      const entries = await fs.readdir(outputDir);
      expect(entries).to.include('demo.html');
      expect(entries).to.not.include('demo-schema.html');
      expect(entries).to.not.include('schema');
    });

    it('renders a Classification column with security/compliance/business pills in the reference view', async () => {
      const filePath = await buildHtml({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).to.include('<th>Classification</th>');
      expect(content).to.include('class="class-sec"');
      expect(content).to.include('class="class-comp"');
      expect(content).to.include('>Confidential</span>');
      expect(content).to.include('>GDPR</span>');
      expect(content).to.include('>PII</span>');
    });

    it('labels reference fields as lookup or master-detail in the reference view type column', async () => {
      const filePath = await buildHtml({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).to.include('lookup → Account');
      expect(content).to.include('master-detail → Account');
      expect(content).to.not.include('>reference → ');
    });

    it('lazy-initializes the schema view on tab activation so D3 measures a sized canvas', async () => {
      const filePath = await buildHtml({ outputDir, baseName: 'demo', objects: allObjects });
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).to.include('window.__initSchemaView');
      expect(content).to.include('requestAnimationFrame');
    });
  });

  describe('renderSchemaPanel (schema view embedded by buildHtml)', () => {
    it('returns html + dataScript and includes a 4-row legend', () => {
      const parts = renderSchemaPanel({ objects: allObjects, baseName: 'demo' });
      expect(parts.html).to.include('id="s-chart"');
      expect(parts.html).to.include('Standard object');
      expect(parts.html).to.include('Custom object');
      expect(parts.html).to.include('Lookup');
      expect(parts.html).to.include('Master-detail');
      expect(parts.dataScript).to.include('window.__SCHEMA_DATA__ =');
      expect(parts.dataScript).to.include('"apiName":"Account"');
    });

    it('escapes </script> sequences inside the embedded JSON', () => {
      const objects = [{ ...allObjects[0], description: '</script><img src=x>' }];
      const parts = renderSchemaPanel({ objects, baseName: 'demo' });
      expect(parts.dataScript).to.not.include('</script><img');
      expect(parts.dataScript).to.include('\\u003c/script>');
    });

    it('reports the correct relationship count', () => {
      const parts = renderSchemaPanel({ objects: allObjects, baseName: 'demo' });
      // From fixtures: Contact→Account (lookup) and Project__c→Account (master-detail)
      expect(parts.relationshipCount).to.equal(2);
    });
  });

  describe('schema view script invariants (asserted against the combined HTML)', () => {
    let combined: string;

    beforeEach(async () => {
      const filePath = await buildHtml({ outputDir, baseName: 'demo', objects: allObjects });
      combined = await fs.readFile(filePath, 'utf8');
    });

    it('renders objects as rectangles sized to fit their API name', () => {
      expect(combined).to.include('nodeBoxWidth');
      expect(combined).to.include("nodeSel.append('rect')");
    });

    it('uses dashed strokes for lookups and solid strokes for master-detail edges', () => {
      expect(combined).to.include("d.kind === 'master-detail'");
      expect(combined).to.include("'4 3'");
    });

    it('every getElementById call in the embedded scripts targets a static or known-dynamic id', () => {
      const referenced = Array.from(combined.matchAll(/getElementById\('([^']+)'\)/g)).map((m) => m[1]);
      const declared = new Set(Array.from(combined.matchAll(/id="([^"]+)"/g)).map((m) => m[1]));
      // ids created at runtime via innerHTML inside the click handler:
      const knownDynamic = new Set(['s-detailClose']);
      const missing = Array.from(new Set(referenced)).filter(
        (id) => !declared.has(id) && !knownDynamic.has(id)
      );
      expect(missing, `Missing ids referenced by script: ${missing.join(', ')}`).to.deep.equal([]);
    });

    it('maps relationships into the {source, target} shape that d3.forceLink expects', () => {
      expect(combined).to.include('source: r.from');
      expect(combined).to.include('target: r.to');
    });

    it('declares the schema container with explicit height and runtime SVG sizing', () => {
      expect(combined).to.include('.view-schema');
      expect(combined).to.include("svg.attr('width', width).attr('height', height)");
    });

    it('lays the schema container out as a 2-column grid (sidebar + canvas) when active', () => {
      // Specificity bug guard: .view.active sets display:block; the schema container needs
      // .view-schema.active (or higher specificity) to win and apply display:grid.
      expect(combined).to.match(/\.view-schema\.active\s*\{[^}]*display:\s*grid/);
      expect(combined).to.match(/\.view-schema\.active\s*\{[^}]*grid-template-columns:\s*320px\s+1fr/);
    });
  });
});
