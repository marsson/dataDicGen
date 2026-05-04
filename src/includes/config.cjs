
'use strict'
module.exports = class Config
{
constructor() {
this.output = null;
this.debug = null;
this.excludeManagedPackage = null;
this.projectName = null;
this.outputTime = null;
this.allCustomObjects = null;
this.lucidchart = null;
this.sobjects = null;
this.techFieldPrefix = null;
this.hideTechFields = null;
this.columns = null;
}

validate () {
    if (typeof this.output === 'undefined' || this.output === null) {
      this.output = '.';
    }
    if (typeof this.debug === 'undefined' || this.debug === null) {
      this.debug = false;
    }
    this.debug = (this.debug === "true" || this.debug === true);

    if (typeof this.excludeManagedPackage === 'undefined' || this.excludeManagedPackage === null) {
      this.excludeManagedPackage = true;
    }
    this.excludeManagedPackage = (this.excludeManagedPackage === "true" || this.excludeManagedPackage === true);

    if (typeof this.projectName === 'undefined' || this.projectName === null) {
      this.projectName = 'PROJECT';
    }
    if (typeof this.outputTime === 'undefined' || this.outputTime === null) {
      this.outputTime = false;
    }
    if (typeof this.allCustomObjects === 'undefined' || this.allCustomObjects === null) {
      this.allCustomObjects = true;
    }
    this.allCustomObjects = (this.allCustomObjects === "true" || this.allCustomObjects === true);

    if (typeof this.lucidchart === 'undefined' || this.lucidchart === null) {
      this.lucidchart = true;
    }
    this.lucidchart = (this.lucidchart === "true" || this.lucidchart === true);

    if (typeof this.sobjects === 'undefined' || this.sobjects === null) {
      this.objects = [
        'Account','Contact','User'
      ];
    } else {
      // If an array is passed to the module
      if (Array.isArray(this.sobjects)) {
        this.objects = this.sobjects;
      } else {
        // Check and parse standObjects string for command-line
        try {
          this.objects = this.sobjects.split(',');
        } catch (e) {
          let errorMessage = 'Unable to parse sobjects parameter';
          if (this.debug)
            errorMessage += ' : ' + e;
          throw new Error(errorMessage);
        }
      }
    }


    if (typeof this.techFieldPrefix === 'undefined' || this.techFieldPrefix === null) {
      this.techFieldPrefix = 'TECH_';
    }
    if (typeof this.hideTechFields === 'undefined' || this.hideTechFields === null) {
      this.hideTechFields = false;
    }
    if (typeof this.columns === 'undefined' || this.columns === null) {
      this.columns = {
        'Unique': 7,
        'Mandatory': 3,
        'Name': 25,
        'Description': 90,
        'Helptext': 90,
        'APIName': 25,
        'Visibility':23,
        'Type': 27,
        'Values': 45
      };
    }
  }

}

