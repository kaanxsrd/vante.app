'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createApiKeyAction } from '@/features/api-keys/actions';
import { DEFAULT_POLICY, KeyForm, type KeyPolicyValues } from './key-form';
import { KeyRevealDialog, type RevealedKey } from './key-reveal';

export function KeyDialogs() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<KeyPolicyValues>(DEFAULT_POLICY);
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);

  const create = useAction(createApiKeyAction, {
    onSuccess: (result) => {
      setOpen(false);
      setValues(DEFAULT_POLICY);
      setRevealed({ name: result.name, key: result.key });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Create key
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Grant only the permissions this client needs.</DialogDescription>
          </DialogHeader>
          <KeyForm values={values} onChange={setValues} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={create.pending} onClick={() => create.run(values)}>
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <KeyRevealDialog revealed={revealed} onClose={() => setRevealed(null)} />
    </>
  );
}
