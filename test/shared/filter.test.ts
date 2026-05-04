import { expect } from 'chai';
import { SfError } from '@salesforce/core';
import { selectSObjects, validateStandardObjects, SObjectClassifier } from '../../src/shared/filter.js';

const classifier: SObjectClassifier = {
  isCustomObject: (name) => name.endsWith('__c'),
  isManagedPackageObject: (name) => name.split('__').length > 2,
};

describe('lib/filter', () => {
  describe('validateStandardObjects', () => {
    it('returns silently when input is undefined', () => {
      expect(() =>
        validateStandardObjects(undefined, ['Account', 'Contact'], (n) => `missing ${n}`)
      ).to.not.throw();
    });

    it('passes when every name is in the available list', () => {
      expect(() =>
        validateStandardObjects(['Account', 'Contact'], ['Account', 'Contact', 'User'], (n) => `missing ${n}`)
      ).to.not.throw();
    });

    it('throws SfError with formatted message when a name is missing', () => {
      expect(() =>
        validateStandardObjects(['Account', 'NotAnObject'], ['Account', 'Contact'], (n) => `missing ${n}`)
      )
        .to.throw(SfError)
        .with.property('message', 'missing NotAnObject');
    });
  });

  describe('selectSObjects', () => {
    const available = [
      'Account',
      'Contact',
      'Case',
      'CustomThing__c',
      'pkg__Custom__c',
      'pkg__Helper__c',
      'other__Thing__c',
    ];

    it('always includes non-managed custom objects', () => {
      const result = selectSObjects({
        available,
        includeManaged: false,
        classifier,
      });
      expect(result).to.deep.equal(['CustomThing__c']);
    });

    it('includes named standard objects when present in available list', () => {
      const result = selectSObjects({
        available,
        standardInput: ['Account', 'Case'],
        includeManaged: false,
        classifier,
      });
      expect(result).to.include.members(['Account', 'Case', 'CustomThing__c']);
      expect(result).to.not.include('Contact');
    });

    it('includes all managed-package objects when includeManaged is true', () => {
      const result = selectSObjects({
        available,
        includeManaged: true,
        classifier,
      });
      expect(result).to.include.members([
        'CustomThing__c',
        'pkg__Custom__c',
        'pkg__Helper__c',
        'other__Thing__c',
      ]);
      expect(result).to.not.include('Account');
    });

    it('includes only managed-package objects matching the supplied namespaces', () => {
      const result = selectSObjects({
        available,
        includeManaged: false,
        includeManagedNamespaces: ['pkg__'],
        classifier,
      });
      expect(result).to.include.members(['pkg__Custom__c', 'pkg__Helper__c', 'CustomThing__c']);
      expect(result).to.not.include('other__Thing__c');
      expect(result).to.not.include('Account');
    });

    it('does not duplicate entries when both standardInput and custom rules match', () => {
      const result = selectSObjects({
        available: ['Account', 'CustomThing__c'],
        standardInput: ['Account'],
        includeManaged: false,
        classifier,
      });
      expect(result).to.have.lengthOf(2);
      expect(result).to.deep.equal(['Account', 'CustomThing__c']);
    });
  });
});
