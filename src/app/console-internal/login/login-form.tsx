'use client';

import { Loader2 } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type LoginState, loginAction } from '@/features/auth/login';

const INITIAL: LoginState = { error: null, email: '', step: 'credentials' };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, INITIAL);

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        {state.step === 'two-factor' ? (
          <div className="space-y-2">
            <input type="hidden" name="step" value="two-factor" />
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              name="code"
              autoComplete="one-time-code"
              maxLength={32}
              required
              key="code"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app, or one of your backup codes.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                defaultValue={state.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          </>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-critical-foreground">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {state.step === 'two-factor' ? 'Verify' : 'Sign in'}
        </Button>
      </form>
    </Card>
  );
}
