import type { RuleConfig, RuleId } from './rules';

export type RuleSet = Record<RuleId, RuleConfig>;

export interface KeyWindowStats {
  requests: number;
  rateLimited: number;
  distinctIps: number;
  failedEndpoints: number;
}

export interface IpWindowStats {
  invalidKeyAttempts: number;
  distinctKeyPrefixes: number;
  failedEndpoints: number;
}

export interface Finding {
  ruleId: RuleId;
  summary: string;
  details: Record<string, unknown>;
  subject: string;
}

function tripped(rule: RuleConfig, value: number): boolean {
  return rule.enabled && value >= rule.threshold;
}

export function evaluateKeyStats(keyId: string, stats: KeyWindowStats, rules: RuleSet): Finding[] {
  const findings: Finding[] = [];
  const subject = `key:${keyId}`;

  if (tripped(rules.credential_abuse, stats.distinctIps)) {
    findings.push({
      ruleId: 'credential_abuse',
      subject,
      summary: `Used from ${stats.distinctIps} different IP addresses in ${rules.credential_abuse.windowSeconds / 60} minutes.`,
      details: { distinctIps: stats.distinctIps },
    });
  }
  if (tripped(rules.request_spike, stats.requests)) {
    findings.push({
      ruleId: 'request_spike',
      subject,
      summary: `${stats.requests} requests in ${rules.request_spike.windowSeconds} seconds.`,
      details: { requests: stats.requests },
    });
  }
  if (tripped(rules.rate_limit_abuse, stats.rateLimited)) {
    findings.push({
      ruleId: 'rate_limit_abuse',
      subject,
      summary: `${stats.rateLimited} requests rejected by the rate limit in ${rules.rate_limit_abuse.windowSeconds / 60} minutes.`,
      details: { rateLimited: stats.rateLimited },
    });
  }
  if (tripped(rules.endpoint_anomaly, stats.failedEndpoints)) {
    findings.push({
      ruleId: 'endpoint_anomaly',
      subject,
      summary: `${stats.failedEndpoints} requests to missing or forbidden endpoints in ${rules.endpoint_anomaly.windowSeconds / 60} minutes.`,
      details: { failedEndpoints: stats.failedEndpoints },
    });
  }
  return findings;
}

export function evaluateIpStats(ip: string, stats: IpWindowStats, rules: RuleSet): Finding[] {
  const findings: Finding[] = [];
  const subject = `ip:${ip}`;

  if (tripped(rules.invalid_key_abuse, stats.invalidKeyAttempts)) {
    findings.push({
      ruleId: 'invalid_key_abuse',
      subject,
      summary: `${stats.invalidKeyAttempts} requests with invalid API keys in ${rules.invalid_key_abuse.windowSeconds / 60} minutes.`,
      details: { invalidKeyAttempts: stats.invalidKeyAttempts },
    });
  }
  if (tripped(rules.suspicious_ip, stats.distinctKeyPrefixes)) {
    findings.push({
      ruleId: 'suspicious_ip',
      subject,
      summary: `Presented ${stats.distinctKeyPrefixes} different API keys in ${rules.suspicious_ip.windowSeconds / 60} minutes.`,
      details: { distinctKeyPrefixes: stats.distinctKeyPrefixes },
    });
  }
  if (tripped(rules.endpoint_anomaly, stats.failedEndpoints)) {
    findings.push({
      ruleId: 'endpoint_anomaly',
      subject,
      summary: `${stats.failedEndpoints} requests to missing endpoints in ${rules.endpoint_anomaly.windowSeconds / 60} minutes. This pattern is typical of scanning.`,
      details: { failedEndpoints: stats.failedEndpoints },
    });
  }
  return findings;
}

export interface GeoInput {
  keyId: string;
  country: string;
  knownCountries: string[];
  expectedCountries: string[];
  priorRequests: number;
}

export function evaluateGeo(input: GeoInput, rules: RuleSet): Finding | null {
  const rule = rules.geo_anomaly;
  if (!rule.enabled) return null;

  const { country, keyId, knownCountries, expectedCountries, priorRequests } = input;
  if (expectedCountries.includes(country)) return null;

  const violatesExpected = expectedCountries.length > 0;
  const isNewForKey = !knownCountries.includes(country) && priorRequests >= rule.threshold;
  if (!violatesExpected && !isNewForKey) return null;

  return {
    ruleId: 'geo_anomaly',
    subject: `key:${keyId}:country:${country}`,
    summary: violatesExpected
      ? `Used from ${country}, outside this key's expected countries (${expectedCountries.join(', ')}). IP geolocation is approximate: this is a signal, not proof of misuse.`
      : `First use from ${country} after ${priorRequests} requests elsewhere. IP geolocation is approximate: this is a signal, not proof of misuse.`,
    details: { country, knownCountries, expectedCountries, priorRequests },
  };
}

export interface TrafficInput {
  recentRequests: number;
  baselinePerWindow: number;
}

const MIN_TRAFFIC_VOLUME = 100;
const MIN_BASELINE = 1;

export function evaluateTraffic(input: TrafficInput, rules: RuleSet): Finding | null {
  const rule = rules.traffic_anomaly;
  if (!rule.enabled || input.recentRequests < MIN_TRAFFIC_VOLUME) return null;

  const baseline = Math.max(input.baselinePerWindow, MIN_BASELINE);
  const multiple = input.recentRequests / baseline;
  if (multiple < rule.threshold) return null;

  return {
    ruleId: 'traffic_anomaly',
    subject: 'global:traffic',
    summary: `${input.recentRequests} requests in the last ${rule.windowSeconds / 60} minutes, ${multiple.toFixed(1)} times the 24-hour baseline.`,
    details: { ...input, multiple: Number(multiple.toFixed(2)) },
  };
}

export interface ServiceInput {
  total: number;
  serverErrors: number;
}

const MIN_SERVICE_SAMPLE = 10;

export function evaluateServiceHealth(input: ServiceInput, rules: RuleSet): Finding | null {
  const rule = rules.service_failure;
  if (!rule.enabled || input.total < MIN_SERVICE_SAMPLE) return null;

  const rate = (input.serverErrors / input.total) * 100;
  if (rate < rule.threshold) return null;

  return {
    ruleId: 'service_failure',
    subject: 'global:service',
    summary: `${input.serverErrors} of ${input.total} API requests failed with a server error (${rate.toFixed(1)}%).`,
    details: { ...input, errorRatePercent: Number(rate.toFixed(1)) },
  };
}
