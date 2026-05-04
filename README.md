dataDicGen
==========

Improve the governance of your Salesforce implementation with this Salesforce CLI plugin that generates a Data Dictionary from any authenticated org — in **Excel, HTML, JSON, or Markdown** — plus an interactive **schema map** you can filter to as few or as many objects as you want.

[![Version](https://img.shields.io/npm/v/sfdxdatadicgen.svg)](https://npmjs.org/package/sfdxdatadicgen)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/marsson/dataDicGen?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/dataDicGen/branch/master)
[![Codecov](https://codecov.io/gh/marsson/dataDicGen/branch/master/graph/badge.svg)](https://codecov.io/gh/marsson/dataDicGen)
[![Downloads/week](https://img.shields.io/npm/dw/sfdxdatadicgen.svg)](https://npmjs.org/package/sfdxdatadicgen)
[![License](https://img.shields.io/npm/l/dataDicGen.svg)](https://github.com/marsson/dataDicGen/blob/master/package.json)

<!-- toc -->
* [Requirements](#requirements)
* [Installation](#installation)
* [Usage](#usage)
* [Output formats](#output-formats)
* [Schema map](#schema-map)
* [Commands](#commands)
* [Development](#development)
* [Donation](#donation)
<!-- tocstop -->

## Requirements

- Node.js **>= 18**
- The unified [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`). Legacy `sfdx` invocations still work via a deprecated alias.
- An authenticated org (`sf org login web`) before running the command.

## Installation

```sh-session
$ sf plugins install sfdxdatadicgen
```

Or from this repo:

```sh-session
$ sf plugins install https://github.com/marsson/dataDicGen
```

## Usage

```sh-session
# default: Excel
$ sf data-dictionary generate --target-org myOrg@example.com

# every format at once + schema map
$ sf data-dictionary generate -o myOrg --format xlsx,html,json,md

# HTML report + schema map only, custom output base
$ sf data-dictionary generate -o myOrg -f ./out/dict --format html

# include extra standard objects and a managed-package namespace
$ sf data-dictionary generate -o myOrg -m -s Case,Opportunity -l npsp__
```

### Default selection

Every run **always** includes:

- All custom objects (`__c`), excluding managed-package objects.
- The standard objects `Account`, `Contact`, and `User`.

Anything else is opt-in.

### Adding more standard objects (e.g. Opportunity and Lead)

Use the `-s` (`--includestandardsobjects`) flag with a comma-separated list of API names:

```sh-session
$ sf data-dictionary generate -o myOrg -s Opportunity,Lead --format md
```

This produces a Markdown dictionary containing **Account, Contact, User, Opportunity, Lead** plus all of your custom objects. The flag accepts as many objects as you want — repeat or extend the list:

```sh-session
$ sf data-dictionary generate -o myOrg -s Opportunity,Lead,Case,Product2 --format html,md
```

If any name in the list isn't present in the org, the command fails fast with a clear error so you don't end up with a half-empty dictionary.

> **Backwards compatibility.** The previous command name `dataDictionary:generate` is still accepted and prints a deprecation notice. `-o` is now `--target-org` (the SF CLI standard); the old `-o output` short was moved to `-f`. The long `--output` flag is unchanged.

## Output formats

Pick one or many with `--format` / `-t` (default `xlsx`). Outputs are written to the directory of `--output` using its basename (or to the current directory using the org username when `--output` is omitted).

| Format | File          | What it is                                                                                |
| ------ | ------------- | ----------------------------------------------------------------------------------------- |
| `xlsx` | `<base>.xlsx` | The classic multi-sheet Excel workbook (one sheet per object).                            |
| `html` | `<base>.html` | Self-contained interactive HTML report **with the schema map embedded** (Reference / Schema map tabs). |
| `json` | `<base>.json` | Single JSON document with every object, field, picklist, and relationship.                |
| `md`   | `<base>.md`   | Markdown reference with an index and one section per object.                              |

### HTML report highlights

A single `<base>.html` file with a top tab bar that switches between two views:

**Reference**
- Sticky sidebar with searchable object list and per-object field counts.
- Hero header with object / custom / field totals.
- Sticky table headers, color-coded type badges, expandable picklist & formula details.
- One-click filter pills for *Custom only* / *Standard only*.
- Light / dark theme toggle (preference saved in `localStorage`).

**Schema map**
- Force-directed D3 graph rendered as rounded rectangles sized to fit each API name.
- Sidebar checkbox list — pick **as few or as many objects as you want**, or use bulk buttons:
  - **All** — every object selected.
  - **None** — clear the canvas.
  - **Connected** — only objects that participate in at least one relationship.
  - **Custom** / **Standard** — quick partition.
- Live search to narrow the sidebar.
- Drag nodes, scroll to zoom, click a node for details (label, description, incoming/outgoing relationships).
- Bottom legend distinguishing standard objects, custom objects, lookups, and master-detail.
- Edge styling: **dashed gray** for lookups, **solid orange (thicker)** for master-detail.

The HTML file is **fully self-contained** — D3.js is bundled inline, so there are no external assets and no internet connection is required to open it.

<!-- commands -->
## Commands

### `sf data-dictionary generate`

```
USAGE
  $ sf data-dictionary generate -o <value> [--json] [--flags-dir <value>]
    [-f <value>] [-m] [-s <value>...] [-l <value>...] [-t <value>...]

FLAGS
  -o, --target-org=<value>                  (required) Username or alias of the target org.
  -f, --output=<value>                      Destination directory + base file name
                                            (extension is appended per format).
  -t, --format=<value>...                   Output formats (xlsx, html, json, md).
                                            Comma-separated. Default: xlsx.
  -m, --includemanaged                      Include objects from all managed packages.
  -s, --includestandardsobjects=<value>...  Comma-separated standard objects to include
                                            in addition to Account, Contact, and User.
  -l, --includemanagedpackages=<value>...   Comma-separated namespaces of managed packages
                                            whose objects should be included.

GLOBAL FLAGS
  --flags-dir=<value>                       Import flag values from a directory.
  --json                                    Format output as json.

ALIASES
  $ sf dataDictionary:generate    (deprecated)
```
<!-- commandsstop -->

### Behavior

- Every custom object (`__c`, excluding managed-package objects) is always included.
- The standard objects `Account`, `Contact`, and `User` are always included. Use `--includestandardsobjects` to add more.
- `--includemanaged` includes **every** managed-package object — use `--includemanagedpackages` to scope by namespace prefix.
- `--format` accepts a comma-separated list. Repeating the flag works too: `-t xlsx -t html`.

## Development

```sh-session
$ git clone https://github.com/marsson/dataDicGen.git
$ cd dataDicGen
$ npm install
$ npm run build
$ npm test
$ npm run lint
```

Run the plugin locally without installing:

```sh-session
$ ./bin/dev.js data-dictionary generate -o myOrg@example.com --format html,json,md
```

Or link it into your global `sf` CLI:

```sh-session
$ sf plugins link .
$ sf data-dictionary generate -o myOrg@example.com --format xlsx,html,json,md
```

### Project layout

- `src/commands/data-dictionary/generate.ts` — the SF command (sf-plugins-core).
- `src/shared/filter.ts` — pure helpers for sObject selection.
- `src/shared/dictionary.ts` — describe + metadata loader, relationship extraction.
- `src/shared/builders/jsonBuilder.ts` — JSON output.
- `src/shared/builders/mdBuilder.ts` — Markdown output.
- `src/shared/builders/htmlBuilder.ts` — interactive HTML report (combines the reference view and the embedded schema map).
- `src/shared/builders/schemaViewer.ts` — schema-map render helpers consumed by `htmlBuilder` (CSS, JS, embedded data, inlined D3).
- `src/includes/*.cjs` — CommonJS modules implementing config, downloader, and Excel generation.
- `messages/generate.json` — command summary, descriptions, examples, and error templates.
- `test/` — Mocha + Chai tests, runnable with `npm test`.

## Donation

This plugin is based on the [SFDC Data Dictionary Generator](https://github.com/gavignon/sfdc-generate-data-dictionary) by @gavignon.

If this project helps you, you can buy me a coffee:

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate?business=J53BMV8HFVHUG&no_recurring=0&currency_code=AUD)
