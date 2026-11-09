'use client';

import { Globe, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/admin/empty-state';
import { useAction } from '@/components/admin/use-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteIpRuleAction, saveIpRuleAction } from '@/features/security/actions';
import { formatDate } from '@/lib/format';

interface IpRule {
  id: string;
  ip: string;
  action: 'watch' | 'block';
  reason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export function IpRulesPanel({ rules }: { rules: IpRule[] }) {
  const [ip, setIp] = useState('');
  const [action, setAction] = useState<'watch' | 'block'>('block');
  const [reason, setReason] = useState('');

  const save = useAction(saveIpRuleAction, {
    success: 'IP rule saved',
    onSuccess: () => {
      setIp('');
      setReason('');
    },
  });
  const remove = useAction(deleteIpRuleAction, { success: 'IP rule removed' });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add an IP rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              save.run({ ip, action, reason, expiresAt: null });
            }}
          >
            <Input
              aria-label="IP address"
              placeholder="203.0.113.10"
              className="font-mono sm:w-56"
              value={ip}
              onChange={(event) => setIp(event.target.value)}
            />
            <Select value={action} onValueChange={(value) => setAction(value as 'watch' | 'block')}>
              <SelectTrigger aria-label="Action" className="sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="watch">Watch</SelectItem>
              </SelectContent>
            </Select>
            <Input
              aria-label="Reason"
              placeholder="Reason"
              className="flex-1"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button type="submit" disabled={save.pending || !ip}>
              Add rule
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        {rules.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No IP rules"
            description="Block an address to refuse its API requests and sign-ins, or watch it to raise an incident when it appears."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP address</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-xs">{rule.ip}</TableCell>
                  <TableCell>
                    <Badge variant={rule.action === 'block' ? 'critical' : 'warning'}>
                      {rule.action === 'block' ? 'Blocked' : 'Watching'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{rule.reason ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(rule.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Remove rule for ${rule.ip}`}
                      disabled={remove.pending}
                      onClick={() => remove.run({ id: rule.id })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
