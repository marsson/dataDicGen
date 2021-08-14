import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('dataDicGen', 'org');

export default class GenerateDataDictionary extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx dataDictionary:generate --targetusername myOrg@example.com
  `
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    //username: flags.string({char: 'u', description: messages.getMessage('userNameFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    //const name = this.flags.name || 'world';
    const Config = require('./../../includes/config');
    const Downloader = require('./../../includes/downloader');
    const ExcelBuilder = require('./../../includes/excelbuilder');
    var config = new Config();
    config.validate();
    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();

      conn.describeGlobal().then(res => {
        for (let i = 0; i < res.sobjects.length; i++) {
          let object = res.sobjects[i];
          config.objects.push(object.name);
        }

        const downloader = new Downloader(config, this.logger.info, conn);
        const builder = new ExcelBuilder(config, this.logger.info);

        // Download metadata files
        downloader.execute().then(result => {
          this.ux.log(result + ' downloaded');
          // Generate the excel file
          builder.generate();
        })
      });
    // Return an object to be displayed with --json
    return {};
  }
}
