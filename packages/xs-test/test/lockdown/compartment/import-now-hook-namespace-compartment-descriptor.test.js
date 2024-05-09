import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const c2 = new Compartment(
  {},
  {},
  {
    importNowHook(specifier) {
      if (specifier === './src/index.js') {
        return {
          source: new ModuleSource('export const meaning = 42;'),
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

const c = new Compartment(
  {},
  {},
  {
    importNowHook(specifier) {
      if (specifier === '.') {
        return {
          namespace: './src/index.js',
          compartment: c2,
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

assert(c.importNow('.').meaning === 42);
assert(c2.importNow('./src/index.js').meaning === 42);
assert(
  c.importNow('.') === c2.importNow('./src/index.js'),
  'identities do not match',
);
