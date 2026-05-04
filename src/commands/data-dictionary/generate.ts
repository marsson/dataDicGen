import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Flags, SfCommand, requiredOrgFlagWithDeprecations } from '@salesforce/sf-plugins-core';
import { Logger, Messages, SfError } from '@salesforce/core';
import { selectSObjects, validateStandardObjects } from '../../shared/filter.js';
import { loadDictionary } from '../../shared/dictionary.js';
import { buildJson } from '../../shared/builders/jsonBuilder.js';
import { buildMarkdown } from '../../shared/builders/mdBuilder.js';
import { buildHtml } from '../../shared/builders/htmlBuilder.js';

const require = createRequire(import.meta.url);
const ConfigFactory = require('../../includes/config.cjs');
const DownloaderFactory = require('../../includes/downloader.cjs');
const ExcelBuilder = require('../../includes/excelbuilder.cjs');
const TheUtils = require('../../includes/utils.cjs');

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sfdxdatadicgen', 'generate');

const ALLOWED_FORMATS = ['xlsx', 'html', 'json', 'md'] as const;
type AllowedFormat = (typeof ALLOWED_FORMATS)[number];

export type GenerateResult = {
  outputs: Array<{ format: AllowedFormat; path: string }>;
};

export default class GenerateDataDictionary extends SfCommand<GenerateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly aliases = ['dataDictionary:generate'];
  public static readonly deprecateAliases = true;

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    output: Flags.string({
      char: 'f',
      summary: messages.getMessage('flags.output.summary'),
    }),
    includemanaged: Flags.boolean({
      char: 'm',
      summary: messages.getMessage('flags.includemanaged.summary'),
    }),
    includestandardsobjects: Flags.string({
      char: 's',
      multiple: true,
      delimiter: ',',
      summary: messages.getMessage('flags.includestandardsobjects.summary'),
    }),
    includemanagedpackages: Flags.string({
      char: 'l',
      multiple: true,
      delimiter: ',',
      summary: messages.getMessage('flags.includemanagedpackages.summary'),
    }),
    format: Flags.string({
      char: 't',
      multiple: true,
      delimiter: ',',
      summary: messages.getMessage('flags.format.summary'),
    }),
  };

  public async run(): Promise<GenerateResult> {
    const { flags } = await this.parse(GenerateDataDictionary);

    const formats = flags.format ?? ['xlsx'];
    const invalid = formats.filter((f) => !(ALLOWED_FORMATS as readonly string[]).includes(f));
    if (invalid.length > 0) {
      throw new SfError(messages.getMessage('errors.unknownFormat', [invalid.join(', ')]));
    }
    const requested = new Set(formats as AllowedFormat[]);

    const config = new ConfigFactory();
    const utils = new TheUtils();

    const username = flags['target-org'].getUsername();
    if (flags.output == null) {
      config.projectName = username;
    } else {
      config.output = path.dirname(flags.output);
      config.projectName = path.basename(flags.output);
    }

    config.validate();

    const conn = flags['target-org'].getConnection();
    const res = await conn.describeGlobal();
    const sObjectNames = res.sobjects.map((sObject) => sObject.name);

    validateStandardObjects(flags.includestandardsobjects, sObjectNames, (name) =>
      messages.getMessage('errors.noMatchingObject', [name])
    );

    const filteredArray = selectSObjects({
      available: sObjectNames,
      standardInput: flags.includestandardsobjects,
      includeManaged: flags.includemanaged === true,
      includeManagedNamespaces: flags.includemanagedpackages,
      classifier: {
        isCustomObject: (name: string) => utils.isCustomObject(name) as boolean,
        isManagedPackageObject: (name: string) => utils.isManagedPackageObject(name) as boolean,
      },
    });

    config.objects.push(...filteredArray);
    config.objects = Array.from(new Set(config.objects as string[]));

    const logger = await Logger.child(this.constructor.name);
    const loggerInfo = logger.info.bind(logger);
    const downloader = new DownloaderFactory(config, loggerInfo, conn);

    const size = await downloader.execute();
    this.log(`${size} downloaded`);

    const outputs: GenerateResult['outputs'] = [];

    if (requested.has('xlsx')) {
      const builder = new ExcelBuilder(config, loggerInfo);
      await builder.generate();
      outputs.push({ format: 'xlsx', path: config.output as string });
    }

    if (requested.has('html') || requested.has('json') || requested.has('md')) {
      const filesDir = resolveFilesDir();
      const objects = await loadDictionary(filesDir, config.objects as string[]);
      const outputDir = (config.output as string) ?? '.';
      const baseName = stripExt(config.projectName as string);

      if (requested.has('json')) {
        outputs.push({ format: 'json', path: await buildJson({ outputDir, baseName, objects }) });
      }
      if (requested.has('md')) {
        outputs.push({ format: 'md', path: await buildMarkdown({ outputDir, baseName, objects }) });
      }
      if (requested.has('html')) {
        const htmlPath = await buildHtml({ outputDir, baseName, objects });
        outputs.push({ format: 'html', path: htmlPath });
      }
    }

    for (const out of outputs) {
      this.log(`${out.format.padEnd(7)} → ${out.path}`);
    }

    return { outputs };
  }
}

function stripExt(name: string): string {
  const ext = path.extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

function resolveFilesDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', 'files');
}
