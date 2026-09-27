import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LogClass,
  LogMethod,
  LogPerformance,
  TRACE_CONFIG,
  clearScopes,
  sanitize,
  shouldEnableDebug,
} from '../../dist/index.js';

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

const TRACE_GLOBALS = [
  '__TS_TRACE_ENABLED',
  '__TS_TRACE_CONFIG',
  '__TS_TRACE_NAMESPACES',
  'IS_DEBUG_ENABLED',
  'DEBUG_CONFIG',
  'DEBUG_NAMESPACES',
];

const initialGlobals = Object.fromEntries(
  TRACE_GLOBALS.map((key) => [key, globalThis[key]]),
);

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
  for (const key of TRACE_GLOBALS) {
    delete globalThis[key];
  }
  clearScopes();
});

afterEach(() => {
  for (const key of TRACE_GLOBALS) {
    if (initialGlobals[key] === undefined) {
      delete globalThis[key];
    } else {
      globalThis[key] = initialGlobals[key];
    }
  }
  clearScopes();
});

describe('opt-in by default', () => {
  it('stays silent when no global flag is set', () => {
    const { logger, calls } = createLoggerSpy();

    function run() {
      return 'ok';
    }

    const wrapped = LogMethod({ logger })(run, { name: 'run' });
    assert.equal(wrapped.call({ constructor: { name: 'Svc' } }), 'ok');

    assert.equal(calls.log.length, 0);
    assert.equal(calls.error.length, 0);
  });

  it('stays silent when the global flag is not strictly true', () => {
    globalThis.__TS_TRACE_ENABLED = 'yes';
    assert.equal(shouldEnableDebug(), false);
  });

  it('logs once the prefixed global opts in', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogMethod({ logger })(() => 'ok', { name: 'run' });
    wrapped.call({ constructor: { name: 'Svc' } });

    assert.ok(calls.log.length > 0);
  });

  it('still honours the deprecated unprefixed global', () => {
    globalThis.IS_DEBUG_ENABLED = true;
    assert.equal(shouldEnableDebug(), true);
  });

  it('gives the prefixed global precedence over the legacy one', () => {
    globalThis.IS_DEBUG_ENABLED = true;
    globalThis.__TS_TRACE_CONFIG = { enabled: false };
    assert.equal(shouldEnableDebug(), false);
  });

  it('keeps an explicit option above every global', () => {
    assert.equal(shouldEnableDebug(true), true);
    globalThis.__TS_TRACE_ENABLED = true;
    assert.equal(shouldEnableDebug(false), false);
  });
});

describe('per-instance configuration', () => {
  it('traces only the instance that opted in', () => {
    const { logger, calls } = createLoggerSpy();
    const wrapped = LogMethod({ logger })(() => 'ok', { name: 'run' });

    const traced = { constructor: { name: 'Svc' }, [TRACE_CONFIG]: { enabled: true } };
    const silent = { constructor: { name: 'Svc' } };

    wrapped.call(traced);
    wrapped.call(silent);

    // inline mode emits CALL + RESULT for the opted-in instance only
    assert.deepEqual(
      calls.log.map(([label]) => label),
      ['[CALL] Svc:run', '[RESULT] Svc:run'],
    );
  });

  it('lets an instance opt out while the global opts in', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();
    const wrapped = LogMethod({ logger })(() => 'ok', { name: 'run' });

    wrapped.call({ constructor: { name: 'Svc' }, [TRACE_CONFIG]: { enabled: false } });

    assert.equal(calls.log.length, 0);
  });

  it('applies a per-instance namespace mask', () => {
    const { logger, calls } = createLoggerSpy();
    const wrapped = LogMethod({ logger })(() => 'ok', { name: 'run' });

    wrapped.call({
      constructor: { name: 'Svc' },
      [TRACE_CONFIG]: { enabled: true, namespaces: '-Svc:*' },
    });

    assert.equal(calls.log.length, 0);
  });
});

describe('dynamic tag and correlation id', () => {
  it('resolves the tag from the instance at call time', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogMethod({
      logger,
      traceMode: 'grouped',
      tag: ({ instance }) => `Store:${instance.id}`,
    })(() => 'ok', { name: 'run' });

    wrapped.call({ constructor: { name: 'Svc' }, id: 'A' });
    wrapped.call({ constructor: { name: 'Svc' }, id: 'B' });

    assert.deepEqual(
      calls.groupCollapsed.map(([label]) => label),
      ['Debug #Store:A', 'Debug #Store:B'],
    );
  });

  it('falls back to a per-instance tag', () => {
    const { logger, calls } = createLoggerSpy();
    const wrapped = LogMethod({ logger, traceMode: 'grouped' })(() => 'ok', {
      name: 'run',
    });

    wrapped.call({
      constructor: { name: 'Svc' },
      [TRACE_CONFIG]: { enabled: true, tag: 'FromInstance' },
    });

    assert.equal(calls.groupCollapsed[0][0], 'Debug #FromInstance');
  });

  it('appends the correlation id to inline labels', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogMethod({
      logger,
      correlationId: ({ instance }) => instance.id,
    })(() => 'ok', { name: 'run' });

    wrapped.call({ constructor: { name: 'Svc' }, id: 'store-A' });

    assert.equal(calls.log[0][0], '[CALL] Svc:run (store-A)');
  });

  it('ignores a throwing resolver instead of breaking the call', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogMethod({
      logger,
      tag: () => {
        throw new Error('resolver-failure');
      },
      traceMode: 'grouped',
    })(() => 'ok', { name: 'run' });

    assert.equal(wrapped.call({ constructor: { name: 'Svc' } }), 'ok');
    assert.equal(calls.groupCollapsed[0][0], 'Debug #Svc:run');
  });
});

describe('correlated trace scope', () => {
  it('merges nested calls sharing a correlation id into one group', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const options = { logger, traceMode: 'grouped', correlationId: 'flow-1' };
    const inner = LogMethod(options)(function inner(n) {
      return n * 2;
    }, { name: 'inner' });
    const outer = LogMethod(options)(function outer(n) {
      return inner.call(this, n) + 1;
    }, { name: 'outer' });

    const instance = { constructor: { name: 'Svc' } };
    assert.equal(outer.call(instance, 1), 3);

    assert.equal(calls.groupCollapsed.length, 1);
    assert.equal(calls.groupCollapsed[0][0], 'Debug #Svc:outer (flow-1)');

    const statuses = calls.log[0][0].trace.map((event) => event.status);
    assert.deepEqual(statuses, ['CALL', 'CALL', 'RESULT', 'RESULT']);
  });

  it('keeps distinct correlation ids in separate groups', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogMethod({
      logger,
      traceMode: 'grouped',
      correlationId: ({ instance }) => instance.id,
    })(() => 'ok', { name: 'run' });

    wrapped.call({ constructor: { name: 'Svc' }, id: 'A' });
    wrapped.call({ constructor: { name: 'Svc' }, id: 'B' });

    assert.equal(calls.groupCollapsed.length, 2);
  });

  it('closes an async correlated scope only once settled', async () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const options = { logger, traceMode: 'grouped', correlationId: 'flow-async' };
    const inner = LogMethod(options)(async () => 'inner-done', { name: 'inner' });
    const outer = LogMethod(options)(async function outer() {
      return `${await inner.call(this)}+outer`;
    }, { name: 'outer' });

    const instance = { constructor: { name: 'Svc' } };
    assert.equal(await outer.call(instance), 'inner-done+outer');

    assert.equal(calls.groupCollapsed.length, 1);
  });

  it('isolates calls without a correlation id', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const options = { logger, traceMode: 'grouped' };
    const inner = LogMethod(options)(function inner() {
      return 1;
    }, { name: 'inner' });
    const outer = LogMethod(options)(function outer() {
      return inner.call(this) + 1;
    }, { name: 'outer' });

    outer.call({ constructor: { name: 'Svc' } });

    assert.equal(calls.groupCollapsed.length, 2);
  });
});

describe('LogClass identity', () => {
  it('preserves the original class name', () => {
    class UserService {
      run() {
        return 'ok';
      }
    }

    const Decorated = applyClassDecorator(LogClass({ enabled: false }), UserService);

    assert.equal(Decorated.name, 'UserService');
    assert.equal(new Decorated().constructor.name, 'UserService');
  });

  it('derives namespaces from the real class name', () => {
    const { logger, calls } = createLoggerSpy();

    class UserService {
      run() {
        return 'ok';
      }
    }

    const Decorated = applyClassDecorator(
      LogClass({ logger, enabled: true }),
      UserService,
    );

    new Decorated().run();

    assert.equal(calls.log[0][0], '[CALL] UserService:run');
  });

  it('keeps instanceof intact', () => {
    class UserService {}
    const Decorated = applyClassDecorator(LogClass({ enabled: false }), UserService);

    assert.ok(new Decorated() instanceof UserService);
  });
});

describe('sanitize depth guard', () => {
  it('stops traversing beyond the depth limit', () => {
    const deep = { a: { b: { c: { d: 'leaf' } } } };

    assert.deepEqual(sanitize(deep, { maxDepth: 2 }), {
      a: { b: '[MaxDepth]' },
    });
  });

  it('keeps masking sensitive keys within the limit', () => {
    const payload = { nested: { password: 'secret' } };

    assert.deepEqual(sanitize(payload, { maxDepth: 4 }), {
      nested: { password: '***MASKED***' },
    });
  });

  it('leaves shallow payloads untouched under the default limit', () => {
    const payload = { a: 1, b: { c: 2 } };

    assert.deepEqual(sanitize(payload), payload);
  });
});

describe('performance decorator alignment', () => {
  it('labels performance logs with the correlation id', () => {
    globalThis.__TS_TRACE_ENABLED = true;
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogPerformance({ logger, correlationId: 'perf-1' })(
      () => 'ok',
      { name: 'run' },
    );

    wrapped.call({ constructor: { name: 'PerfService' } });

    assert.equal(calls.log[0][0], '[PERFORMANCE] PerfService:run (perf-1)');
  });

  it('stays silent without an opt-in', () => {
    const { logger, calls } = createLoggerSpy();

    const wrapped = LogPerformance({ logger, slowThresholdMs: 0 })(() => 'ok', {
      name: 'run',
    });

    assert.equal(wrapped.call({ constructor: { name: 'PerfService' } }), 'ok');
    assert.equal(calls.log.length, 0);
    assert.equal(calls.warn.length, 0);
  });
});
