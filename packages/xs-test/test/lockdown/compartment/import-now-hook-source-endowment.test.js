import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const compartment = new Compartment(
  {
    meaning: 42,
  },
  {},
  {
    importNowHook() {
      return {
        source: new ModuleSource('export default globalThis.meaning'),
      };
    },
  },
);

assert(compartment.importNow('').default === 42);
