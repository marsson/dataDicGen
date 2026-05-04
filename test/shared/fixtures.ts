import { ObjectEntry } from '../../src/shared/dictionary.js';

export const accountObject: ObjectEntry = {
  apiName: 'Account',
  label: 'Account',
  description: 'Standard account object',
  custom: false,
  fields: [
    {
      name: 'Id',
      label: 'Account ID',
      type: 'id',
      length: 18,
      required: true,
      unique: true,
      externalId: false,
      custom: false,
      referenceTo: [],
      picklistValues: [],
    },
    {
      name: 'Name',
      label: 'Account Name',
      type: 'string',
      length: 255,
      required: true,
      unique: false,
      externalId: false,
      custom: false,
      referenceTo: [],
      picklistValues: [],
      description: 'The display name for this account',
    },
    {
      name: 'Type',
      label: 'Type',
      type: 'picklist',
      required: false,
      unique: false,
      externalId: false,
      custom: false,
      referenceTo: [],
      picklistValues: [
        { label: 'Customer', value: 'Customer', active: true, defaultValue: true },
        { label: 'Partner', value: 'Partner', active: true, defaultValue: false },
      ],
    },
  ],
};

export const contactObject: ObjectEntry = {
  apiName: 'Contact',
  label: 'Contact',
  description: null,
  custom: false,
  fields: [
    {
      name: 'AccountId',
      label: 'Account',
      type: 'reference',
      required: false,
      unique: false,
      externalId: false,
      custom: false,
      referenceTo: ['Account'],
      relationshipName: 'Account',
      relationshipKind: 'lookup',
      picklistValues: [],
    },
  ],
};

export const customObject: ObjectEntry = {
  apiName: 'Project__c',
  label: 'Project',
  description: 'Custom project tracking',
  custom: true,
  fields: [
    {
      name: 'Status__c',
      label: 'Status',
      type: 'picklist',
      required: false,
      unique: false,
      externalId: false,
      custom: true,
      referenceTo: [],
      picklistValues: [
        { label: 'Active', value: 'Active', active: true, defaultValue: true },
      ],
    },
    {
      name: 'Total__c',
      label: 'Total',
      type: 'currency',
      precision: 18,
      scale: 2,
      required: false,
      unique: false,
      externalId: false,
      custom: true,
      referenceTo: [],
      picklistValues: [],
      formula: 'Amount__c * Quantity__c',
    },
    {
      name: 'Account__c',
      label: 'Account',
      type: 'reference',
      required: true,
      unique: false,
      externalId: false,
      custom: true,
      referenceTo: ['Account'],
      relationshipName: 'Account__r',
      relationshipKind: 'master-detail',
      picklistValues: [],
    },
  ],
};

export const allObjects: ObjectEntry[] = [accountObject, contactObject, customObject];
