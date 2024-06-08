import test from 'ava';
import '../index.js';

const { isFrozen, getPrototypeOf } = Object;

lockdown();

test('Immutable ArrayBuffer installed and hardened', t => {
  const ab1 = new ArrayBuffer(0);
  const iab = ab1.transferToImmutable();
  const iabProto = getPrototypeOf(iab);
  t.true(isFrozen(iabProto));
  t.true(isFrozen(iabProto.slice));
});

test('Immutable ArrayBuffer ops', t => {
  // Absent on Node <= 18
  const canResize = 'maxByteLength' in ArrayBuffer.prototype;

  const ab1 = new ArrayBuffer(2, { maxByteLength: 7 });
  const ta1 = new Uint8Array(ab1);
  ta1[0] = 3;
  ta1[1] = 4;
  const iab = ab1.transferToImmutable();
  t.true(iab instanceof ArrayBuffer);
  ta1[1] = 5;
  const ab2 = iab.slice(0);
  const ta2 = new Uint8Array(ab2);
  t.is(ta1[1], undefined);
  t.is(ta2[1], 4);
  ta2[1] = 6;

  const ab3 = iab.slice(0);
  t.true(ab3 instanceof ArrayBuffer);

  const ta3 = new Uint8Array(ab3);
  t.is(ta1[1], undefined);
  t.is(ta2[1], 6);
  t.is(ta3[1], 4);

  t.is(ab1.byteLength, 0);
  t.is(iab.byteLength, 2);
  t.is(ab2.byteLength, 2);

  t.is(iab.maxByteLength, 2);
  if (canResize) {
    t.is(ab1.maxByteLength, 0);
    t.is(ab2.maxByteLength, 2);
  }

  if ('detached' in ab1) {
    t.true(ab1.detached);
    t.false(ab2.detached);
    t.false(ab3.detached);
  }
  t.false(iab.detached);
  t.false(iab.resizable);
});

// This could have been written as a test.failing as compared to
// the immutable ArrayBuffer we'll propose. However, I'd rather test what
// the shim purposely does instead.
test('Immutable ArrayBuffer shim limitations', t => {
  const ab1 = new ArrayBuffer(2);
  const dv1 = new DataView(ab1);
  t.is(dv1.buffer, ab1);
  t.is(dv1.byteLength, 2);
  const ta1 = new Uint8Array(ab1);
  ta1[0] = 3;
  ta1[1] = 4;
  t.is(ta1.byteLength, 2);

  t.throws(() => new DataView({}), { instanceOf: TypeError });
  // Unfortutanely, calling a TypeArray constructor with an object that
  // is not a TypeArray, ArrayBuffer, or Iterable just creates a useless
  // empty TypedArray, rather than throwing.
  const ta2 = new Uint8Array({});
  t.is(ta2.byteLength, 0);

  const iab = ab1.transferToImmutable();
  t.throws(() => new DataView(iab), {
    instanceOf: TypeError,
  });
  // Unfortunately, unlike the immutable ArrayBuffer to be proposed,
  // calling a TypedArray constructor with the shim implementation of
  // an immutable ArrayBuffer as argument treats it as an unrecognized object,
  // rather than throwing an error.
  t.is(iab.byteLength, 2);
  const ta3 = new Uint8Array(iab);
  t.is(ta3.byteLength, 0);
});
