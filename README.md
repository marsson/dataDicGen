dataDicGen
==========

Increase the governance quality on your salesforce implementation with this Sdfx plugin that generates Data Dictionary in xlsx format from an org.


[![Version](https://img.shields.io/npm/v/sfdxdatadicgen.svg)](https://npmjs.org/package/sfdxdatadicgen)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/marsson/dataDicGen?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/dataDicGen/branch/master)
[![Codecov](https://codecov.io/gh/marsson/dataDicGen/branch/master/graph/badge.svg)](https://codecov.io/gh/marsson/dataDicGen)
[![Known Vulnerabilities](+)](https://snyk.io/test/github/marsson/dataDicGen)
[![Downloads/week](https://img.shields.io/npm/dw/sfdxdatadicgen.svg)](https://npmjs.org/package/sfdxdatadicgen)
[![License](https://img.shields.io/npm/l/dataDicGen.svg)](https://github.com/marsson/dataDicGen/blob/master/package.json)

<!-- toc -->
* [Basic usage and informations](#basic-usage-and-informations)
* [What information is displayed?](#what-information-is-displayed)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdxdatadicgen
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
sfdxdatadicgen/0.1.3 darwin-x64 node-v15.10.0
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx dataDictionary:generate [-o <string>] [-m] [-s <array>] [-l <array>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-datadictionarygenerate--o-string--m--s-array--l-array--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx dataDictionary:generate [-o <string>] [-m] [-s <array>] [-l <array>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

generates the Data dictionary for selected org in excel format

```
USAGE
  $ sfdx dataDictionary:generate [-o <string>] [-m] [-s <array>] [-l <array>] [-v <string>] [-u <string>] [--apiversion 
  <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -l, --includemanagedpackages=includemanagedpackages                               List of namespaces of manage
                                                                                    packages that will be downloaded.+

  -m, --includemanaged                                                              boolean that indicates if managed
                                                                                    package files should also be
                                                                                    included

  -o, --output=output                                                               destination and file name for xls
                                                                                    dataDictionary

  -s, --includestandardsobjects=includestandardsobjects                             Additional standard objects
                                                                                    (Account, Contact and User go by
                                                                                    default)

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx dataDictionary:generate --targetusername myOrg@example.com
  
  $ sfdx dataDictionary:generate -u myOrgName -m true -s Case,Opportunity,Product2
```

_See code: [src/commands/dataDictionary/generate.ts](https://github.com/marsson/dataDicGen/blob/v0.1.3/src/commands/dataDictionary/generate.ts)_
<!-- commandsstop -->
<!-- documentation -->
# Basic usage and informations
This plugin was written based on the [data model generator](sfdc-generate-data-dictionary)
 by @gavignon. 
The standard behaviour of the script is to generate a file, 
on the folder that the command is run on its most basic configuration: `$ sfdx sfdc-generate-data-dictionary -u myalias`, with the same name
of the alias/username of an authenticated Org/scratch org.
As a standard, the application will list all Custom objects, and *Accounts, Contacts and Usres* for the Standard objects.
Objects from *Managed Packages*  and other *Standard Objects* have to be configured.
The attribute -m takes in a boolean and defines if the managed packages objects should be documented on the data dictionary. If the flag is set to `true`, ALL MANAGED PACKAGES OBJECTS WILL BE ADDED TO THE FILE. To
select extra objects to be included in the data dictionary, Manually add the *API NAMES* of the desired objects (if a managed package object, include the managed package prefix).
# What information is displayed?

As of now, the SFDX Plugin displays:
- Spreadsheet workbooks separated by Objects Api Names
- Field Names
- Field Types
- Possible Values if Picklist
- Formula if Formula field
- Read only flag
- Mandatory Flag

Feel free to ask for features, but as for time to implement them, I cannot promise too much, but I will work on them as soon as I can. If you want to help out to support this initiative, a donation is welcome.
## Donation
If this project help you, you can give me a cup of coffee :)

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate?business=J53BMV8HFVHUG&no_recurring=0&currency_code=AUD)
