'use client';

import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { Field, ImageField } from '@/components/admin/content-fields';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createAuthorAction,
  deleteAuthorAction,
  updateAuthorAction,
} from '@/features/authors/actions';
import { slugify } from '@/lib/slug';

interface AuthorRow {
  id: string;
  slug: string;
  name: string;
  position: string;
  avatar: string | null;
  posts: number;
}

const EMPTY = { name: '', slug: '', position: '', avatar: '' };

export function AuthorsManager({ authors }: { authors: AuthorRow[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [removing, setRemoving] = useState<AuthorRow | null>(null);
  const slugTouched = useRef(false);

  const close = () => setEditing(null);
  const create = useAction(createAuthorAction, { success: 'Author added', onSuccess: close });
  const update = useAction(updateAuthorAction, { success: 'Author updated', onSuccess: close });
  const remove = useAction(deleteAuthorAction, { success: 'Author deleted' });

  function open(author: AuthorRow | null) {
    slugTouched.current = Boolean(author);
    setValues(
      author
        ? {
            name: author.name,
            slug: author.slug,
            position: author.position,
            avatar: author.avatar ?? '',
          }
        : EMPTY,
    );
    setEditing(author ? author.id : 'new');
  }

  function submit() {
    if (editing === 'new') create.run(values);
    else if (editing) update.run({ id: editing, input: values });
  }

  return (
    <>
      <PageHeader
        title="Authors"
        description="The people shown on your blog posts."
        actions={
          <Button onClick={() => open(null)}>
            <Plus />
            Add author
          </Button>
        }
      />

      <Card>
        {authors.length === 0 ? (
          <EmptyState icon={UserRound} title="No authors yet" description="Add the first one." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Posts</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.map((author) => (
                <TableRow key={author.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {author.avatar ? (
                        <img
                          src={author.avatar}
                          alt=""
                          className="size-8 rounded-full border object-cover"
                        />
                      ) : (
                        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                          {author.name.charAt(0)}
                        </span>
                      )}
                      <div>
                        <p className="font-medium">{author.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{author.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{author.position || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{author.posts}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Edit ${author.name}`}
                        onClick={() => open(author)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Delete ${author.name}`}
                        onClick={() => setRemoving(author)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={editing !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Add author' : 'Edit author'}</DialogTitle>
            <DialogDescription>Shown beside the posts they wrote.</DialogDescription>
          </DialogHeader>
          <Field id="author-name" label="Name">
            <Input
              id="author-name"
              value={values.name}
              onChange={(event) => {
                const name = event.target.value;
                setValues((current) => ({
                  ...current,
                  name,
                  slug: slugTouched.current ? current.slug : slugify(name),
                }));
              }}
            />
          </Field>
          <Field id="author-slug" label="Slug">
            <Input
              id="author-slug"
              className="font-mono text-xs"
              value={values.slug}
              onChange={(event) => {
                slugTouched.current = true;
                setValues((current) => ({ ...current, slug: event.target.value }));
              }}
            />
          </Field>
          <Field id="author-position" label="Position">
            <Input
              id="author-position"
              value={values.position}
              onChange={(event) =>
                setValues((current) => ({ ...current, position: event.target.value }))
              }
            />
          </Field>
          <Field id="author-avatar" label="Photo">
            <ImageField
              id="author-avatar"
              value={values.avatar}
              onChange={(avatar) => setValues((current) => ({ ...current, avatar }))}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={create.pending || update.pending} onClick={submit}>
              Save author
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAction
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Delete ${removing?.name ?? 'this author'}?`}
        description="Their posts stay published but will no longer show an author."
        confirmLabel="Delete author"
        destructive
        onConfirm={() => removing && remove.run({ id: removing.id })}
      />
    </>
  );
}
