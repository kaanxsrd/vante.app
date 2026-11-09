'use client';

import { Check, Copy, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Field } from '@/components/admin/content-fields';
import { useAction } from '@/components/admin/use-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  regenerateBackupCodesAction,
  startTwoFactorSetupAction,
} from '@/features/auth/account-actions';

interface Setup {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

function BackupCodesDialog({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText((codes ?? []).join('\n'));
      setCopied(true);
    } catch {
      toast.error('Copy failed. Select the codes and copy them manually.');
    }
  }

  return (
    <Dialog
      open={codes !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your backup codes</DialogTitle>
          <DialogDescription>
            Each code works once if you lose your authenticator app. They are not shown again.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/50 p-3 font-mono text-sm select-all">
          {(codes ?? []).map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy codes'}
          </Button>
          <Button
            onClick={() => {
              setCopied(false);
              onClose();
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<Setup | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const start = useAction(startTwoFactorSetupAction, {
    refresh: false,
    onSuccess: (result) => {
      setPassword('');
      setSetup(result);
    },
  });
  const confirm = useAction(confirmTwoFactorSetupAction, {
    success: 'Two-factor login is on',
    onSuccess: () => {
      setBackupCodes(setup?.backupCodes ?? []);
      setSetup(null);
      setCode('');
    },
  });
  const disable = useAction(disableTwoFactorAction, {
    success: 'Two-factor login is off',
    onSuccess: () => setPassword(''),
  });
  const regenerate = useAction(regenerateBackupCodesAction, {
    refresh: false,
    onSuccess: (result) => {
      setPassword('');
      setBackupCodes(result.backupCodes);
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Two-factor login</CardTitle>
          <CardDescription>
            Require a code from an authenticator app when signing in.
          </CardDescription>
        </div>
        {enabled ? (
          <Badge variant="success">
            <ShieldCheck aria-hidden="true" />
            On
          </Badge>
        ) : (
          <Badge variant="outline">Off</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {setup ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              confirm.run({ code });
            }}
          >
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <img
                src={setup.qrCode}
                alt="QR code for your authenticator app"
                width={160}
                height={160}
                className="rounded-md bg-white"
              />
              <div className="min-w-0 space-y-2 text-sm text-muted-foreground">
                <p>Scan this with your authenticator app, or enter the key by hand.</p>
                <code className="block break-all rounded-md border bg-muted/50 p-2 text-xs select-all">
                  {setup.secret}
                </code>
              </div>
            </div>
            <Field id="two-factor-code" label="Code from your app">
              <Input
                id="two-factor-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSetup(null);
                  setCode('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={confirm.pending || code.length !== 6}>
                Turn on
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (enabled) disable.run({ password });
              else start.run({ password });
            }}
          >
            <Field id="two-factor-password" label="Confirm your password">
              <Input
                id="two-factor-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              {enabled && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={regenerate.pending || !password}
                  onClick={() => regenerate.run({ password })}
                >
                  New backup codes
                </Button>
              )}
              <Button
                type="submit"
                variant={enabled ? 'destructive' : 'default'}
                disabled={start.pending || disable.pending || !password}
              >
                {enabled ? 'Turn off' : 'Set up'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <BackupCodesDialog codes={backupCodes} onClose={() => setBackupCodes(null)} />
    </Card>
  );
}
