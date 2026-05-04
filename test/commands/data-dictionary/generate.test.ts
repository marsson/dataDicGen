import { expect } from 'chai';
import GenerateDataDictionary from '../../../src/commands/data-dictionary/generate.js';

describe('data-dictionary generate (smoke)', () => {
  it('exposes a non-empty summary', () => {
    expect(GenerateDataDictionary.summary).to.be.a('string').and.not.empty;
  });

  it('declares the deprecated camelCase alias', () => {
    expect(GenerateDataDictionary.aliases).to.deep.equal(['dataDictionary:generate']);
    expect(GenerateDataDictionary.deprecateAliases).to.equal(true);
  });

  it('reserves -o for --target-org and -f for --output', () => {
    const flags = GenerateDataDictionary.flags;
    expect(flags.output.char).to.equal('f');
    expect(flags['target-org'].char).to.equal('o');
  });

  it('declares includestandardsobjects and includemanagedpackages as comma-delimited multi-string flags', () => {
    const std = GenerateDataDictionary.flags.includestandardsobjects;
    const pkgs = GenerateDataDictionary.flags.includemanagedpackages;
    expect(std.multiple).to.equal(true);
    expect(std.delimiter).to.equal(',');
    expect(pkgs.multiple).to.equal(true);
    expect(pkgs.delimiter).to.equal(',');
  });

  it('declares includemanaged as a boolean flag', () => {
    expect(GenerateDataDictionary.flags.includemanaged.type).to.equal('boolean');
  });

  it('publishes at least one example', () => {
    expect(GenerateDataDictionary.examples).to.be.an('array').with.length.greaterThan(0);
  });

  it('exposes a multi-value format flag', () => {
    const fmt = GenerateDataDictionary.flags.format;
    expect(fmt.multiple).to.equal(true);
    expect(fmt.delimiter).to.equal(',');
    expect(fmt.char).to.equal('t');
  });
});
