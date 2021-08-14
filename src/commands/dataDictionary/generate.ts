import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('dataDicGen', 'generate');

export default class GenerateDataDictionary extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx dataDictionary:generate --targetusername myOrg@example.com
  `
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    output: flags.string({char: 'o', description: messages.getMessage('outputFlagDescription')}),
    includemanaged: flags.boolean({char: 'm', description: messages.getMessage('outputFlagManagedPackage')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    // const name = this.flags.name || 'world';
    const configFactory = require('./../../includes/config');
    const downloaderFactory = require('./../../includes/downloader');
    const excelBuilder = require('./../../includes/excelbuilder');
    const path = require('path');
    const config = new configFactory();
    // ** Validate configuration at this stage **//
    // ** If output name and path are set, set the file name **/
    if (null != this.flags.output) {
      config.output = path.dirname(this.flags.output);
      config.projectName = path.basename(this.flags.output);
    }

    if (null == this.flags.includemanaged) {
      this.flags.includemanaged = false;
    }

    config.validate();
    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();

    // Will do a describe global, run through all the objects and will add the ones with __c to the list that has all the predefined Standard.
    conn.describeGlobal().then(res => {
       // for (let i = 0; i < res.sobjects.length; i++) {
       //   let object = res.sobjects[i];
        //  if (object.name.endsWith('__c')){
        //    config.objects.push(object.name);
         // }
        // }
        // NEW LOGIC!!!
        const sObjectNames = res.sobjects.map(sObject => {
          return sObject.name;
        });
        const filteredArray = sObjectNames.filter(sObject => {
          // Always all the Custom should go.
          // if include managed packages flag is on, all objects names with __ should be added.

          if ( sObject.endsWith('__c')) {
            // ends with __c
            // If is a custom object from a  managed package, do not return
            if (this.flags.includemanaged == false && sObject.replace('__c', '').includes('__')) {
              return null;
            }
            return sObject;
          }
          return null;
        });
        config.objects.push(...filteredArray);
        const downloader = new downloaderFactory(config, this.logger.info, conn);
        const builder = new excelBuilder(config, this.logger.info);

        // Download metadata files
        downloader.execute().then(result => {
          this.ux.log(result + ' downloaded');
          // Generate the excel file
          builder.generate();
        });
      });
    // Return an object to be displayed with --json
    return {};
  }
}
