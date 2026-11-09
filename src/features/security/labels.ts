export const CLASSIFICATION_LABELS = {
  anomaly: 'Anomaly (unusual, may be harmless)',
  policy_violation: 'Policy violation',
  suspected_threat: 'Suspected threat (unconfirmed)',
  service_failure: 'Service failure',
  confirmed_threat: 'Confirmed threat',
} as const;

export const CLASSIFICATION_SHORT_LABELS = {
  anomaly: 'Anomaly',
  policy_violation: 'Policy violation',
  suspected_threat: 'Suspected threat',
  service_failure: 'Service failure',
  confirmed_threat: 'Confirmed threat',
} as const;

export const STATUS_LABELS = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  false_positive: 'False positive',
} as const;
