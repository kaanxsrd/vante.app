'use client';

import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="This page could not be loaded"
      description={
        error.digest
          ? `The server logged the details under reference ${error.digest}.`
          : 'Check the server logs and your database connection.'
      }
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
