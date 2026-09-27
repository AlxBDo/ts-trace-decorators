/**
 * Contract tests — they validate the *publishable artifact* rather than
 * behaviour: the `exports` map, the declared entry points and the public API
 * surface, exactly as a consumer resolves them.
 *
 * Imports go through the package name (Node self-reference) so a broken
 * `exports` map fails here instead of in downstream projects.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as publicApi from 'ts-trace-decorators';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(
  readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
);

const EXPECTED_EXPORTS = [
  'DEFAULT_MAX_DEPTH',
  'LogClass',
  'LogMethod',
  'LogPerformance',
  'MAX_SCOPE_EVENTS',
  'TRACE_CONFIG',
  'clearScopes',
  'formatLabel',
  'getInstanceConfig',
  'getLogger',
  'getRuntimeConfig',
  'resolveNamespace',
  'sanitize',
  'shouldEnableDebug',
  'shouldLogNamespace',
];

describe('package manifest', () => {
  it('points every declared entry at an existing file', () => {
    const entries = [
      manifest.main,
      manifest.module,
      manifest.types,
      manifest.exports['.'].import,
      manifest.exports['.'].types,
    ];

    for (const entry of entries) {
      assert.ok(entry, 'entry should be declared');
      assert.ok(
        existsSync(path.join(rootDir, entry)),
        `${entry} is declared in package.json but missing from the build`,
      );
    }
  });

  it('ships the build output and its documentation', () => {
    assert.ok(manifest.files.includes('dist'));
    assert.ok(manifest.files.includes('CHANGELOG.md'));
  });

  it('declares no runtime dependency', () => {
    assert.equal(manifest.dependencies, undefined);
  });

  it('exposes canonical repository metadata', () => {
    assert.match(manifest.repository.url, /^git\+https:\/\/github\.com\//);
    assert.equal(manifest.license, 'MIT');
  });
});

describe('public API surface', () => {
  it('exports exactly the documented symbols', () => {
    assert.deepEqual(Object.keys(publicApi).sort(), EXPECTED_EXPORTS);
  });

  it('exposes the decorators as factories', () => {
    for (const name of ['LogClass', 'LogMethod', 'LogPerformance']) {
      assert.equal(typeof publicApi[name], 'function', `${name} should be callable`);
      assert.equal(
        typeof publicApi[name](),
        'function',
        `${name}() should return a decorator`,
      );
    }
  });

  it('exposes TRACE_CONFIG as a cross-realm shared symbol', () => {
    assert.equal(typeof publicApi.TRACE_CONFIG, 'symbol');
    assert.equal(
      publicApi.TRACE_CONFIG,
      Symbol.for('ts-trace-decorators.config'),
      'duplicated copies of the package must resolve the same key',
    );
  });
});

describe('published defaults', () => {
  it('keeps tracing disabled when nothing opts in', () => {
    const keys = [
      '__TS_TRACE_ENABLED',
      '__TS_TRACE_CONFIG',
      '__TS_TRACE_NAMESPACES',
      'IS_DEBUG_ENABLED',
      'DEBUG_CONFIG',
      'DEBUG_NAMESPACES',
    ];
    const saved = Object.fromEntries(keys.map((key) => [key, globalThis[key]]));

    for (const key of keys) {
      delete globalThis[key];
    }

    try {
      // Guards the security-sensitive default: an unconfigured consumer must
      // never see method arguments reach the console.
      assert.equal(publicApi.shouldEnableDebug(), false);

      const calls = [];
      const wrapped = publicApi.LogMethod({
        logger: { log: (...args) => calls.push(args) },
      })(() => 'ok', { name: 'run' });

      assert.equal(wrapped.call({ constructor: { name: 'Svc' } }), 'ok');
      assert.equal(calls.length, 0);
    } finally {
      for (const key of keys) {
        if (saved[key] === undefined) {
          delete globalThis[key];
        } else {
          globalThis[key] = saved[key];
        }
      }
    }
  });
});
