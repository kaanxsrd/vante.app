'use client';

import { Ban, Copy, MoreHorizontal, Pause, Pencil, Play, RotateCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { Field } from '@/components/admin/content-fields';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  deleteApiKeyAction,
  reinstateApiKeyAction,
  revokeApiKeyAction,
  rotateApiKeyAction,
  suspendApiKeyAction,
  updateApiKeyAction,
} from '@/features/api-keys/actions';
import type { ApiScope } from '@/features/api-keys/scopes';
import type { ApiKeyState } from '@/features/api-keys/state';
import { KeyForm, type KeyPolicyValues } from './key-form';
import { KeyRevealDialog, type RevealedKey } from './key-reveal';

type ActiveDialog = 'edit' | 'rotate' | 'suspend' | 'revoke' | 'delete' | null;

interface KeyRowActionsProps {
  apiKey: Omit<KeyPolicyValues, 'scopes'> & {
    id: string;
    scopes: string[];
    state: ApiKeyState;
  };
}

const GRACE_OPTIONS = [
  { value: '0', label: 'None: old key stops immediately' },
  { value: '1', label: '1 hour' },
  { value: '24', label: '24 hours' },
  { value: '72', label: '3 days' },
];

export function KeyRowActions({ apiKey }: KeyRowActionsProps) {
  const { id, state, name } = apiKey;
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);
  const [policy, setPolicy] = useState<KeyPolicyValues>({
    ...apiKey,
    scopes: apiKey.scopes as ApiScope[],
  });
  const [grace, setGrace] = useState('24');
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');

  const close = () => setDialog(null);

  const update = useAction(updateApiKeyAction, { success: 'Key updated', onSuccess: close });
  const rotate = useAction(rotateApiKeyAction, {
    onSuccess: (result) => {
      close();
      setRevealed({ name: result.name, key: result.key });
    },
  });
  const revoke = useAction(revokeApiKeyAction, { success: 'Key revoked', onSuccess: close });
  const suspend = useAction(suspendApiKeyAction, { success: 'Key suspended', onSuccess: close });
  const reinstate = useAction(reinstateApiKeyAction, { success: 'Suspension lifted' });
  const remove = useAction(deleteApiKeyAction, { success: 'Key deleted', onSuccess: close });

  const usable = state !== 'revoked';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {usable && (
            <>
              <DropdownMenuItem onSelect={() => setDialog('edit')}>
                <Pencil />
                Edit policy
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog('rotate')}>
                <RotateCw />
                Rotate
              </DropdownMenuItem>
              {state === 'suspended' ? (
                <DropdownMenuItem onSelect={() => reinstate.run({ id })}>
                  <Play />
                  Lift suspension
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setDialog('suspend')}>
                  <Pause />
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDialog('revoke')}>
                <Ban />
                Revoke
              </DropdownMenuItem>
            </>
          )}
          {!usable && (
            <DropdownMenuItem destructive onSelect={() => setDialog('delete')}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard.writeText(id);
              toast.success('Key ID copied');
            }}
          >
            <Copy />
            Copy key ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === 'edit'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {name}</DialogTitle>
            <DialogDescription>Changes apply to the next request.</DialogDescription>
          </DialogHeader>
          <KeyForm values={policy} onChange={setPolicy} />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={update.pending} onClick={() => update.run({ ...policy, id })}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'rotate'} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate {name}</DialogTitle>
            <DialogDescription>
              A new secret replaces this one. If the key may be compromised, choose no grace period.
            </DialogDescription>
          </DialogHeader>
          <Field id="grace" label="Grace period for the old key">
            <Select value={grace} onValueChange={setGrace}>
              <SelectTrigger id="grace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRACE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={rotate.pending}
              onClick={() => rotate.run({ id, graceHours: Number(grace) })}
            >
              Rotate key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'suspend'} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {name}</DialogTitle>
            <DialogDescription>
              Requests are rejected until the suspension ends. Nothing about the key changes.
            </DialogDescription>
          </DialogHeader>
          <Field id="suspend-minutes" label="Minutes">
            <Input
              id="suspend-minutes"
              type="number"
              min={1}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </Field>
          <Field id="suspend-reason" label="Reason">
            <Input
              id="suspend-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={suspend.pending} onClick={() => suspend.run({ id, minutes, reason })}>
              Suspend key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAction
        open={dialog === 'revoke'}
        onOpenChange={(open) => !open && close()}
        title={`Revoke ${name}?`}
        description="Every request using this key fails immediately. This cannot be undone."
        confirmLabel="Revoke key"
        destructive
        onConfirm={() => revoke.run({ id, reason: '' })}
      />
      <ConfirmAction
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && close()}
        title={`Delete ${name}?`}
        description="The key record is removed. Its past requests stay in analytics without a name."
        confirmLabel="Delete key"
        destructive
        onConfirm={() => remove.run({ id })}
      />

      <KeyRevealDialog revealed={revealed} onClose={() => setRevealed(null)} />
    </>
  );
}
