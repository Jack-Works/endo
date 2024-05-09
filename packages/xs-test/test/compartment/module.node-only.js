import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

const c = new Compartment(
  {},
  {},
  {
    resolveHook(x) {
      return x;
    },
    importHook() {
      return { source: new ModuleSource('export default 42') };
    },
    importNowHook() {
      return { source: new ModuleSource('export default 42') };
    },
  },
);

const m = c.module('x');
const n = c.module('x');
const o = c.importNow('x');

assert(m === n);
assert(m === o);
assert(m.default === 42);

c.import('x').then(({ namespace: p }) => {
  assert(m === p);
});
