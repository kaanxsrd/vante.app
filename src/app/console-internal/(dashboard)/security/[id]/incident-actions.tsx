'use client';

import { Ban, CheckCircle2, Eye, Pause, ShieldX, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { suspendApiKeyAction } from '@/features/api-keys/actions';
import {
  confirmThreatAction,
  saveIpRuleAction,
  updateEventStatusAction,
} from '@/features/security/actions';

interface IncidentActionsProps {
  id: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  isConfirmed: boolean;
  ip: string | null;
  apiKeyId: string | null;
}

const SUSPEND_MINUTES = 60;

export function IncidentActions({ id, status, isConfirmed, ip, apiKeyId }: IncidentActionsProps) {
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState<'confirm' | 'block' | 'suspend' | null>(null);

  const updateStatus = useAction(updateEventStatusAction, { success: 'Incident updated' });
  const confirmThreat = useAction(confirmThreatAction, { success: 'Marked as a confirmed threat' });
  const blockIp = useAction(saveIpRuleAction, { success: 'IP address blocked' });
  const suspendKey = useAction(suspendApiKeyAction, { success: 'Key suspended for 60 minutes' });

  const closed = status === 'resolved' || status === 'false_positive';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="incident-note">Note</Label>
          <Textarea
            id="incident-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          {status === 'open' && (
            <Button
              variant="outline"
              disabled={updateStatus.pending}
              onClick={() => updateStatus.run({ id, status: 'acknowledged', note })}
            >
              <Eye />
              Acknowledge
            </Button>
          )}
          {closed ? (
            <Button
              variant="outline"
              disabled={updateStatus.pending}
              onClick={() => updateStatus.run({ id, status: 'open', note })}
            >
              Reopen
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={updateStatus.pending}
                onClick={() => updateStatus.run({ id, status: 'resolved', note })}
              >
                <CheckCircle2 />
                Resolve
              </Button>
              <Button
                variant="outline"
                disabled={updateStatus.pending}
                onClick={() => updateStatus.run({ id, status: 'false_positive', note })}
              >
                <XCircle />
                False positive
              </Button>
            </>
          )}
          {!isConfirmed && (
            <Button variant="outline" onClick={() => setDialog('confirm')}>
              <ShieldX />
              Confirm as a real threat
            </Button>
          )}
          {apiKeyId && (
            <Button variant="outline" onClick={() => setDialog('suspend')}>
              <Pause />
              Suspend this API key
            </Button>
          )}
          {ip && (
            <Button variant="destructive" onClick={() => setDialog('block')}>
              <Ban />
              Block this IP address
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmAction
        open={dialog === 'confirm'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Confirm this incident as a real threat?"
        description="Use this when you have verified it is an attack and not a false alarm."
        confirmLabel="Confirm threat"
        onConfirm={() => confirmThreat.run({ id, note })}
      />
      <ConfirmAction
        open={dialog === 'suspend'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Suspend this API key?"
        description={`Requests using it are rejected for ${SUSPEND_MINUTES} minutes. You can lift this from API Management.`}
        confirmLabel="Suspend key"
        onConfirm={() =>
          apiKeyId &&
          suspendKey.run({ id: apiKeyId, minutes: SUSPEND_MINUTES, reason: `Incident ${id}` })
        }
      />
      <ConfirmAction
        open={dialog === 'block'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Block ${ip}?`}
        description="API requests and dashboard sign-ins from this address are refused until you remove the rule."
        confirmLabel="Block IP address"
        destructive
        onConfirm={() =>
          ip && blockIp.run({ ip, action: 'block', reason: `Incident ${id}`, expiresAt: null })
        }
      />
    </Card>
  );
}
