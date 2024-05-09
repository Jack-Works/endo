import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const c = new Compartment(
  {},
  {},
  {
    resolveHook(specifier, referrer) {
      if (referrer === './src/index.js') {
        if (specifier === './peer.js') {
          return './src/peer.js';
        }
      }
      throw new Error(
        `Unexpected specifier ${specifier} for referrer ${referrer}`,
      );
    },
    importNowHook(specifier) {
      if (specifier === './src/peer.js') {
        return {
          record: new ModuleSource('export const meaning = 42'),
        };
      }
      if (specifier === '.') {
        return {
          record: new ModuleSource('export * from "./peer.js"'),
          specifier: './src/index.js',
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

assert(c.importNow('.').meaning === 42);
assert(c.importNow('./src/index.js').meaning === 42);
assert(
  c.importNow('.') === c.importNow('./src/index.js'),
  'identities do not match',
);
