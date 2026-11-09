'use client';

import { ArrowLeft, Loader2, Plus, Save, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AdminLink, useAdminPath } from '@/components/admin/admin-path';
import {
  Field,
  FormCard,
  GalleryField,
  ImageField,
  TagInput,
} from '@/components/admin/content-fields';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ContentStatus } from '@/features/blog/schema';
import { createProjectAction, updateProjectAction } from '@/features/projects/actions';
import { slugify } from '@/lib/slug';
import type { FieldErrors } from '@/lib/validation';

export interface ProjectFormValues {
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
  thumbnail: string;
  gallery: string[];
  frontend: string[];
  backend: string[];
  tags: string[];
  githubUrl: string;
  liveUrl: string;
  links: { name: string; href: string }[];
  featured: boolean;
  status: ContentStatus;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
}

export function ProjectEditor({ id, initial }: { id?: string; initial: ProjectFormValues }) {
  const router = useRouter();
  const projectsPath = useAdminPath('/projects');
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const slugTouched = useRef(Boolean(initial.slug));

  const set = useCallback(
    <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => {
      setDirty(true);
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  function save(status: ContentStatus) {
    const input = { ...values, status };
    startSaving(async () => {
      const result = id
        ? await updateProjectAction({ id, input })
        : await createProjectAction(input);
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
      else router.replace(`${projectsPath}/${result.data.id}`);
    });
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function updateLink(index: number, key: 'name' | 'href', value: string) {
    set(
      'links',
      values.links.map((link, position) => (position === index ? { ...link, [key]: value } : link)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to projects">
            <AdminLink href="/projects">
              <ArrowLeft />
            </AdminLink>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {values.title || 'New project'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {values.status === 'published' ? 'Published' : 'Draft'}
              {dirty && ' · Unsaved changes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <FormCard title="Details">
            <Field
              id="slug"
              label="Slug"
              error={errors.slug?.[0]}
              hint={`/projects/${values.slug || 'your-project'}`}
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
            <Field id="category" label="Category" error={errors.category?.[0]}>
              <Input
                id="category"
                value={values.category}
                aria-invalid={Boolean(errors.category)}
                placeholder="Web Application"
                onChange={(event) => set('category', event.target.value)}
              />
            </Field>
            <div className="flex items-center justify-between">
              <label htmlFor="featured" className="text-sm font-medium">
                Featured on the home page
              </label>
              <Switch
                id="featured"
                checked={values.featured}
                onCheckedChange={(checked) => set('featured', checked)}
              />
            </div>
          </FormCard>

          <FormCard title="Links">
            <Field id="liveUrl" label="Live demo" error={errors.liveUrl?.[0]}>
              <Input
                id="liveUrl"
                type="url"
                placeholder="https://"
                value={values.liveUrl}
                onChange={(event) => set('liveUrl', event.target.value)}
              />
            </Field>
            <Field id="githubUrl" label="GitHub repository" error={errors.githubUrl?.[0]}>
              <Input
                id="githubUrl"
                type="url"
                placeholder="https://github.com/…"
                value={values.githubUrl}
                onChange={(event) => set('githubUrl', event.target.value)}
              />
            </Field>
            <div className="space-y-2">
              {values.links.map((link, index) => (
                <div key={index} className="flex gap-1.5">
                  <Input
                    aria-label="Link name"
                    placeholder="Docs"
                    className="w-24"
                    value={link.name}
                    onChange={(event) => updateLink(index, 'name', event.target.value)}
                  />
                  <Input
                    aria-label="Link URL"
                    placeholder="https://"
                    value={link.href}
                    onChange={(event) => updateLink(index, 'href', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    onClick={() =>
                      set(
                        'links',
                        values.links.filter((_, position) => position !== index),
                      )
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('links', [...values.links, { name: '', href: '' }])}
              >
                <Plus />
                Add link
              </Button>
            </div>
          </FormCard>

          <FormCard title="Technology">
            <Field id="frontend" label="Frontend">
              <TagInput
                id="frontend"
                value={values.frontend}
                onChange={(next) => set('frontend', next)}
              />
            </Field>
            <Field id="backend" label="Backend">
              <TagInput
                id="backend"
                value={values.backend}
                onChange={(next) => set('backend', next)}
              />
            </Field>
            <Field id="tags" label="Tags">
              <TagInput id="tags" value={values.tags} onChange={(next) => set('tags', next)} />
            </Field>
          </FormCard>

          <FormCard title="Media">
            <Field id="thumbnail" label="Thumbnail" error={errors.thumbnail?.[0]}>
              <ImageField
                id="thumbnail"
                value={values.thumbnail}
                onChange={(thumbnail) => set('thumbnail', thumbnail)}
              />
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Gallery</p>
              <GalleryField
                value={values.gallery}
                onChange={(gallery) => set('gallery', gallery)}
              />
            </div>
          </FormCard>

          <FormCard title="SEO">
            <Field id="seoTitle" label="SEO title" hint="Defaults to the project title.">
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
