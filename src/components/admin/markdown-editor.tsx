'use client';

import { DocsBody } from 'fumadocs-ui/page';
import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  type LucideIcon,
  Quote,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useImageUpload } from '@/components/admin/content-fields';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderMarkdownPreviewAction } from '@/features/blog/actions';
import { cn } from '@/lib/utils';

type Mode = 'write' | 'split' | 'preview';

interface Wrap {
  before: string;
  after?: string;
  placeholder: string;
  linePrefix?: boolean;
}

const TOOLBAR: { label: string; icon: LucideIcon; wrap: Wrap }[] = [
  { label: 'Bold', icon: Bold, wrap: { before: '**', after: '**', placeholder: 'bold text' } },
  { label: 'Italic', icon: Italic, wrap: { before: '_', after: '_', placeholder: 'italic text' } },
  {
    label: 'Heading',
    icon: Heading2,
    wrap: { before: '## ', placeholder: 'Heading', linePrefix: true },
  },
  {
    label: 'Link',
    icon: Link2,
    wrap: { before: '[', after: '](https://)', placeholder: 'link text' },
  },
  { label: 'Code', icon: Code, wrap: { before: '`', after: '`', placeholder: 'code' } },
  { label: 'Quote', icon: Quote, wrap: { before: '> ', placeholder: 'Quote', linePrefix: true } },
  { label: 'List', icon: List, wrap: { before: '- ', placeholder: 'List item', linePrefix: true } },
];

const PREVIEW_DEBOUNCE_MS = 400;

export function MarkdownEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<Mode>('split');
  const [preview, setPreview] = useState<ReactNode>(null);
  const [rendering, startRender] = useTransition();

  const insert = useCallback(
    (wrap: Wrap) => {
      const element = textarea.current;
      const start = element?.selectionStart ?? value.length;
      const end = element?.selectionEnd ?? value.length;
      const selected = value.slice(start, end) || wrap.placeholder;
      const atLineStart = start === 0 || value[start - 1] === '\n';
      const lead = wrap.linePrefix && !atLineStart ? '\n' : '';
      const replacement = `${lead}${wrap.before}${selected}${wrap.after ?? ''}`;
      onChange(value.slice(0, start) + replacement + value.slice(end));

      requestAnimationFrame(() => {
        element?.focus();
        const selectionStart = start + lead.length + wrap.before.length;
        element?.setSelectionRange(selectionStart, selectionStart + selected.length);
      });
    },
    [onChange, value],
  );

  const { input, uploading, openPicker } = useImageUpload((url) =>
    insert({ before: '![', after: `](${url})`, placeholder: 'Describe the image' }),
  );

  useEffect(() => {
    if (mode === 'write') return;
    const timer = window.setTimeout(() => {
      startRender(async () => {
        const result = await renderMarkdownPreviewAction({ content: value });
        if (result.ok) setPreview(result.data);
        else toast.error(result.error);
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [mode, value]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-xs',
        invalid && 'border-destructive',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <div className="flex flex-wrap items-center gap-0.5">
          {TOOLBAR.map((tool) => (
            <Button
              key={tool.label}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={tool.label}
              title={tool.label}
              disabled={mode === 'preview'}
              onClick={() => insert(tool.wrap)}
            >
              <tool.icon className="size-4" />
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Upload image"
            title="Upload image"
            disabled={uploading || mode === 'preview'}
            onClick={openPicker}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </Button>
          {input}
        </div>
        <Tabs value={mode} onValueChange={(next) => setMode(next as Mode)}>
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="split" className="hidden lg:inline-flex">
              Split
            </TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={cn('grid', mode === 'split' && 'lg:grid-cols-2 lg:divide-x')}>
        {mode !== 'preview' && (
          <textarea
            ref={textarea}
            aria-label="Content in Markdown"
            value={value}
            spellCheck
            placeholder="Write in Markdown…"
            onChange={(event) => onChange(event.target.value)}
            className="h-[560px] w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
        )}
        {mode !== 'write' && (
          <div className="relative h-[560px] overflow-y-auto p-4" aria-live="off">
            {rendering && (
              <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" />
            )}
            <div className="prose max-w-none dark:prose-invert">
              <DocsBody>{preview}</DocsBody>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
