// @ts-nocheck
/// <refs types="../types.js"/>
import './assert-shim.js';

const NativeCompartment = globalThis.Compartment;
const nativeLockdown = globalThis.lockdown;
const nativeFreeze = Object.freeze;

// This machinery allows us to replace the native Compartment with an adapter
// in the start compartment and any child compartment that the adapter begets.
const compartmentShim = `(NativeCompartment, compartmentShim, maybeHarden) => {

  const adaptVirtualSource = ({
    execute,
    imports = [],
    exports = [],
    reexports = [],
  }) => {
    const resolutions = Object.create(null);
    let i = 0;
    return {
      execute(environment) {
        const fakeCompartment = {
          importNow(specifier) {
            return environment[specifier];
          },
        };
        execute(environment, fakeCompartment, resolutions);
      },
      bindings: [
        ...imports.map(specifier => {
          const resolved = '_' + i++;
          resolutions[specifier] = resolved;
          return { importAllFrom: specifier, as: resolved };
        }),
        ...reexports.map(specifier => ({ exportAllFrom: specifier })),
        ...exports.map(name => ({ export: name })),
      ],
    };
  };

  const adaptSource = source => {
    if (source.execute) {
      return adaptVirtualSource(source);
    }
    return source;
  };

  class Compartment {
    #name;
    #transforms;
    #native;
    #descriptors;

    #adaptDescriptor(descriptor, specifier) {
      // Pass through, translating compartments to their native equivalents:
      if (descriptor.namespace !== undefined) {
        return {
          namespace: descriptor.namespace,
          compartment: descriptor.compartment?.#native,
        };
      }
      if (descriptor.source !== undefined) {
        return {
          source: descriptor.source,
          importMeta: descriptor.importMeta,
          specifier: descriptor.specifier,
        };
      }
      // Legacy support for record descriptors.
      if (descriptor.record !== undefined) {
        if (
          descriptor.specifier === specifier ||
          descriptor.specifier === undefined
        ) {
          return {
            source: adaptSource(descriptor.record),
            specifier,
            // Legacy descriptors do not support importMeta.
          };
        } else {
          this.#descriptors.set(descriptor.specifier, {
            compartment: this,
            namespace: specifier,
          });
          return {
            source: adaptSource(descriptor.record),
            specifier: descriptor.specifier,
          };
        }
      }
      if (descriptor.specifier !== undefined) {
        return {
          namespace: descriptor.specifier,
          compartment: descriptor.compartment?.#native,
        };
      }
      // Legacy support for a source in the place of a descriptor.
      return { source: adaptSource(descriptor) };
    }

    constructor(
      globals = {},
      modules = {},
      {
        name = undefined,
        transforms = [],
        resolveHook = () => {
          throw new Error('Compartment requires a resolveHook');
        },
        importHook = undefined,
        importNowHook = undefined,
        moduleMapHook = () => {},
      } = {},
    ) {
      this.#name = name;
      this.#transforms = transforms;
      this.#descriptors = new Map();

      modules = Object.fromEntries(
        Object.entries(modules).map(([specifier, descriptor]) => [
          specifier,
          this.#adaptDescriptor(descriptor, specifier),
        ]),
      );

      let options = { globals, modules };

      if (importHook) {
        options = {
          ...options,
          resolveHook,
          /** @param {string} specifier */
          loadHook: async specifier => {
            let descriptor =
              this.#descriptors.get(specifier) ??
              moduleMapHook(specifier) ??
              (await importHook(specifier));
            this.#descriptors.delete(specifier);
            descriptor = this.#adaptDescriptor(descriptor, specifier);
            return descriptor;
          },
        };
      }

      if (importNowHook) {
        options = {
          ...options,
          resolveHook,
          /** @param {string} specifier */
          loadNowHook: specifier => {
            let descriptor =
              this.#descriptors.get(specifier) ??
              moduleMapHook(specifier) ??
              importNowHook(specifier);
            this.#descriptors.delete(specifier);
            descriptor = this.#adaptDescriptor(descriptor, specifier);
            return descriptor;
          },
        };
      }

      this.#native = new NativeCompartment(options);
      Object.defineProperty(this.#native.globalThis, 'Compartment', {
        value: this.#native.evaluate(compartmentShim)(
          this.#native.globalThis.Compartment,
          compartmentShim,
          maybeHarden,
        ),
        writable: true,
        configurable: true,
        enumerable: false,
      });

      maybeHarden(this);
    }

    /** @param {string} specifier */
    async import(specifier) {
      return { namespace: await this.#native.import(specifier) };
    }

    /** @param {string} specifier */
    importNow(specifier) {
      return this.#native.importNow(specifier);
    }

    /** @param {string} source */
    evaluate(source) {
      for (const transform of this.#transforms) {
        source = transform(source);
      }
      return this.#native.evaluate(source);
    }

    get globalThis() {
      return this.#native.globalThis;
    }

    get name() {
      return this.#name;
    }
  }

  return maybeHarden(Compartment);
}`;

// Adapt the start compartment's native Compartment to the SES-compatibility
// adapter.
// Before Lockdown, the Compartment constructor in transitive child
// Compartments is not (and cannot be) hardened.
const noHarden = object => object;
globalThis.Compartment = (0, eval)(compartmentShim)(
  NativeCompartment,
  compartmentShim,
  noHarden,
);

const harden = globalThis.harden;
delete globalThis.harden;

/** @import {LockdownOptions} from '../types.js' */

/**
 * @param {LockdownOptions} options
 */
globalThis.lockdown = () => {
  globalThis.harden = harden;
  nativeLockdown();
  // Replace global Compartment with a version that is hardened and hardens
  // transitive child Compartment.
  globalThis.Compartment = (0, eval)(compartmentShim)(
    NativeCompartment,
    compartmentShim,
    harden,
  );
};

// XS Object.freeze takes a second argument to apply freeze transitively, but
// with slightly different effects than `harden`.
// We disable this behavior to encourage use of `harden` for portable Hardened
// JavaScript.
/** @param {object} object */
Object.freeze = object => nativeFreeze(object);
