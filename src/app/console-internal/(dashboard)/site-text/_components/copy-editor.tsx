'use client';

import { useEffect, useState } from 'react';
import { Field, ImageField } from '@/components/admin/content-fields';
import { MapPinPicker } from '@/components/admin/map-pin-picker';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { PageHeader } from '@/components/admin/page-header';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { saveCopyAction } from '@/features/copy/actions';
import { COPY_GROUPS, type CopyField, type CopyKey, type SiteCopy } from '@/features/copy/fields';
import { cn } from '@/lib/utils';

export function CopyEditor({ initial }: { initial: SiteCopy }) {
  const [values, setValues] = useState(initial);
  const [groupId, setGroupId] = useState<string>(COPY_GROUPS[0].id);
  const [dirty, setDirty] = useState(false);

  const save = useAction(saveCopyAction, {
    success: 'Text saved. The public site is updated.',
    onSuccess: () => setDirty(false),
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function set(key: CopyKey, value: string) {
    setDirty(true);
    setValues((current) => ({ ...current, [key]: value }));
  }

  const group = COPY_GROUPS.find((candidate) => candidate.id === groupId) ?? COPY_GROUPS[0];
  const fields: readonly CopyField[] = group.fields;

  return (
    <>
      <PageHeader
        title="Site Text"
        description="Every heading, label and message on the public pages."
        actions={
          <Button disabled={save.pending || !dirty} onClick={() => save.run(values)}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Page"
        className="inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground"
      >
        {COPY_GROUPS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={candidate.id === group.id}
            onClick={() => setGroupId(candidate.id)}
            className={cn(
              'inline-flex h-7 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
              candidate.id === group.id && 'bg-background text-foreground shadow-xs',
            )}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
          {fields.map((field) => {
            const key = field.key as CopyKey;
            const id = `copy-${key}`;
            const kind = field.kind ?? 'text';

            if (kind === 'markdown') {
              return (
                <div key={key} className="space-y-1.5 md:col-span-2">
                  <p className="text-sm font-medium">{field.label}</p>
                  <MarkdownEditor value={values[key]} onChange={(next) => set(key, next)} />
                </div>
              );
            }
            return (
              <div key={key} className={cn(kind !== 'text' && 'md:col-span-2')}>
                <Field id={id} label={field.label} hint={field.hint}>
                  {kind === 'position' ? (
                    <MapPinPicker
                      id={id}
                      mapUrl={values['contact.mapImage']}
                      value={values[key]}
                      onChange={(next) => set(key, next)}
                    />
                  ) : kind === 'image' ? (
                    <ImageField
                      id={id}
                      value={values[key]}
                      onChange={(next) => set(key, next)}
                      preview={false}
                    />
                  ) : kind === 'long' ? (
                    <Textarea
                      id={id}
                      rows={3}
                      value={values[key]}
                      onChange={(event) => set(key, event.target.value)}
                    />
                  ) : (
                    <Input
                      id={id}
                      value={values[key]}
                      onChange={(event) => set(key, event.target.value)}
                    />
                  )}
                </Field>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
