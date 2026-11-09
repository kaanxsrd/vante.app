'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/validation';

interface Options<Result> {
  success?: string | ((result: Result) => string);
  onSuccess?: (result: Result) => void;
  refresh?: boolean;
}

export function useAction<Input, Result>(
  action: (input: Input) => Promise<ActionResult<Result>>,
  { success, onSuccess, refresh = true }: Options<Result> = {},
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (input: Input) => {
      startTransition(async () => {
        try {
          const result = await action(input);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          if (success)
            toast.success(typeof success === 'function' ? success(result.data) : success);
          onSuccess?.(result.data);
          if (refresh) router.refresh();
        } catch {
          toast.error('The request failed. Check your connection and try again.');
        }
      });
    },
    [action, success, onSuccess, refresh, router],
  );

  return { run, pending };
}
