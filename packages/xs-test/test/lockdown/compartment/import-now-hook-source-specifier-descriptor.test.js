import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

lockdown();

const c = new Compartment(
  {},
  {},
  {
    resolveHook(specifier, referrer) {
      if (referrer === './src/index.js' && specifier === './peer.js') {
        return './src/peer.js';
      }
      throw new Error('Unexpected specifier');
    },
    importNowHook(specifier) {
      if (specifier === '.') {
        return {
          source: new ModuleSource('export { meaning } from "./peer.js";'),
          specifier: './src/index.js',
        };
      }
      if (specifier === './src/peer.js') {
        return {
          source: new ModuleSource('export const meaning = 42;'),
        };
      }
      throw new Error(`Unexpected specifier ${specifier}`);
    },
  },
);

assert(c.importNow('.').meaning === 42);

let threw = false;
try {
  c.importNow('./src/index.js');
} catch (error) {
  threw = true;
}
assert(threw, 'did not throw when importing ./src/index.js directly');
