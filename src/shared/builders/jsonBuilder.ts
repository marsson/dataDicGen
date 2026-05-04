import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ObjectEntry } from '../dictionary.js';

export type BuildOptions = {
  outputDir: string;
  baseName: string;
  objects: ObjectEntry[];
};

export async function buildJson({ outputDir, baseName, objects }: BuildOptions): Promise<string> {
  const filePath = path.join(outputDir, `${baseName}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    project: baseName,
    objectCount: objects.length,
    objects,
  };
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}
