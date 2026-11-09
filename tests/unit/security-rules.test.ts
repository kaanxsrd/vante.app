import { describe, expect, test } from 'bun:test';
import {
  evaluateGeo,
  evaluateIpStats,
  evaluateKeyStats,
  evaluateServiceHealth,
  evaluateTraffic,
  type RuleSet,
} from '@/features/security/evaluate';
import { defaultRuleConfig, RULE_IDS, RULES } from '@/features/security/rules';

function defaults(): RuleSet {
  return Object.fromEntries(RULE_IDS.map((id) => [id, defaultRuleConfig(id)])) as RuleSet;
}

const QUIET = { requests: 1, rateLimited: 0, distinctIps: 1, failedEndpoints: 0 };

describe('rule definitions', () => {
  test('automatic suspension is off for every rule by default', () => {
    for (const id of RULE_IDS) expect(defaultRuleConfig(id).autoSuspend).toBe(false);
  });

  test('only strong signals may ever auto-suspend', () => {
    expect(RULES.geo_anomaly.canAutoSuspend).toBe(false);
    expect(RULES.unexpected_origin.canAutoSuspend).toBe(false);
    expect(RULES.traffic_anomaly.canAutoSuspend).toBe(false);
  });

  test('no rule claims a confirmed threat by itself', () => {
    for (const id of RULE_IDS) {
      expect(RULES[id].classification as string).not.toBe('confirmed_threat');
    }
  });

  test('geographic signals are anomalies, not threats', () => {
    expect(RULES.geo_anomaly.classification).toBe('anomaly');
  });

  test('every rule tells the admin what to do', () => {
    for (const id of RULE_IDS) expect(RULES[id].recommendedActions.length).toBeGreaterThan(0);
  });
});

describe('evaluateKeyStats', () => {
  test('quiet traffic raises nothing', () => {
    expect(evaluateKeyStats('k', QUIET, defaults())).toEqual([]);
  });

  test('fires exactly at the threshold', () => {
    const rules = defaults();
    const stats = { ...QUIET, distinctIps: rules.credential_abuse.threshold };
    expect(evaluateKeyStats('k', stats, rules).map((f) => f.ruleId)).toEqual(['credential_abuse']);
  });

  test('stays quiet one below the threshold', () => {
    const rules = defaults();
    const stats = { ...QUIET, distinctIps: rules.credential_abuse.threshold - 1 };
    expect(evaluateKeyStats('k', stats, rules)).toEqual([]);
  });

  test('a disabled rule never fires', () => {
    const rules = defaults();
    rules.request_spike.enabled = false;
    const stats = { ...QUIET, requests: 1_000_000 };
    expect(evaluateKeyStats('k', stats, rules)).toEqual([]);
  });

  test('uses the configured threshold', () => {
    const rules = defaults();
    rules.request_spike.threshold = 5;
    expect(evaluateKeyStats('k', { ...QUIET, requests: 5 }, rules)).toHaveLength(1);
  });

  test('groups findings by key', () => {
    const rules = defaults();
    const stats = { ...QUIET, rateLimited: rules.rate_limit_abuse.threshold };
    expect(evaluateKeyStats('abc', stats, rules)[0]?.subject).toBe('key:abc');
  });
});

describe('evaluateIpStats', () => {
  const quiet = { invalidKeyAttempts: 0, distinctKeyPrefixes: 0, failedEndpoints: 0 };

  test('quiet traffic raises nothing', () => {
    expect(evaluateIpStats('1.1.1.1', quiet, defaults())).toEqual([]);
  });

  test('detects invalid key abuse', () => {
    const rules = defaults();
    const stats = { ...quiet, invalidKeyAttempts: rules.invalid_key_abuse.threshold };
    expect(evaluateIpStats('1.1.1.1', stats, rules)[0]?.ruleId).toBe('invalid_key_abuse');
  });

  test('detects one address trying many keys', () => {
    const rules = defaults();
    const stats = { ...quiet, distinctKeyPrefixes: rules.suspicious_ip.threshold };
    expect(evaluateIpStats('1.1.1.1', stats, rules)[0]?.ruleId).toBe('suspicious_ip');
  });

  test('describes scanning', () => {
    const rules = defaults();
    const stats = { ...quiet, failedEndpoints: rules.endpoint_anomaly.threshold };
    expect(evaluateIpStats('1.1.1.1', stats, rules)[0]?.summary).toContain('scanning');
  });
});

describe('evaluateGeo', () => {
  const input = {
    keyId: 'k',
    country: 'BR',
    knownCountries: ['DK'],
    expectedCountries: [] as string[],
    priorRequests: 500,
  };

  test('a key with no history never looks anomalous', () => {
    expect(evaluateGeo({ ...input, priorRequests: 0 }, defaults())).toBeNull();
  });

  test('stays silent during the learning period', () => {
    const rules = defaults();
    expect(
      evaluateGeo({ ...input, priorRequests: rules.geo_anomaly.threshold - 1 }, rules),
    ).toBeNull();
  });

  test('a known country is fine', () => {
    expect(evaluateGeo({ ...input, knownCountries: ['BR'] }, defaults())).toBeNull();
  });

  test('flags a new country once the key has history', () => {
    expect(evaluateGeo(input, defaults())?.ruleId).toBe('geo_anomaly');
  });

  test('an expected country is always fine', () => {
    expect(evaluateGeo({ ...input, expectedCountries: ['BR'] }, defaults())).toBeNull();
  });

  test('outside the expected list alerts without any learning period', () => {
    const finding = evaluateGeo(
      { ...input, expectedCountries: ['DK'], priorRequests: 0 },
      defaults(),
    );
    expect(finding?.ruleId).toBe('geo_anomaly');
  });

  test('the wording never claims an attack', () => {
    expect(evaluateGeo(input, defaults())?.summary).toContain('not proof of misuse');
  });

  test('can be disabled', () => {
    const rules = defaults();
    rules.geo_anomaly.enabled = false;
    expect(evaluateGeo(input, rules)).toBeNull();
  });
});

describe('evaluateTraffic', () => {
  test('ignores small volumes however large the multiple', () => {
    expect(evaluateTraffic({ recentRequests: 50, baselinePerWindow: 1 }, defaults())).toBeNull();
  });

  test('flags traffic far above baseline', () => {
    const finding = evaluateTraffic({ recentRequests: 1000, baselinePerWindow: 10 }, defaults());
    expect(finding?.ruleId).toBe('traffic_anomaly');
  });

  test('accepts traffic near baseline', () => {
    expect(evaluateTraffic({ recentRequests: 200, baselinePerWindow: 150 }, defaults())).toBeNull();
  });

  test('handles a zero baseline', () => {
    expect(
      evaluateTraffic({ recentRequests: 200, baselinePerWindow: 0 }, defaults()),
    ).not.toBeNull();
  });
});

describe('evaluateServiceHealth', () => {
  test('needs a meaningful sample', () => {
    expect(evaluateServiceHealth({ total: 2, serverErrors: 2 }, defaults())).toBeNull();
  });

  test('flags a high server error rate', () => {
    expect(evaluateServiceHealth({ total: 100, serverErrors: 50 }, defaults())?.ruleId).toBe(
      'service_failure',
    );
  });

  test('tolerates a low error rate', () => {
    expect(evaluateServiceHealth({ total: 100, serverErrors: 1 }, defaults())).toBeNull();
  });
});
