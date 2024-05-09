import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

const source = new ModuleSource(`
  import "a";
  import "a";
`);

assert.equal(source.imports.join(','), ['a'].join(','));
assert.equal(source.reexports.join(','), [].join(','));
assert.equal(source.exports.join(','), [].join(','));
