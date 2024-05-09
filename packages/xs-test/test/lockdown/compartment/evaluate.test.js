import 'ses';

lockdown();

const c = new Compartment();

assert(c.evaluate('42') === 42);

const d = new c.globalThis.Compartment();

assert(d.evaluate('42') === 42);

assert([] instanceof c.globalThis.Array);
assert([] instanceof d.globalThis.Array);
