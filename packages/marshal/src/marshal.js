/// <reference types="ses"/>

import { Nat } from '@endo/nat';
import {
  assertPassable,
  getInterfaceOf,
  getErrorConstructor,
  hasOwnPropertyOf,
} from '@endo/pass-style';

import {
  QCLASS,
  makeEncodeToCapData,
  makeDecodeFromCapData,
} from './encodeToCapData.js';
import {
  makeDecodeFromSmallcaps,
  makeEncodeToSmallcaps,
} from './encodeToSmallcaps.js';

/** @typedef {import('./types.js').MakeMarshalOptions} MakeMarshalOptions */
/** @template Slot @typedef {import('./types.js').ConvertSlotToVal<Slot>} ConvertSlotToVal */
/** @template Slot @typedef {import('./types.js').ConvertValToSlot<Slot>} ConvertValToSlot */
/** @template Slot @typedef {import('./types.js').ToCapData<Slot>} ToCapData */
/** @template Slot @typedef {import('./types.js').FromCapData<Slot>} FromCapData */
/** @typedef {import('@endo/pass-style').Passable} Passable */
/** @typedef {import('@endo/pass-style').InterfaceSpec} InterfaceSpec */
/** @typedef {import('./types.js').Encoding} Encoding */
/** @typedef {import('@endo/pass-style').RemotableObject} Remotable */

const { isArray } = Array;
const { details: X, Fail, quote: q } = assert;
const { ownKeys } = Reflect;

/** @type {ConvertValToSlot<any>} */
const defaultValToSlotFn = x => x;
/** @type {ConvertSlotToVal<any>} */
const defaultSlotToValFn = (x, _) => x;

/**
 * @template Slot
 * @param {ConvertValToSlot<Slot>} [convertValToSlot]
 * @param {ConvertSlotToVal<Slot>} [convertSlotToVal]
 * @param {MakeMarshalOptions} options
 */
export const makeMarshal = (
  convertValToSlot = defaultValToSlotFn,
  convertSlotToVal = defaultSlotToValFn,
  {
    errorTagging = 'on',
    marshalName = 'anon-marshal',
    // TODO Temporary hack.
    // See https://github.com/Agoric/agoric-sdk/issues/2780
    errorIdNum = 10000,
    // We prefer that the caller instead log to somewhere hidden
    // to be revealed when correlating with the received error.
    marshalSaveError = err =>
      console.log('Temporary logging of sent error', err),
    // Default to 'capdata' because it was implemented first.
    // Sometimes, ontogeny does recapitulate phylogeny ;)
    serializeBodyFormat = 'capdata',
  } = {},
) => {
  assert.typeof(marshalName, 'string');
  errorTagging === 'on' ||
    errorTagging === 'off' ||
    Fail`The errorTagging option can only be "on" or "off" ${errorTagging}`;
  const nextErrorId = () => {
    errorIdNum += 1;
    return `error:${marshalName}#${errorIdNum}`;
  };

  /**
   * @type {ToCapData<Slot>}
   */
  const toCapData = root => {
    const slots = [];
    // maps val (promise or remotable) to index of slots[]
    const slotMap = new Map();

    /**
     * @param {import('@endo/pass-style').PassableCap} passable
     * @returns {{index: number, repeat: boolean}}
     */
    const encodeSlotCommon = passable => {
      let index = slotMap.get(passable);
      if (index !== undefined) {
        // TODO assert that it's the same iface as before
        assert.typeof(index, 'number');
        return harden({ index, repeat: true });
      }

      index = slots.length;
      const slot = convertValToSlot(passable);
      slots.push(slot);
      slotMap.set(passable, index);
      return harden({ index, repeat: false });
    };

    /**
     * Even if an Error is not actually passable, we'd rather send
     * it anyway because the diagnostic info carried by the error
     * is more valuable than diagnosing why the error isn't
     * passable. See comments in isErrorLike.
     *
     * @param {Error} err
     * @param {(p: Passable) => unknown} encodeRecur
     * @returns {{errorId?: string, message: string, name: string}}
     */
    const encodeErrorCommon = (err, encodeRecur) => {
      const message = encodeRecur(`${err.message}`);
      assert.typeof(message, 'string');
      const name = encodeRecur(`${err.name}`);
      assert.typeof(name, 'string');
      // Must encode `cause`, `errors`.
      // nested non-passable errors must be ok from here.
      if (errorTagging === 'on') {
        // We deliberately do not share the stack, but it would
        // be useful to log the stack locally so someone who has
        // privileged access to the throwing Vat can correlate
        // the problem with the remote Vat that gets this
        // summary. If we do that, we could allocate some random
        // identifier and include it in the message, to help
        // with the correlation.
        const errorId = encodeRecur(nextErrorId());
        assert.typeof(errorId, 'string');
        assert.note(err, X`Sent as ${errorId}`);
        marshalSaveError(err);
        return harden({ errorId, message, name });
      } else {
        return harden({ message, name });
      }
    };

    if (serializeBodyFormat === 'capdata') {
      /**
       * @param {import('@endo/pass-style').PassableCap} passable
       * @param {InterfaceSpec} [iface]
       * @returns {Encoding}
       */
      const encodeSlotToCapData = (passable, iface = undefined) => {
        const { index, repeat } = encodeSlotCommon(passable);

        if (repeat === true || iface === undefined) {
          return harden({ [QCLASS]: 'slot', index });
        } else {
          return harden({ [QCLASS]: 'slot', iface, index });
        }
      };

      /** @type {(promise: import('@endo/pass-style').RemotableObject, encodeRecur: (p: Passable) => Encoding) => Encoding} */
      const encodeRemotableToCapData = (val, _encodeRecur) =>
        encodeSlotToCapData(val, getInterfaceOf(val));

      /** @type {(promise: Promise, encodeRecur: (p: Passable) => Encoding) => Encoding} */
      const encodePromiseToCapData = (promise, _encodeRecur) =>
        encodeSlotToCapData(promise);

      /**
       * Even if an Error is not actually passable, we'd rather send
       * it anyway because the diagnostic info carried by the error
       * is more valuable than diagnosing why the error isn't
       * passable. See comments in isErrorLike.
       *
       * @param {Error} err
       * @param {(p: Passable) => Encoding} encodeRecur
       * @returns {Encoding}
       */
      const encodeErrorToCapData = (err, encodeRecur) => {
        const errData = encodeErrorCommon(err, encodeRecur);
        return harden({ [QCLASS]: 'error', ...errData });
      };

      const encodeToCapData = makeEncodeToCapData({
        encodeRemotableToCapData,
        encodePromiseToCapData,
        encodeErrorToCapData,
      });

      const encoded = encodeToCapData(root);
      const body = JSON.stringify(encoded);
      return harden({
        body,
        slots,
      });
    } else if (serializeBodyFormat === 'smallcaps') {
      /**
       * @param {string} prefix
       * @param {import('@endo/pass-style').PassableCap} passable
       * @param {InterfaceSpec} [iface]
       * @returns {string}
       */
      const encodeSlotToSmallcaps = (prefix, passable, iface = undefined) => {
        const { index, repeat } = encodeSlotCommon(passable);

        // TODO explore removing this special case
        if (repeat === true || iface === undefined) {
          return `${prefix}${index}`;
        }
        return `${prefix}${index}.${iface}`;
      };

      const encodeRemotableToSmallcaps = (remotable, _encodeRecur) =>
        encodeSlotToSmallcaps('$', remotable, getInterfaceOf(remotable));

      const encodePromiseToSmallcaps = (promise, _encodeRecur) =>
        encodeSlotToSmallcaps('&', promise);

      const encodeErrorToSmallcaps = (err, encodeRecur) => {
        const errData = encodeErrorCommon(err, encodeRecur);
        const { message, ...rest } = errData;
        return harden({ '#error': message, ...rest });
      };

      const encodeToSmallcaps = makeEncodeToSmallcaps({
        encodeRemotableToSmallcaps,
        encodePromiseToSmallcaps,
        encodeErrorToSmallcaps,
      });

      const encoded = encodeToSmallcaps(root);
      const smallcapsBody = JSON.stringify(encoded);
      return harden({
        // Valid JSON cannot begin with a '#', so this is a valid signal
        // indicating smallcaps format.
        body: `#${smallcapsBody}`,
        slots,
      });
    } else {
      // The `throw` is a noop since `Fail` throws. Added for confused linters.
      throw Fail`Unrecognized serializeBodyFormat: ${q(serializeBodyFormat)}`;
    }
  };

  const makeFullRevive = slots => {
    /** @type {Map<number, Passable>} */
    const valMap = new Map();

    /**
     * @param {{iface?: string, index: number}} slotData
     * @returns {Passable}
     */
    const decodeSlotCommon = slotData => {
      const { iface = undefined, index, ...rest } = slotData;
      ownKeys(rest).length === 0 ||
        Fail`unexpected encoded slot properties ${q(ownKeys(rest))}`;
      if (valMap.has(index)) {
        return valMap.get(index);
      }
      // TODO SECURITY HAZARD: must enfoce that remotable vs promise
      // is according to the encoded string.
      const slot = slots[Number(Nat(index))];
      const val = convertSlotToVal(slot, iface);
      valMap.set(index, val);
      return val;
    };

    /**
     * @param {{errorId?: string, message: string, name: string}} errData
     * @param {(e: unknown) => string} decodeRecur
     * @returns {Error}
     */
    const decodeErrorCommon = (errData, decodeRecur) => {
      const { errorId = undefined, message, name, ...rest } = errData;
      ownKeys(rest).length === 0 ||
        Fail`unexpected encoded error properties ${q(ownKeys(rest))}`;
      // TODO Must decode `cause` and `errors` properties
      // capData does not transform strings. The calls to `decodeRecur`
      // are for reuse by other encodings that do, such as smallcaps.
      const dName = decodeRecur(name);
      const dMessage = decodeRecur(message);
      const dErrorId = errorId && decodeRecur(errorId);
      typeof dName === 'string' ||
        Fail`invalid error name typeof ${q(typeof dName)}`;
      typeof dMessage === 'string' ||
        Fail`invalid error message typeof ${q(typeof dMessage)}`;
      const EC = getErrorConstructor(dName) || Error;
      // errorId is a late addition so be tolerant of its absence.
      const errorName =
        dErrorId === undefined
          ? `Remote${EC.name}`
          : `Remote${EC.name}(${dErrorId})`;
      const error = assert.error(dMessage, EC, { errorName });
      return harden(error);
    };

    // The current encoding does not give the decoder enough into to distinguish
    // whether a slot represents a promise or a remotable. As an implementation
    // restriction until this is fixed, if either is provided, both must be
    // provided and they must be the same.
    // See https://github.com/Agoric/agoric-sdk/issues/4334
    const decodeRemotableOrPromiseFromCapData = (rawTree, _decodeRecur) => {
      const { [QCLASS]: _, ...slotData } = rawTree;
      return decodeSlotCommon(slotData);
    };

    const decodeErrorFromCapData = (rawTree, decodeRecur) => {
      const { [QCLASS]: _, ...errData } = rawTree;
      return decodeErrorCommon(errData, decodeRecur);
    };

    const reviveFromCapData = makeDecodeFromCapData({
      // @ts-expect-error FIXME
      decodeRemotableFromCapData: decodeRemotableOrPromiseFromCapData,
      // @ts-expect-error FIXME
      decodePromiseFromCapData: decodeRemotableOrPromiseFromCapData,
      decodeErrorFromCapData,
    });

    const makeDecodeSlotFromSmallcaps = prefix => {
      /**
       * @param {string} stringEncoding
       * @param {(e: unknown) => Passable} _decodeRecur
       * @returns {Remotable | Promise}
       */
      return (stringEncoding, _decodeRecur) => {
        assert(stringEncoding.startsWith(prefix));
        // slots: $slotIndex.iface or $slotIndex
        const i = stringEncoding.indexOf('.');
        const index = Number(stringEncoding.slice(1, i < 0 ? undefined : i));
        // i < 0 means there was no iface included.
        const iface = i < 0 ? undefined : stringEncoding.slice(i + 1);
        // @ts-expect-error FIXME
        return decodeSlotCommon({ iface, index });
      };
    };
    const decodeRemotableFromSmallcaps = makeDecodeSlotFromSmallcaps('$');
    const decodePromiseFromSmallcaps = makeDecodeSlotFromSmallcaps('&');

    const decodeErrorFromSmallcaps = (encoding, decodeRecur) => {
      const { '#error': message, ...restErrData } = encoding;
      !hasOwnPropertyOf(restErrData, 'message') ||
        Fail`unexpected encoded error property ${q('message')}`;
      return decodeErrorCommon({ message, ...restErrData }, decodeRecur);
    };

    const reviveFromSmallcaps = makeDecodeFromSmallcaps({
      // @ts-expect-error FIXME
      decodeRemotableFromSmallcaps,
      // @ts-expect-error FIXME
      decodePromiseFromSmallcaps,
      decodeErrorFromSmallcaps,
    });

    return harden({ reviveFromCapData, reviveFromSmallcaps });
  };

  /**
   * @type {FromCapData<Slot>}
   */
  const fromCapData = data => {
    const { body, slots } = data;
    typeof body === 'string' ||
      Fail`unserialize() given non-capdata (.body is ${body}, not string)`;
    isArray(data.slots) ||
      Fail`unserialize() given non-capdata (.slots are not Array)`;
    const { reviveFromCapData, reviveFromSmallcaps } = makeFullRevive(slots);
    let result;
    // JSON cannot begin with a '#', so this is an unambiguous signal.
    if (body.startsWith('#')) {
      const smallcapsBody = body.slice(1);
      const encoding = harden(JSON.parse(smallcapsBody));
      result = harden(reviveFromSmallcaps(encoding));
    } else {
      const rawTree = harden(JSON.parse(body));
      result = harden(reviveFromCapData(rawTree));
    }
    // See https://github.com/Agoric/agoric-sdk/issues/4337
    // which should be considered fixed once we've completed the switch
    // to smallcaps.
    assertPassable(result);
    return result;
  };

  return harden({
    toCapData,
    fromCapData,

    // for backwards compatibility
    /** @deprecated use toCapData */
    serialize: toCapData,
    /** @deprecated use fromCapData */
    unserialize: fromCapData,
  });
};
