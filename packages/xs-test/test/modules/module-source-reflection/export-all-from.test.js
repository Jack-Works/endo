import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

const source = new ModuleSource(`
  export * from "a";
`);

assert.equal(source.imports.join(','), ['a'].join(','));
assert.equal(source.reexports.join(','), ['a'].join(','));
assert.equal(source.exports.join(','), [].join(','));
