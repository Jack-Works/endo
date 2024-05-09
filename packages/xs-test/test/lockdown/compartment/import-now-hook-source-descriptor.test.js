import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const c = new Compartment(
  {},
  {},
  {
    importNowHook(specifier) {
      if (specifier === '.') {
        return {
          source: new ModuleSource('export const meaning = 42;'),
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

assert(c.importNow('.').meaning === 42);
