import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const compartment = new Compartment(
  {},
  {},
  {
    resolveHook: specifier => specifier,
    importHook() {
      return { record: new ModuleSource('export default 42') };
    },
  },
);

compartment.import('x').then(({ namespace }) => {
  assert(namespace.default === 42, 'default export not 42');
});
