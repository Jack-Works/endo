import 'ses';
lockdown();
const o = {};
o.o = o;
harden(o);
assert(Object.isFrozen(o));
