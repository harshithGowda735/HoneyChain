/**
 * Standalone Unit Tests for HoneyChain Temperature Alert Service & State Transitions
 */

const assert = require('assert');

// Replicate pure logic under test
const DEFAULT_TEMP_CONFIG = {
  highThreshold: 38.0,
  highRecoveryThreshold: 36.5,
  lowThreshold: 29.0,
  lowRecoveryThreshold: 31.5,
  staleReadingMaxHours: 24,
};

const TEMP_STATES = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
};

function evaluateTemperatureTransition(currentState, temperature, config = DEFAULT_TEMP_CONFIG) {
  const cfg = { ...DEFAULT_TEMP_CONFIG, ...config };

  if (
    typeof temperature !== 'number' ||
    isNaN(temperature) ||
    temperature < -20 ||
    temperature > 60
  ) {
    return {
      nextState: currentState || TEMP_STATES.UNKNOWN,
      transition: null,
    };
  }

  const effectiveState = currentState || TEMP_STATES.NORMAL;

  switch (effectiveState) {
    case TEMP_STATES.NORMAL: {
      if (temperature >= cfg.highThreshold) {
        return {
          nextState: TEMP_STATES.HIGH,
          transition: 'NORMAL_TO_HIGH',
          type: 'temp_high',
          severity: 'critical',
          title: 'High Temperature Alert',
        };
      }
      if (temperature <= cfg.lowThreshold) {
        return {
          nextState: TEMP_STATES.LOW,
          transition: 'NORMAL_TO_LOW',
          type: 'temp_low',
          severity: 'warning',
          title: 'Low Temperature Alert',
        };
      }
      return {
        nextState: TEMP_STATES.NORMAL,
        transition: null,
      };
    }

    case TEMP_STATES.HIGH: {
      if (temperature <= cfg.highRecoveryThreshold) {
        return {
          nextState: TEMP_STATES.NORMAL,
          transition: 'HIGH_TO_NORMAL',
          type: 'temp_recovered',
          severity: 'success',
          title: 'Temperature Normalized',
        };
      }
      return {
        nextState: TEMP_STATES.HIGH,
        transition: null,
      };
    }

    case TEMP_STATES.LOW: {
      if (temperature >= cfg.lowRecoveryThreshold) {
        return {
          nextState: TEMP_STATES.NORMAL,
          transition: 'LOW_TO_NORMAL',
          type: 'temp_recovered',
          severity: 'success',
          title: 'Temperature Normalized',
        };
      }
      return {
        nextState: TEMP_STATES.LOW,
        transition: null,
      };
    }

    case TEMP_STATES.UNKNOWN:
    default: {
      if (temperature >= cfg.highThreshold) {
        return {
          nextState: TEMP_STATES.HIGH,
          transition: 'INIT_HIGH',
          type: 'temp_high',
          severity: 'critical',
        };
      }
      if (temperature <= cfg.lowThreshold) {
        return {
          nextState: TEMP_STATES.LOW,
          transition: 'INIT_LOW',
          type: 'temp_low',
          severity: 'warning',
        };
      }
      return {
        nextState: TEMP_STATES.NORMAL,
        transition: null,
      };
    }
  }
}

function runTests() {
  console.log('======================================================');
  console.log('🐝 HoneyChain Temperature State Machine Unit Tests');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`▶ TEST: ${name.padEnd(65)} ✅ PASS`);
      passed++;
    } catch (e) {
      console.error(`▶ TEST: ${name.padEnd(65)} ❌ FAIL: ${e.message}`);
      failed++;
    }
  }

  // 1. Normal state tests
  test('NORMAL with 34.5°C stays NORMAL with no transition', () => {
    const res = evaluateTemperatureTransition('NORMAL', 34.5);
    assert.strictEqual(res.nextState, 'NORMAL');
    assert.strictEqual(res.transition, null);
  });

  // 2. High threshold transition
  test('NORMAL with 38.0°C triggers NORMAL_TO_HIGH critical alert', () => {
    const res = evaluateTemperatureTransition('NORMAL', 38.0);
    assert.strictEqual(res.nextState, 'HIGH');
    assert.strictEqual(res.transition, 'NORMAL_TO_HIGH');
    assert.strictEqual(res.severity, 'critical');
    assert.strictEqual(res.type, 'temp_high');
  });

  test('NORMAL with 39.5°C triggers NORMAL_TO_HIGH critical alert', () => {
    const res = evaluateTemperatureTransition('NORMAL', 39.5);
    assert.strictEqual(res.nextState, 'HIGH');
    assert.strictEqual(res.transition, 'NORMAL_TO_HIGH');
  });

  // 3. Deduplication in HIGH state
  test('HIGH with 39.0°C stays HIGH with NO duplicate transition', () => {
    const res = evaluateTemperatureTransition('HIGH', 39.0);
    assert.strictEqual(res.nextState, 'HIGH');
    assert.strictEqual(res.transition, null);
  });

  test('HIGH with 37.2°C stays HIGH (within 1.5°C hysteresis margin, no recovery)', () => {
    const res = evaluateTemperatureTransition('HIGH', 37.2);
    assert.strictEqual(res.nextState, 'HIGH');
    assert.strictEqual(res.transition, null);
  });

  // 4. Recovery from HIGH
  test('HIGH with 36.5°C cools past hysteresis and triggers HIGH_TO_NORMAL recovery', () => {
    const res = evaluateTemperatureTransition('HIGH', 36.5);
    assert.strictEqual(res.nextState, 'NORMAL');
    assert.strictEqual(res.transition, 'HIGH_TO_NORMAL');
    assert.strictEqual(res.type, 'temp_recovered');
    assert.strictEqual(res.severity, 'success');
  });

  test('HIGH with 35.0°C triggers HIGH_TO_NORMAL recovery', () => {
    const res = evaluateTemperatureTransition('HIGH', 35.0);
    assert.strictEqual(res.nextState, 'NORMAL');
    assert.strictEqual(res.transition, 'HIGH_TO_NORMAL');
  });

  // 5. Low threshold transition
  test('NORMAL with 29.0°C triggers NORMAL_TO_LOW warning alert', () => {
    const res = evaluateTemperatureTransition('NORMAL', 29.0);
    assert.strictEqual(res.nextState, 'LOW');
    assert.strictEqual(res.transition, 'NORMAL_TO_LOW');
    assert.strictEqual(res.severity, 'warning');
    assert.strictEqual(res.type, 'temp_low');
  });

  // 6. Deduplication in LOW state
  test('LOW with 28.0°C stays LOW with NO duplicate transition', () => {
    const res = evaluateTemperatureTransition('LOW', 28.0);
    assert.strictEqual(res.nextState, 'LOW');
    assert.strictEqual(res.transition, null);
  });

  test('LOW with 30.5°C stays LOW (within 2.5°C hysteresis margin, no recovery)', () => {
    const res = evaluateTemperatureTransition('LOW', 30.5);
    assert.strictEqual(res.nextState, 'LOW');
    assert.strictEqual(res.transition, null);
  });

  // 7. Recovery from LOW
  test('LOW with 31.5°C warms past hysteresis and triggers LOW_TO_NORMAL recovery', () => {
    const res = evaluateTemperatureTransition('LOW', 31.5);
    assert.strictEqual(res.nextState, 'NORMAL');
    assert.strictEqual(res.transition, 'LOW_TO_NORMAL');
    assert.strictEqual(res.type, 'temp_recovered');
    assert.strictEqual(res.severity, 'success');
  });

  // 8. Missing, NaN, and Out-of-bounds guards
  test('Rejects null reading without altering state or generating alert', () => {
    const res = evaluateTemperatureTransition('HIGH', null);
    assert.strictEqual(res.nextState, 'HIGH');
    assert.strictEqual(res.transition, null);
  });

  test('Rejects NaN reading without altering state or generating alert', () => {
    const res = evaluateTemperatureTransition('NORMAL', NaN);
    assert.strictEqual(res.nextState, 'NORMAL');
    assert.strictEqual(res.transition, null);
  });

  test('Rejects unrealistic out-of-bounds reading (-25°C or 75°C)', () => {
    const res1 = evaluateTemperatureTransition('NORMAL', -25);
    assert.strictEqual(res1.transition, null);
    const res2 = evaluateTemperatureTransition('NORMAL', 75);
    assert.strictEqual(res2.transition, null);
  });

  // 9. Configurable custom thresholds
  test('Custom thresholds (e.g. high: 40°C, recovery: 38°C) are respected', () => {
    const customConfig = { highThreshold: 40.0, highRecoveryThreshold: 38.0 };
    // 38.5 is normal under 40°C threshold
    const res1 = evaluateTemperatureTransition('NORMAL', 38.5, customConfig);
    assert.strictEqual(res1.nextState, 'NORMAL');
    assert.strictEqual(res1.transition, null);

    // 40.1 triggers high
    const res2 = evaluateTemperatureTransition('NORMAL', 40.1, customConfig);
    assert.strictEqual(res2.nextState, 'HIGH');
    assert.strictEqual(res2.transition, 'NORMAL_TO_HIGH');
  });

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();

