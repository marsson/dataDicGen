import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect } from 'chai';
import { extractRelationships, loadDictionary } from '../../src/shared/dictionary.js';
import { allObjects } from './fixtures.js';

describe('shared/dictionary', () => {
  describe('extractRelationships', () => {
    it('returns reference edges between objects in the supplied set, tagged with relationship kind', () => {
      const edges = extractRelationships(allObjects);
      expect(edges).to.have.deep.members([
        { from: 'Contact', to: 'Account', viaField: 'AccountId', fieldLabel: 'Account', kind: 'lookup' },
        { from: 'Project__c', to: 'Account', viaField: 'Account__c', fieldLabel: 'Account', kind: 'master-detail' },
      ]);
    });

    it('skips references that point outside the selected object set', () => {
      const edges = extractRelationships(allObjects.filter((o) => o.apiName !== 'Account'));
      expect(edges).to.deep.equal([]);
    });
  });

  describe('loadDictionary', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ddg-'));
      await fs.mkdir(path.join(tmpDir, 'describe'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'metadata'), { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('reads describe + metadata, merges descriptions, and ignores missing files', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'describe', 'Project__c.json'),
        JSON.stringify([
          {
            name: 'Status__c',
            label: 'Status',
            type: 'picklist',
            nillable: true,
            custom: true,
            referenceTo: [],
            picklistValues: [{ value: 'Open', active: true }],
          },
        ])
      );
      await fs.writeFile(
        path.join(tmpDir, 'metadata', 'Project__c.json'),
        JSON.stringify({
          fullName: 'Project__c',
          label: 'Project',
          description: 'Custom project',
          fields: { fullName: 'Status__c', description: 'The current state' },
        })
      );

      const objs = await loadDictionary(tmpDir, ['Project__c', 'Missing__c']);
      expect(objs).to.have.lengthOf(1);
      expect(objs[0]).to.include({ apiName: 'Project__c', label: 'Project', custom: true });
      expect(objs[0].fields[0]).to.include({
        name: 'Status__c',
        description: 'The current state',
        custom: true,
      });
      expect(objs[0].fields[0].picklistValues[0]).to.include({ value: 'Open', active: true });
    });

    it('classifies reference fields as master-detail when cascadeDelete is true and lookup otherwise', async () => {
      const fields = [
        {
          name: 'Account__c', label: 'Account', type: 'reference',
          custom: true, cascadeDelete: true, referenceTo: ['Account'],
        },
        {
          name: 'Owner__c', label: 'Owner', type: 'reference',
          custom: true, cascadeDelete: false, referenceTo: ['User'],
        },
        { name: 'Status__c', label: 'Status', type: 'picklist', custom: true, referenceTo: [] },
      ];
      await fs.writeFile(path.join(tmpDir, 'describe', 'Order__c.json'), JSON.stringify(fields));
      const objs = await loadDictionary(tmpDir, ['Order__c']);
      const byName = Object.fromEntries(objs[0].fields.map((f) => [f.name, f]));
      expect(byName.Account__c.relationshipKind).to.equal('master-detail');
      expect(byName.Owner__c.relationshipKind).to.equal('lookup');
      expect(byName.Status__c.relationshipKind).to.equal(null);
    });

    it('classifies reference fields as master-detail when metadata declares type "MasterDetail"', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'describe', 'Item__c.json'),
        JSON.stringify([
          { name: 'Parent__c', label: 'Parent', type: 'reference', custom: true, referenceTo: ['Order__c'] },
        ])
      );
      await fs.writeFile(
        path.join(tmpDir, 'metadata', 'Item__c.json'),
        JSON.stringify({
          fullName: 'Item__c',
          label: 'Item',
          fields: [{ fullName: 'Parent__c', type: 'MasterDetail' }],
        })
      );
      const objs = await loadDictionary(tmpDir, ['Item__c']);
      expect(objs[0].fields[0].relationshipKind).to.equal('master-detail');
    });
  });
});
