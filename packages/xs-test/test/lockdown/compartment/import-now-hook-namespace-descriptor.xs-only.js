import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const parentCompartment = new Compartment(
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

const compartment = new parentCompartment.globalThis.Compartment(
  {},
  {},
  {
    importNowHook(specifier) {
      if (specifier === '.') {
        return {
          namespace: './src/index.js',
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

assert(compartment.importNow('.').meaning === 42);
assert(parentCompartment.importNow('./src/index.js').meaning === 42);
assert(
  compartment.importNow('.') === parentCompartment.importNow('./src/index.js'),
  'identities do not match',
);
