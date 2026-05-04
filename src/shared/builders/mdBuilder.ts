import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { FieldEntry, ObjectEntry } from '../dictionary.js';

export type BuildOptions = {
  outputDir: string;
  baseName: string;
  objects: ObjectEntry[];
};

function escapeCell(value: string | null | undefined): string {
  if (value == null) return '';
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function describeType(field: FieldEntry): string {
  if (field.type === 'reference' && field.referenceTo.length > 0) {
    return `reference → ${field.referenceTo.join(', ')}`;
  }
  if (field.length != null && (field.type === 'string' || field.type === 'textarea')) {
    return `${field.type}(${field.length})`;
  }
  if (field.precision != null && (field.type === 'currency' || field.type === 'double' || field.type === 'percent')) {
    return `${field.type}(${field.precision},${field.scale ?? 0})`;
  }
  return field.type;
}

function renderFieldRow(field: FieldEntry): string {
  const flags: string[] = [];
  if (field.required) flags.push('required');
  if (field.unique) flags.push('unique');
  if (field.externalId) flags.push('external-id');
  if (field.custom) flags.push('custom');
  return [
    `\`${field.name}\``,
    escapeCell(field.label),
    escapeCell(describeType(field)),
    flags.join(', '),
    escapeCell(field.description ?? field.inlineHelpText ?? ''),
  ]
    .map((c) => c || ' ')
    .join(' | ');
}

function renderObjectSection(obj: ObjectEntry): string {
  const lines: string[] = [];
  lines.push(`## \`${obj.apiName}\` — ${obj.label}`);
  if (obj.description) {
    lines.push('');
    lines.push(`> ${obj.description}`);
  }
  lines.push('');
  lines.push('| API Name | Label | Type | Flags | Description |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const field of obj.fields) {
    lines.push(`| ${renderFieldRow(field)} |`);
  }

  const formulas = obj.fields.filter((f) => f.formula);
  if (formulas.length > 0) {
    lines.push('');
    lines.push('### Formulas');
    lines.push('');
    for (const f of formulas) {
      lines.push(`- **${f.name}** — \`${f.formula ?? ''}\``);
    }
  }

  const picklists = obj.fields.filter((f) => f.picklistValues.length > 0);
  if (picklists.length > 0) {
    lines.push('');
    lines.push('### Picklists');
    lines.push('');
    for (const f of picklists) {
      lines.push(`- **${f.name}**: ${f.picklistValues.map((p) => p.value).join(', ')}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export async function buildMarkdown({ outputDir, baseName, objects }: BuildOptions): Promise<string> {
  const filePath = path.join(outputDir, `${baseName}.md`);
  const totalFields = objects.reduce((acc, o) => acc + o.fields.length, 0);

  const sections: string[] = [];
  sections.push(`# ${baseName} — Data Dictionary`);
  sections.push('');
  sections.push(`_Generated ${new Date().toISOString()}_`);
  sections.push('');
  sections.push(`**${objects.length}** objects · **${totalFields}** fields`);
  sections.push('');
  sections.push('> **Default selection.** This dictionary always includes every custom object plus the standard objects `Account`, `Contact`, and `User`. To add more standard objects (for example `Opportunity` and `Lead`), pass `-s Opportunity,Lead`. To pull in managed-package objects, use `-m` (all of them) or `-l <namespace>` (only matching namespaces).');
  sections.push('');
  sections.push('## Index');
  sections.push('');
  for (const obj of objects) {
    sections.push(`- [\`${obj.apiName}\`](#${obj.apiName.toLowerCase()}--${obj.label.toLowerCase().replace(/\s+/g, '-')})`);
  }
  sections.push('');
  for (const obj of objects) {
    sections.push(renderObjectSection(obj));
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, sections.join('\n'), 'utf8');
  return filePath;
}
