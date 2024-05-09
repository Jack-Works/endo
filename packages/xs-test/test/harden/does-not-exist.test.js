// harden should not exist until after lockdown().
// See test/lockdown/harden.
import 'ses';
assert.typeof(globalThis.harden, 'undefined');
