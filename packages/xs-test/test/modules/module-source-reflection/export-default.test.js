import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

const source = new ModuleSource(`
  export default 42;
`);

assert.equal(source.imports.join(','), [].join(','));
assert.equal(source.exports.join(','), ['default'].join(','));
assert.equal(source.reexports.join(','), [].join(','));
