import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdxdatadicgen', 'generate');

export default class GenerateDataDictionary extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx dataDictionary:generate --targetusername myOrg@example.com
  `,
    `$ sfdx dataDictionary:generate -u myOrgName -m true -s Case,Opportunity,Product2
  `
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    output: flags.string({char: 'o', description: messages.getMessage('outputFlagDescription')}),
    includemanaged: flags.boolean({char: 'm', description: messages.getMessage('outputFlagManagedPackage')}),
    includestandardsobjects: flags.array({char: 's', description: messages.getMessage('includeStandardFlag')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const configFactory = require('../../includes/config');
    const downloaderFactory = require('../../includes/downloader');
    const excelBuilder = require('../../includes/excelbuilder');
    const path = require('path');
    const config = new configFactory();
    // ** Validate configuration at this stage **//
    // ** If output name and path are set, set the file name **/
    if (null == this.flags.output) {
      config.projectName = this.flags.targetusername;
    } else {
      config.output = path.dirname(this.flags.output);
      config.projectName = path.basename(this.flags.output);
    }

    if (null == this.flags.includemanaged) {
      this.flags.includemanaged = false;
    }

    config.validate();
    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();
    const res = await conn.describeGlobal();

    const sObjectNames = res.sobjects.map(sObject => {
          return sObject.name;
        });
    // Validate if any of the inputed Standard Objects are invalid
    const standardSobjectsInput = this.flags.includestandardsobjects;
    if (null != standardSobjectsInput) {
      standardSobjectsInput.forEach(sObjectInput => {
        if (!sObjectNames.includes(sObjectInput)) {
          throw new SfdxError(messages.getMessage('errorNoMatchingsObject', [sObjectInput]));
         // return;
        }
      });
    } else {
    }

    const filteredArray = sObjectNames.filter(sObject => {
          // Always all the Custom should go.
          // if include managed packages flag is on, all objects names with __ should be added.

          if ( sObject.endsWith('__c')) {
            // ends with __c
            // If is a custom object from a  managed package, do not return
            if (this.flags.includemanaged === false && sObject.replace('__c', '').includes('__')) {
              return null;
            }
            return sObject;
          }
          if (standardSobjectsInput?.includes(sObject)) {
            return sObject;
          }
          return null;
        });
    config.objects.push(...filteredArray);
    const downloader = new downloaderFactory(config, this.logger.info, conn);
    const builder = new excelBuilder(config, this.logger.info);

        // Download metadata files
    const size = await downloader.execute();
    this.ux.log(size + ' downloaded');
          // Generate the excel file
    await builder.generate();

    // Return an object to be displayed with --json
    return {};
  }
}
