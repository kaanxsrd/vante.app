import type { NotificationCategory, Severity } from '@/features/settings/schema';

export const RULE_IDS = [
  'credential_abuse',
  'request_spike',
  'traffic_anomaly',
  'auth_failures',
  'invalid_key_abuse',
  'revoked_key_use',
  'rate_limit_abuse',
  'geo_anomaly',
  'unexpected_origin',
  'suspicious_ip',
  'endpoint_anomaly',
  'service_failure',
] as const;

export type RuleId = (typeof RULE_IDS)[number];

type Classification = 'anomaly' | 'policy_violation' | 'suspected_threat' | 'service_failure';

export interface RuleConfig {
  ruleId: RuleId;
  enabled: boolean;
  severity: Severity;
  threshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
  notify: boolean;
  autoSuspend: boolean;
  suspendMinutes: number;
}

export interface RuleDefinition {
  id: RuleId;
  label: string;
  description: string;
  thresholdLabel: string;
  classification: Classification;
  category: NotificationCategory;
  canAutoSuspend: boolean;
  recommendedActions: string[];
  defaults: Omit<RuleConfig, 'ruleId' | 'autoSuspend' | 'suspendMinutes'>;
}

export const RULES: Record<RuleId, RuleDefinition> = {
  credential_abuse: {
    id: 'credential_abuse',
    label: 'Potential credential abuse',
    description: 'One key used from many different IP addresses in a short time.',
    thresholdLabel: 'Distinct IPs',
    classification: 'suspected_threat',
    category: 'key_compromise',
    canAutoSuspend: true,
    recommendedActions: [
      'Check whether this key is legitimately shared across several servers.',
      'If not, rotate or revoke it now.',
      'Review its recent request history for unexpected endpoints.',
    ],
    defaults: {
      enabled: true,
      severity: 'critical',
      threshold: 8,
      windowSeconds: 600,
      cooldownSeconds: 3600,
      notify: true,
    },
  },
  request_spike: {
    id: 'request_spike',
    label: 'Unusual request volume',
    description: 'A single key sent far more requests than expected in a short window.',
    thresholdLabel: 'Requests',
    classification: 'anomaly',
    category: 'spike',
    canAutoSuspend: true,
    recommendedActions: [
      'Confirm whether a deployment or batch job explains the traffic.',
      'Lower the rate limit on this key if the volume is unwanted.',
      'Rotate the key if the traffic is not yours.',
    ],
    defaults: {
      enabled: true,
      severity: 'high',
      threshold: 600,
      windowSeconds: 60,
      cooldownSeconds: 900,
      notify: true,
    },
  },
  traffic_anomaly: {
    id: 'traffic_anomaly',
    label: 'Abnormal API traffic',
    description: 'Total API traffic is several times above its 24-hour baseline.',
    thresholdLabel: 'Multiple of baseline',
    classification: 'anomaly',
    category: 'spike',
    canAutoSuspend: false,
    recommendedActions: [
      'Find which keys and endpoints account for the increase in API Analytics.',
      'Check whether a launch or an integration explains it.',
    ],
    defaults: {
      enabled: true,
      severity: 'medium',
      threshold: 5,
      windowSeconds: 300,
      cooldownSeconds: 1800,
      notify: true,
    },
  },
  auth_failures: {
    id: 'auth_failures',
    label: 'Repeated sign-in failures',
    description: 'Repeated failed sign-ins to this dashboard from one IP address.',
    thresholdLabel: 'Failed attempts',
    classification: 'suspected_threat',
    category: 'auth_failures',
    canAutoSuspend: false,
    recommendedActions: [
      'If this was not you, block the IP address from the incident page.',
      'Confirm your password is unique and review active sessions in Settings.',
    ],
    defaults: {
      enabled: true,
      severity: 'high',
      threshold: 5,
      windowSeconds: 900,
      cooldownSeconds: 3600,
      notify: true,
    },
  },
  invalid_key_abuse: {
    id: 'invalid_key_abuse',
    label: 'Invalid API key abuse',
    description: 'Repeated requests from one IP address using keys that do not exist.',
    thresholdLabel: 'Invalid attempts',
    classification: 'suspected_threat',
    category: 'invalid_key',
    canAutoSuspend: false,
    recommendedActions: [
      'Block the IP address if the attempts continue.',
      'Check whether one of your clients has a stale or mistyped key.',
    ],
    defaults: {
      enabled: true,
      severity: 'high',
      threshold: 15,
      windowSeconds: 300,
      cooldownSeconds: 1800,
      notify: true,
    },
  },
  revoked_key_use: {
    id: 'revoked_key_use',
    label: 'Revoked or expired key in use',
    description: 'A correct secret was presented for a key that is revoked or expired.',
    thresholdLabel: 'Attempts',
    classification: 'suspected_threat',
    category: 'key_compromise',
    canAutoSuspend: false,
    recommendedActions: [
      'Find the client still using this key and move it to a new one.',
      'If the key was revoked because it leaked, treat this as active misuse and block the IP.',
    ],
    defaults: {
      enabled: true,
      severity: 'medium',
      threshold: 1,
      windowSeconds: 300,
      cooldownSeconds: 3600,
      notify: true,
    },
  },
  rate_limit_abuse: {
    id: 'rate_limit_abuse',
    label: 'Rate-limit violations',
    description: 'A key keeps hitting its rate limit instead of backing off.',
    thresholdLabel: 'Rejected requests',
    classification: 'policy_violation',
    category: 'abuse',
    canAutoSuspend: true,
    recommendedActions: [
      'Check whether the client implements backoff on 429 responses.',
      'Raise the limit if the traffic is expected, or suspend the key if it is not.',
    ],
    defaults: {
      enabled: true,
      severity: 'medium',
      threshold: 30,
      windowSeconds: 300,
      cooldownSeconds: 1800,
      notify: true,
    },
  },
  geo_anomaly: {
    id: 'geo_anomaly',
    label: 'Geographic anomaly',
    description:
      'A key was used from a country it is not normally seen in. IP geolocation is approximate and VPNs, proxies and mobile networks trigger this routinely, so it is a signal and not proof of an attack.',
    thresholdLabel: 'Prior requests before alerting',
    classification: 'anomaly',
    category: 'geo',
    canAutoSuspend: false,
    recommendedActions: [
      'Check whether a VPN, a CI provider or travel explains the location.',
      'Add the country to the key’s expected countries if it is legitimate.',
      'Only rotate the key if other signals point to misuse.',
    ],
    defaults: {
      enabled: true,
      severity: 'low',
      threshold: 50,
      windowSeconds: 2_592_000,
      cooldownSeconds: 86_400,
      notify: false,
    },
  },
  unexpected_origin: {
    id: 'unexpected_origin',
    label: 'Unexpected request origin',
    description: 'A request came from a browser origin that is not on the key’s allow-list.',
    thresholdLabel: 'Attempts',
    classification: 'policy_violation',
    category: 'abuse',
    canAutoSuspend: false,
    recommendedActions: [
      'Add the origin to the key if it is one of your sites.',
      'If not, the key may be exposed in client-side code: rotate it.',
    ],
    defaults: {
      enabled: true,
      severity: 'medium',
      threshold: 1,
      windowSeconds: 300,
      cooldownSeconds: 3600,
      notify: true,
    },
  },
  suspicious_ip: {
    id: 'suspicious_ip',
    label: 'Suspicious IP address',
    description: 'One IP address presented several different keys, or is blocked or disallowed.',
    thresholdLabel: 'Distinct keys',
    classification: 'suspected_threat',
    category: 'abuse',
    canAutoSuspend: false,
    recommendedActions: [
      'Block the IP address if it is not yours.',
      'Review which keys it tried and rotate any that succeeded.',
    ],
    defaults: {
      enabled: true,
      severity: 'high',
      threshold: 4,
      windowSeconds: 600,
      cooldownSeconds: 3600,
      notify: true,
    },
  },
  endpoint_anomaly: {
    id: 'endpoint_anomaly',
    label: 'Unusual endpoint access',
    description: 'A key or IP is probing many missing endpoints or ones outside its permissions.',
    thresholdLabel: 'Failed endpoints',
    classification: 'anomaly',
    category: 'abuse',
    canAutoSuspend: false,
    recommendedActions: [
      'Review the paths in the request history for signs of scanning.',
      'Check that the key has the permissions its client expects.',
    ],
    defaults: {
      enabled: true,
      severity: 'medium',
      threshold: 12,
      windowSeconds: 300,
      cooldownSeconds: 1800,
      notify: true,
    },
  },
  service_failure: {
    id: 'service_failure',
    label: 'API service failure',
    description: 'A high share of API requests are failing with server errors.',
    thresholdLabel: 'Error rate (%)',
    classification: 'service_failure',
    category: 'service_failure',
    canAutoSuspend: false,
    recommendedActions: [
      'Check the server logs and database connectivity.',
      'Review recent deployments and content changes.',
    ],
    defaults: {
      enabled: true,
      severity: 'critical',
      threshold: 25,
      windowSeconds: 300,
      cooldownSeconds: 1800,
      notify: true,
    },
  },
};

export function defaultRuleConfig(id: RuleId): RuleConfig {
  return { ruleId: id, ...RULES[id].defaults, autoSuspend: false, suspendMinutes: 60 };
}

export function isRuleId(value: string): value is RuleId {
  return (RULE_IDS as readonly string[]).includes(value);
}
