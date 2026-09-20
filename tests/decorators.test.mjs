import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LogClass,
  LogMethod,
  LogPerformance,
  sanitize,
  shouldLogNamespace,
} from '../dist/index.js';

function createLoggerSpy() {
  const calls = {
    log: [],
    table: [],
    warn: [],
    error: [],
    group: [],
    groupCollapsed: [],
    groupEnd: [],
  };

  return {
    calls,
    logger: {
      log: (...args) => calls.log.push(args),
      table: (...args) => calls.table.push(args),
      warn: (...args) => calls.warn.push(args),
      error: (...args) => calls.error.push(args),
      group: (...args) => calls.group.push(args),
      groupCollapsed: (...args) => calls.groupCollapsed.push(args),
      groupEnd: (...args) => calls.groupEnd.push(args),
    },
  };
}

const initialIsDebug = globalThis.IS_DEBUG_ENABLED;
const initialNamespaces = globalThis.DEBUG_NAMESPACES;
const initialConfig = globalThis.DEBUG_CONFIG;


function applyClassDecorator(decorator, targetClass) {
  const initializers = [];
  const decorated =
    decorator(targetClass, {
      name: targetClass.name,
      addInitializer: (initializer) => initializers.push(initializer),
    }) ?? targetClass;

  for (const initializer of initializers) {
    initializer.call(decorated);
  }

  return decorated;
}

beforeEach(() => {
  globalThis.IS_DEBUG_ENABLED = true;
  delete globalThis.DEBUG_CONFIG;
  delete globalThis.DEBUG_NAMESPACES;
});

afterEach(() => {
  if (initialIsDebug === undefined) {
    delete globalThis.IS_DEBUG_ENABLED;
  } else {
    globalThis.IS_DEBUG_ENABLED = initialIsDebug;
  }

  if (initialNamespaces === undefined) {
    delete globalThis.DEBUG_NAMESPACES;
  } else {
    globalThis.DEBUG_NAMESPACES = initialNamespaces;
  }

  if (initialConfig === undefined) {
    delete globalThis.DEBUG_CONFIG;
  } else {
    globalThis.DEBUG_CONFIG = initialConfig;
  }
});

describe('sanitize', () => {
  it('masks sensitive values recursively without mutating input', () => {
    const payload = {
      password: 'secret-value',
      nested: { token: 'abc', keep: 42 },
      list: [{ Authorization: '******' }],
    };

    const sanitized = sanitize(payload);

    assert.equal(sanitized.password, '***MASKED***');
    assert.equal(sanitized.nested.token, '***MASKED***');
    assert.equal(sanitized.list[0].Authorization, '***MASKED***');
    assert.equal(payload.password, 'secret-value');
  });


  it('keeps duplicated references and marks only circular paths', () => {
    const shared = { token: 'abc' };
    const payload = {
      first: shared,
      second: shared,
      self: null,
    };
    payload.self = payload;

    const sanitized = sanitize(payload);

    assert.deepEqual(sanitized.first, { token: '***MASKED***' });
    assert.deepEqual(sanitized.second, { token: '***MASKED***' });
    assert.equal(sanitized.first, sanitized.second);
    assert.equal(sanitized.self, '[Circular]');
  });
});

describe('namespace matching', () => {
  it('supports wildcard include and exclusion masks', () => {
    assert.equal(shouldLogNamespace('auth:login', 'auth:*, -auth:sensitive'), true);
    assert.equal(
      shouldLogNamespace('auth:sensitive', 'auth:*, -auth:sensitive'),
      false,
    );
  });
});

describe('LogMethod', () => {
  it('logs call and result for sync methods', () => {
    const { logger, calls } = createLoggerSpy();

    function sum(a, b) {
      return a + b;
    }

    const wrapped = LogMethod({ logger })(sum, { name: 'sum' });
    const result = wrapped.call({ constructor: { name: 'MathService' } }, 2, 3);

    assert.equal(result, 5);
    assert.equal(calls.log.length, 2);
    assert.match(calls.log[0][0], /\[CALL\] MathService:sum/);
    assert.match(calls.log[1][0], /\[RESULT\] MathService:sum/);
  });

  it('logs grouped trace and rethrows errors', () => {
    const { logger, calls } = createLoggerSpy();

    function fail() {
      throw new Error('boom');
    }

    const wrapped = LogMethod({ logger, traceMode: 'grouped', tag: 'MyTag' })(fail, {
      name: 'fail',
    });

    assert.throws(
      () => wrapped.call({ constructor: { name: 'ErrorService' } }),
      /boom/,
    );
    assert.equal(calls.error.length, 0);
    assert.equal(calls.groupCollapsed[0][0], 'Debug #MyTag');
    assert.equal(calls.log.length, 1);
    assert.equal(calls.groupEnd.length, 1);
  });

  it('does not log when runtime debug flag is disabled', () => {
    const { logger, calls } = createLoggerSpy();
    globalThis.IS_DEBUG_ENABLED = false;

    function sum(a, b) {
      return a + b;
    }

    const wrapped = LogMethod({ logger })(sum, { name: 'sum' });
    const result = wrapped.call({ constructor: { name: 'MathService' } }, 2, 3);

    assert.equal(result, 5);
    assert.equal(calls.log.length, 0);
  });

  it('masks sensitive fields on Error objects', () => {
    const { logger, calls } = createLoggerSpy();

    function failWithSensitiveError() {
      const error = new Error('boom');
      error.token = 'secret-token';
      throw error;
    }

    const wrapped = LogMethod({ logger })(failWithSensitiveError, {
      name: 'failWithSensitiveError',
    });

    assert.throws(
      () => wrapped.call({ constructor: { name: 'AuthService' } }),
      /boom/,
    );

    const errorPayload = calls.error[0][1].error;
    assert.equal(errorPayload.token, '***MASKED***');
  });

  it('respects runtime namespace filtering', () => {
    const { logger, calls } = createLoggerSpy();
    globalThis.DEBUG_NAMESPACES = 'Allowed:*';

    function run(value) {
      return value;
    }

    const wrapped = LogMethod({ logger })(run, { name: 'go' });

    wrapped.call({ constructor: { name: 'Denied' } }, 1);
    wrapped.call({ constructor: { name: 'Allowed' } }, 2);

    assert.equal(calls.log.length, 2);
    assert.match(calls.log[0][0], /Allowed:go/);
  });
});

describe('LogPerformance', () => {
  it('logs performance and warns when threshold exceeded', async () => {
    const { logger, calls } = createLoggerSpy();

    async function waitAndReturn() {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return 'ok';
    }

    const wrapped = LogPerformance({ logger, slowThresholdMs: 1 })(waitAndReturn, {
      name: 'waitAndReturn',
    });

    const result = await wrapped.call({ constructor: { name: 'PerfService' } });

    assert.equal(result, 'ok');
    assert.equal(calls.log.length, 1);
    assert.equal(calls.warn.length, 1);
    assert.match(calls.log[0][0], /\[PERFORMANCE\] PerfService:waitAndReturn/);
  });


  it('logs performance and rethrows on async rejection', async () => {
    const { logger, calls } = createLoggerSpy();

    async function failAsync() {
      await Promise.resolve();
      throw new Error('reject');
    }

    const wrapped = LogPerformance({ logger, slowThresholdMs: 0 })(failAsync, {
      name: 'failAsync',
    });

    await assert.rejects(
      () => wrapped.call({ constructor: { name: 'PerfService' } }),
      /reject/,
    );

    assert.equal(calls.log.length, 1);
    assert.equal(calls.warn.length, 1);
  });

  it('logs performance and rethrows on sync throw', () => {
    const { logger, calls } = createLoggerSpy();

    function failSync() {
      throw new Error('sync-failure');
    }

    const wrapped = LogPerformance({ logger, slowThresholdMs: 0 })(failSync, {
      name: 'failSync',
    });

    assert.throws(
      () => wrapped.call({ constructor: { name: 'PerfService' } }),
      /sync-failure/,
    );

    assert.equal(calls.log.length, 1);
    assert.equal(calls.warn.length, 1);
  });


  it('ignores customLog failures on success path', () => {
    const { logger, calls } = createLoggerSpy();

    function okSync() {
      return 'done';
    }

    const wrapped = LogPerformance({
      logger,
      customLog: () => {
        throw new Error('custom-log-failure');
      },
    })(okSync, { name: 'okSync' });

    assert.equal(wrapped.call({ constructor: { name: 'PerfService' } }), 'done');
    assert.equal(calls.log.length, 1);
  });

  it('ignores customLog failures on error path', () => {
    const { logger } = createLoggerSpy();

    function failSync() {
      throw new Error('original-failure');
    }

    const wrapped = LogPerformance({
      logger,
      customLog: () => {
        throw new Error('custom-log-failure');
      },
    })(failSync, { name: 'failSync' });

    assert.throws(
      () => wrapped.call({ constructor: { name: 'PerfService' } }),
      /original-failure/,
    );
  });

});

describe('LogClass', () => {
  it('wraps all prototype methods except constructor', () => {
    const { logger, calls } = createLoggerSpy();

    class CounterService {
      add(value) {
        return value + 1;
      }

      multiply(value) {
        return value * 2;
      }
    }

    const decorateClass = LogClass({ logger });
    const Decorated = applyClassDecorator(decorateClass, CounterService);

    const service = new Decorated();
    assert.equal(service.add(1), 2);
    assert.equal(service.multiply(2), 4);

    assert.equal(calls.log.length, 4);
    assert.match(calls.log[0][0], /CounterService:add/);
    assert.match(calls.log[2][0], /CounterService:multiply/);
  });



  it('does not double-wrap methods when decorated multiple times', () => {
    const { logger, calls } = createLoggerSpy();

    class OnceService {
      run(value) {
        return value;
      }
    }

    const first = applyClassDecorator(LogClass({ logger }), OnceService);
    const second = applyClassDecorator(LogClass({ logger }), first);
    const service = new second();

    assert.equal(service.run(1), 1);
    assert.equal(calls.log.length, 2);
  });

  it('applies include/exclude method filters', () => {
    const { logger, calls } = createLoggerSpy();

    class FilteredService {
      includeMe(value) {
        return value + 1;
      }

      includeAlso(value) {
        return value + 2;
      }

      skipMe(value) {
        return value + 3;
      }
    }

    const decorateClass = LogClass({
      logger,
      includeMethods: ['includeMe', /^include/],
      excludeMethods: ['includeAlso'],
    });

    const Decorated = applyClassDecorator(decorateClass, FilteredService);
    const service = new Decorated();

    assert.equal(service.includeMe(1), 2);
    assert.equal(service.includeAlso(1), 3);
    assert.equal(service.skipMe(1), 4);

    assert.equal(calls.log.length, 2);
    assert.match(calls.log[0][0], /FilteredService:includeMe/);
  });

});
