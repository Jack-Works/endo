import 'ses';
import bundle from './bundle.js';
import { importBundle } from '@endo/import-bundle';
importBundle(bundle)
  .then(ns => {
    assert.equal(ns.default, 42);
  })
  .catch(error => {
    assert.fail(error);
  });
