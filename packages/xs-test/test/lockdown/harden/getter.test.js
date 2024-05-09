import 'ses';
lockdown();
let state = 0;
const o = {
  __proto__: null,
  get state() {
    return state;
  },
  set state(value) {
    state = value * 2;
  },
};
harden(o);
assert(Object.isFrozen(o));
assert(o.state === state);
o.state = 2;
assert(o.state === 4);
