import fs from 'fs';
import crypto from 'crypto';
import url from 'url';
import test from 'ava';
import { search } from '../src/search.js';
import { makeReadPowers } from '../src/node-powers.js';

test('search should find own package.json with read power', async t => {
  const readPowers = makeReadPowers({
    fs,
    crypto,
    url,
  });
  const { read } = readPowers;
  const { packageDescriptorLocation: found } = await search(
    read,
    import.meta.url,
  );
  const sought = new URL('../package.json', import.meta.url).href;
  t.is(found, sought);
});

test('search should find own package.json with read powers (plural)', async t => {
  const readPowers = makeReadPowers({
    fs,
    crypto,
    url,
  });
  const { packageDescriptorLocation: found } = await search(
    readPowers,
    import.meta.url,
  );
  const sought = new URL('../package.json', import.meta.url).href;
  t.is(found, sought);
});

test('search should fail to find package.json at system root with read power', async t => {
  const readPowers = makeReadPowers({
    fs,
    crypto,
    url,
  });
  const { read } = readPowers;
  const root = new URL('/', import.meta.url);
  await t.throwsAsync(() => search(read, root));
});

test('search should fail to find package.json at system root with read powers (plural)', async t => {
  const readPowers = makeReadPowers({
    fs,
    crypto,
    url,
  });
  const root = new URL('/', import.meta.url);
  await t.throwsAsync(() => search(readPowers, root));
});
