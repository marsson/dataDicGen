import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type PicklistValue = {
  label: string;
  value: string;
  active: boolean;
  defaultValue: boolean;
};

export type RelationshipKind = 'master-detail' | 'lookup';

export type FieldEntry = {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  description?: string | null;
  inlineHelpText?: string | null;
  required: boolean;
  unique: boolean;
  externalId: boolean;
  custom: boolean;
  referenceTo: string[];
  relationshipName?: string | null;
  relationshipKind?: RelationshipKind | null;
  picklistValues: PicklistValue[];
  formula?: string | null;
  defaultValue?: string | null;
};

export type ObjectEntry = {
  apiName: string;
  label: string;
  description?: string | null;
  custom: boolean;
  fields: FieldEntry[];
};

export type Relationship = {
  from: string;
  to: string;
  viaField: string;
  fieldLabel: string;
  kind: RelationshipKind;
};

type RawDescribeField = {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  inlineHelpText?: string | null;
  nillable?: boolean;
  unique?: boolean;
  externalId?: boolean;
  custom?: boolean;
  cascadeDelete?: boolean;
  referenceTo?: string[];
  relationshipName?: string | null;
  picklistValues?: Array<{ label?: string; value: string; active?: boolean; defaultValue?: boolean }>;
  calculatedFormula?: string | null;
  defaultValueFormula?: string | null;
};

type RawMetadataField = {
  fullName: string;
  label?: string;
  type?: string;
  description?: string | null;
  inlineHelpText?: string | null;
  formula?: string | null;
};

type RawMetadataObject = {
  fullName?: string;
  label?: string;
  description?: string | null;
  fields?: RawMetadataField | RawMetadataField[];
};

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const buf = await fs.readFile(filePath, 'utf8');
    return JSON.parse(buf) as T;
  } catch (err) {
    if (err != null && (err as { code?: string }).code === 'ENOENT') return null;
    throw err;
  }
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export async function loadObject(filesDir: string, objectName: string): Promise<ObjectEntry | null> {
  const describePath = path.join(filesDir, 'describe', `${objectName}.json`);
  const metadataPath = path.join(filesDir, 'metadata', `${objectName}.json`);

  const describeFields = await readJsonIfExists<RawDescribeField[]>(describePath);
  if (describeFields == null) return null;

  const metadata = await readJsonIfExists<RawMetadataObject>(metadataPath);
  const metaFieldsByName = new Map<string, RawMetadataField>();
  for (const mf of asArray(metadata?.fields)) {
    metaFieldsByName.set(mf.fullName, mf);
  }

  const fields: FieldEntry[] = describeFields.map((f) => {
    const meta = metaFieldsByName.get(f.name);
    let relationshipKind: RelationshipKind | null = null;
    if (f.type === 'reference') {
      relationshipKind = f.cascadeDelete === true || meta?.type === 'MasterDetail' ? 'master-detail' : 'lookup';
    }
    return {
      name: f.name,
      label: f.label,
      type: f.type,
      length: f.length,
      precision: f.precision,
      scale: f.scale,
      description: meta?.description ?? null,
      inlineHelpText: meta?.inlineHelpText ?? f.inlineHelpText ?? null,
      required: f.nillable === false,
      unique: f.unique === true,
      externalId: f.externalId === true,
      custom: f.custom === true,
      referenceTo: f.referenceTo ?? [],
      relationshipName: f.relationshipName ?? null,
      relationshipKind,
      picklistValues: (f.picklistValues ?? []).map((p) => ({
        label: p.label ?? p.value,
        value: p.value,
        active: p.active !== false,
        defaultValue: p.defaultValue === true,
      })),
      formula: meta?.formula ?? f.calculatedFormula ?? null,
      defaultValue: f.defaultValueFormula ?? null,
    };
  });

  fields.sort((a, b) => a.name.localeCompare(b.name));

  return {
    apiName: objectName,
    label: metadata?.label ?? objectName,
    description: metadata?.description ?? null,
    custom: objectName.endsWith('__c'),
    fields,
  };
}

export async function loadDictionary(filesDir: string, objectNames: string[]): Promise<ObjectEntry[]> {
  const loaded = await Promise.all(objectNames.map((name) => loadObject(filesDir, name)));
  return loaded
    .filter((o): o is ObjectEntry => o != null)
    .sort((a, b) => a.apiName.localeCompare(b.apiName));
}

export function extractRelationships(objects: ObjectEntry[]): Relationship[] {
  const knownNames = new Set(objects.map((o) => o.apiName));
  const edges: Relationship[] = [];
  for (const obj of objects) {
    for (const field of obj.fields) {
      if (field.type !== 'reference') continue;
      for (const target of field.referenceTo) {
        if (!knownNames.has(target)) continue;
        edges.push({
          from: obj.apiName,
          to: target,
          viaField: field.name,
          fieldLabel: field.label,
          kind: field.relationshipKind ?? 'lookup',
        });
      }
    }
  }
  return edges;
}
