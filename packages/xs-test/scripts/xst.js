#!/usr/bin/env node
/* global process */
import 'ses';
import fs from 'fs';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { makeBundle } from '@endo/compartment-mapper/bundle.js';
import { fileURLToPath, pathToFileURL } from 'url';

const read = async location => fs.promises.readFile(fileURLToPath(location));

const main = async () => {
  const basePath = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  const tmpsPath = resolve(basePath, 'tmp');
  const testsPath = resolve(basePath, 'test');
  for (const fixture of process.argv.slice(2)) {
    console.error(`# ${fixture}`);
    const fixturePath = resolve(fixture);
    const fixtureUrl = pathToFileURL(fixturePath);
    const scriptPath = fixturePath.replace(testsPath, tmpsPath);
    const scriptDirectory = resolve(scriptPath, '..');
    await fs.promises.mkdir(scriptDirectory, { recursive: true });
    assert(scriptPath !== fixturePath);
    const script = await makeBundle(read, fixtureUrl, {
      tags: new Set(['xs']),
    });
    await fs.promises.writeFile(scriptPath, script, 'utf-8');
    const child = spawn('xst', [scriptPath], {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    const { code, signal } = await new Promise(resolve => {
      child.on('exit', (code, signal) => {
        resolve({ code, signal });
      });
    });
    if (code === 0) {
      console.error('ok');
    } else {
      console.error(`not ok - exited code=${code} signal=${signal}`);
    }
  }
};

main().catch(err => {
  console.error('Error running main:', err);
  process.exitCode = 1;
});
