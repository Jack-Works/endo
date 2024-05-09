import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

const compartment = new Compartment(
  {},
  {},
  {
    importNowHook(specifier) {
      if (specifier === '.') {
        return {
          namespace: './src/index.js',
          compartment,
        };
      }
      if (specifier === './src/index.js') {
        return {
          source: new ModuleSource('export const meaning = 42;'),
          compartment,
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

assert(compartment.importNow('.').meaning === 42);
assert(compartment.importNow('./src/index.js').meaning === 42);
assert(
  compartment.importNow('.') === compartment.importNow('./src/index.js'),
  'identities do not match',
);
