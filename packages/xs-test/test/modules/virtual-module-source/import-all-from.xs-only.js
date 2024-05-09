import 'ses';
import { StaticModuleRecord as ModuleSource } from '@endo/static-module-record';

const print = globalThis.print ?? console.log;
const c = new Compartment(
  {},
  {},
  {
    resolveHook: specifier => specifier,
    importNowHook(specifier) {
      if (specifier === 'dependency') {
        return {
          source: new ModuleSource(`
          export const a = 10;
          export const b = 20;
        `),
        };
      }
      if (specifier === 'entry') {
        return {
          source: {
            bindings: [
              { importAllFrom: 'dependency', as: '_0' },
              { export: 'x' },
            ],
            execute(env) {
              env.x = env._0;
            },
          },
        };
      }
    },
  },
);
print(c.importNow('dependency').a);
print(c.importNow('dependency').b);
print(c.importNow('entry').x.a);
print(c.importNow('entry').x.b);
