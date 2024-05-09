import 'ses';
lockdown();
const o = {};
const p = Object.create(o);
const q = { p };
harden(q);
assert(Object.isFrozen(q));
assert(Object.isFrozen(p));
assert(Object.isFrozen(o));
