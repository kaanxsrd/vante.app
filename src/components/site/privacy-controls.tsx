'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '@/lib/analytics-consent';

interface PrivacyControlsProps {
  labels: { optOut: string; allow: string; statusOut: string; statusIn: string };
}

export function PrivacyControls({ labels }: PrivacyControlsProps) {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);

  useEffect(() => {
    setOptedOut(isAnalyticsOptedOut());
  }, []);

  return (
    <div className="mt-4 flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={optedOut === null}
        onClick={() => {
          const next = !optedOut;
          setAnalyticsOptOut(next);
          setOptedOut(next);
        }}
      >
        {optedOut ? labels.allow : labels.optOut}
      </Button>
      <span role="status" className="text-xs text-muted-foreground">
        {optedOut === null ? '' : optedOut ? labels.statusOut : labels.statusIn}
      </span>
    </div>
  );
}
