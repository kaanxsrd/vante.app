'use client';

import { useState } from 'react';
import { Field } from '@/components/admin/content-fields';
import { useAction } from '@/components/admin/use-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { saveRuleAction } from '@/features/security/actions';
import { CLASSIFICATION_SHORT_LABELS } from '@/features/security/labels';
import { RULES, type RuleConfig } from '@/features/security/rules';
import { SEVERITIES, type Severity } from '@/features/settings/schema';

function RuleCard({ initial }: { initial: RuleConfig }) {
  const [rule, setRule] = useState(initial);
  const definition = RULES[rule.ruleId];
  const save = useAction(saveRuleAction, { success: `Saved: ${definition.label}` });
  const set = <K extends keyof RuleConfig>(key: K, value: RuleConfig[K]) =>
    setRule((current) => ({ ...current, [key]: value }));
  const idFor = (name: string) => `${rule.ruleId}-${name}`;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{definition.label}</CardTitle>
            <Badge variant="outline">
              {CLASSIFICATION_SHORT_LABELS[definition.classification]}
            </Badge>
          </div>
          <CardDescription className="max-w-2xl">{definition.description}</CardDescription>
        </div>
        <Switch
          aria-label={`Enable ${definition.label}`}
          checked={rule.enabled}
          onCheckedChange={(checked) => set('enabled', checked)}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field id={idFor('severity')} label="Severity">
            <Select
              value={rule.severity}
              onValueChange={(value) => set('severity', value as Severity)}
            >
              <SelectTrigger id={idFor('severity')} className="capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity} className="capitalize">
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={idFor('threshold')} label={definition.thresholdLabel}>
            <Input
              id={idFor('threshold')}
              type="number"
              min={1}
              value={rule.threshold}
              onChange={(event) => set('threshold', Number(event.target.value))}
            />
          </Field>
          <Field id={idFor('window')} label="Window (seconds)">
            <Input
              id={idFor('window')}
              type="number"
              min={10}
              value={rule.windowSeconds}
              onChange={(event) => set('windowSeconds', Number(event.target.value))}
            />
          </Field>
          <Field
            id={idFor('cooldown')}
            label="Cooldown (seconds)"
            hint="Repeats inside this merge into one incident."
          >
            <Input
              id={idFor('cooldown')}
              type="number"
              min={0}
              value={rule.cooldownSeconds}
              onChange={(event) => set('cooldownSeconds', Number(event.target.value))}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id={idFor('notify')}
                checked={rule.notify}
                onCheckedChange={(checked) => set('notify', checked)}
              />
              <Label htmlFor={idFor('notify')} className="font-normal">
                Email me
              </Label>
            </div>
            {definition.canAutoSuspend ? (
              <div className="flex flex-wrap items-center gap-2">
                <Switch
                  id={idFor('suspend')}
                  checked={rule.autoSuspend}
                  onCheckedChange={(checked) => set('autoSuspend', checked)}
                />
                <Label htmlFor={idFor('suspend')} className="font-normal">
                  Suspend the key automatically for
                </Label>
                <Input
                  aria-label="Suspension minutes"
                  type="number"
                  min={1}
                  className="h-8 w-20"
                  disabled={!rule.autoSuspend}
                  value={rule.suspendMinutes}
                  onChange={(event) => set('suspendMinutes', Number(event.target.value))}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Never suspends automatically: this signal is not strong enough on its own.
              </p>
            )}
          </div>
          <Button size="sm" disabled={save.pending} onClick={() => save.run(rule)}>
            Save rule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RulesPanel({ rules }: { rules: RuleConfig[] }) {
  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <RuleCard key={rule.ruleId} initial={rule} />
      ))}
    </div>
  );
}
