import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Info,
  PauseCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type { ApiKeyState } from '@/features/api-keys/state';
import { CLASSIFICATION_SHORT_LABELS, STATUS_LABELS } from '@/features/security/labels';
import type { Severity } from '@/features/settings/schema';

const SEVERITY: Record<Severity, { variant: BadgeVariant; icon: typeof Info; label: string }> = {
  info: { variant: 'outline', icon: Info, label: 'Info' },
  low: { variant: 'secondary', icon: Circle, label: 'Low' },
  medium: { variant: 'warning', icon: AlertTriangle, label: 'Medium' },
  high: { variant: 'serious', icon: ShieldAlert, label: 'High' },
  critical: { variant: 'critical', icon: AlertOctagon, label: 'Critical' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { variant, icon: Icon, label } = SEVERITY[severity];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

type Classification = keyof typeof CLASSIFICATION_SHORT_LABELS;

const CLASSIFICATION_VARIANT: Record<Classification, BadgeVariant> = {
  anomaly: 'outline',
  policy_violation: 'secondary',
  suspected_threat: 'warning',
  service_failure: 'serious',
  confirmed_threat: 'critical',
};

export function ClassificationBadge({ classification }: { classification: Classification }) {
  return (
    <Badge variant={CLASSIFICATION_VARIANT[classification]}>
      {CLASSIFICATION_SHORT_LABELS[classification]}
    </Badge>
  );
}

type EventStatus = keyof typeof STATUS_LABELS;

const EVENT_STATUS_VARIANT: Record<EventStatus, BadgeVariant> = {
  open: 'warning',
  acknowledged: 'secondary',
  resolved: 'success',
  false_positive: 'outline',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge variant={EVENT_STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}

const KEY_STATE: Record<ApiKeyState, { variant: BadgeVariant; icon: typeof Info; label: string }> =
  {
    active: { variant: 'success', icon: CheckCircle2, label: 'Active' },
    suspended: { variant: 'warning', icon: PauseCircle, label: 'Suspended' },
    expired: { variant: 'outline', icon: Clock, label: 'Expired' },
    revoked: { variant: 'critical', icon: XCircle, label: 'Revoked' },
  };

export function KeyStateBadge({ state }: { state: ApiKeyState }) {
  const { variant, icon: Icon, label } = KEY_STATE[state];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function ContentStatusBadge({ status }: { status: 'draft' | 'published' }) {
  return status === 'published' ? (
    <Badge variant="success">
      <CheckCircle2 aria-hidden="true" />
      Published
    </Badge>
  ) : (
    <Badge variant="outline">Draft</Badge>
  );
}

const STATUS_CLASS_VARIANT = (code: number): BadgeVariant => {
  if (code >= 500) return 'critical';
  if (code === 429) return 'serious';
  if (code >= 400) return 'warning';
  return 'success';
};

export function HttpStatusBadge({ code }: { code: number }) {
  return (
    <Badge variant={STATUS_CLASS_VARIANT(code)} className="font-mono tabular-nums">
      {code}
    </Badge>
  );
}
