'use client';

import { ArrowLeft, Eye, Loader2, Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AdminLink, useAdminPath } from '@/components/admin/admin-path';
import { Field, FormCard, ImageField, TagInput } from '@/components/admin/content-fields';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createPostAction, updatePostAction } from '@/features/blog/actions';
import type { ContentStatus } from '@/features/blog/schema';
import { slugify } from '@/lib/slug';
import type { FieldErrors } from '@/lib/validation';

const NO_AUTHOR = '__none__';

export interface PostFormValues {
  title: string;
  slug: string;
  description: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  thumbnail: string;
  featured: boolean;
  status: ContentStatus;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
}

export function PostEditor({
  id,
  initial,
  authors,
}: {
  id?: string;
  initial: PostFormValues;
  authors: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const blogPath = useAdminPath('/blog');
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const slugTouched = useRef(Boolean(initial.slug));

  const set = useCallback(<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) => {
    setDirty(true);
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const save = useCallback(
    (status: ContentStatus) => {
      const input = {
        ...values,
        status,
        publishedAt: values.publishedAt ? `${values.publishedAt}:00Z` : null,
      };
      startSaving(async () => {
        const result = id ? await updatePostAction({ id, input }) : await createPostAction(input);
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }
        setErrors({});
        setDirty(false);
        setValues((current) => ({ ...current, status }));
        toast.success(status === 'published' ? 'Published' : 'Draft saved');
        if (id) router.refresh();
        else router.replace(`${blogPath}/${result.data.id}`);
      });
    },
    [blogPath, id, router, values],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        save(values.status);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, values.status]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to posts">
            <AdminLink href="/blog">
              <ArrowLeft />
            </AdminLink>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {values.title || 'New post'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {values.status === 'published' ? 'Published' : 'Draft'}
              {dirty && ' · Unsaved changes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {id && (
            <Button asChild variant="outline">
              <AdminLink href={`/blog/${id}/preview`}>
                <Eye />
                Preview
              </AdminLink>
            </Button>
          )}
          <Button variant="outline" disabled={saving} onClick={() => save('draft')}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {values.status === 'published' ? 'Unpublish' : 'Save draft'}
          </Button>
          <Button disabled={saving} onClick={() => save('published')}>
            <Send />
            {values.status === 'published' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Field id="title" label="Title" error={errors.title?.[0]}>
            <Input
              id="title"
              value={values.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => {
                const title = event.target.value;
                set('title', title);
                if (!slugTouched.current) set('slug', slugify(title));
              }}
            />
          </Field>
          <Field id="description" label="Description" error={errors.description?.[0]}>
            <Textarea
              id="description"
              rows={2}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </Field>
          <MarkdownEditor
            value={values.content}
            onChange={(content) => set('content', content)}
            invalid={Boolean(errors.content)}
          />
        </div>

        <div className="space-y-4">
          <FormCard title="Publishing">
            <Field
              id="slug"
              label="Slug"
              error={errors.slug?.[0]}
              hint={`/blog/${values.slug || 'your-post'}`}
            >
              <Input
                id="slug"
                value={values.slug}
                aria-invalid={Boolean(errors.slug)}
                className="font-mono text-xs"
                onChange={(event) => {
                  slugTouched.current = true;
                  set('slug', event.target.value);
                }}
              />
            </Field>
            <Field
              id="publishedAt"
              label="Publication date (UTC)"
              error={errors.publishedAt?.[0]}
              hint="Leave empty to use the moment you publish. A future date schedules the post."
            >
              <Input
                id="publishedAt"
                type="datetime-local"
                value={values.publishedAt}
                onChange={(event) => set('publishedAt', event.target.value)}
              />
            </Field>
            <div className="flex items-center justify-between">
              <label htmlFor="featured" className="text-sm font-medium">
                Featured
              </label>
              <Switch
                id="featured"
                checked={values.featured}
                onCheckedChange={(checked) => set('featured', checked)}
              />
            </div>
          </FormCard>

          <FormCard title="Organization">
            <Field id="author" label="Author" error={errors.author?.[0]}>
              <Select
                value={values.author || NO_AUTHOR}
                onValueChange={(next) => set('author', next === NO_AUTHOR ? '' : next)}
              >
                <SelectTrigger id="author" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AUTHOR}>No author</SelectItem>
                  {authors.map((author) => (
                    <SelectItem key={author.slug} value={author.slug}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="category" label="Category" error={errors.category?.[0]}>
              <Input
                id="category"
                value={values.category}
                onChange={(event) => set('category', event.target.value)}
              />
            </Field>
            <Field id="tags" label="Tags">
              <TagInput id="tags" value={values.tags} onChange={(tags) => set('tags', tags)} />
            </Field>
          </FormCard>

          <FormCard title="Cover image">
            <ImageField
              id="thumbnail"
              value={values.thumbnail}
              onChange={(thumbnail) => set('thumbnail', thumbnail)}
            />
            {errors.thumbnail?.[0] && (
              <p role="alert" className="text-xs text-critical-foreground">
                {errors.thumbnail[0]}
              </p>
            )}
          </FormCard>

          <FormCard title="SEO">
            <Field id="seoTitle" label="SEO title" hint="Defaults to the post title.">
              <Input
                id="seoTitle"
                value={values.seoTitle}
                onChange={(event) => set('seoTitle', event.target.value)}
              />
            </Field>
            <Field id="seoDescription" label="SEO description" hint="Defaults to the description.">
              <Textarea
                id="seoDescription"
                rows={3}
                value={values.seoDescription}
                onChange={(event) => set('seoDescription', event.target.value)}
              />
            </Field>
            <Field id="ogImage" label="Social image">
              <ImageField
                id="ogImage"
                value={values.ogImage}
                onChange={(ogImage) => set('ogImage', ogImage)}
              />
            </Field>
          </FormCard>
        </div>
      </div>
    </div>
  );
}
