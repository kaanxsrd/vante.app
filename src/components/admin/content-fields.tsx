'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImageAction } from '@/features/media/actions';
import { cn } from '@/lib/utils';

export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-critical-foreground">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function TagInput({
  id,
  value,
  onChange,
  placeholder = 'Type and press Enter',
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const tag = draft.trim().replace(/,$/, '');
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="rounded-md border border-input p-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="flex flex-wrap gap-1">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="opacity-60 hover:opacity-100"
              onClick={() => onChange(value.filter((item) => item !== tag))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

export function useImageUpload(onUploaded: (url: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();

  function upload(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    startUpload(async () => {
      const result = await uploadImageAction(formData);
      if (result.ok) onUploaded(result.data.url);
      else toast.error(result.error);
    });
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) upload(file);
        event.target.value = '';
      }}
    />
  );

  return { input, uploading, openPicker: () => inputRef.current?.click() };
}

export function ImageField({
  id,
  value,
  onChange,
  className,
  preview = true,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  preview?: boolean;
}) {
  const { input, uploading, openPicker } = useImageUpload(onChange);

  return (
    <div className={cn('space-y-2', className)}>
      {value && preview && (
        <div className="relative aspect-video overflow-hidden rounded-md border bg-muted">
          <img src={value} alt="" className="size-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-1.5 right-1.5 size-7"
            aria-label="Remove image"
            onClick={() => onChange('')}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder="/media/… or https://…"
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={openPicker} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          Upload
        </Button>
      </div>
      {input}
    </div>
  );
}

export function GalleryField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { input, uploading, openPicker } = useImageUpload((url) => onChange([...value, url]));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {value.map((image) => (
            <div
              key={image}
              className="relative aspect-video overflow-hidden rounded-md border bg-muted"
            >
              <img src={image} alt="" className="size-full object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1 right-1 size-6"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((item) => item !== image))}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={openPicker}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        Add image
      </Button>
      {input}
    </div>
  );
}
