'use client';

import { ExternalLink, Eye, EyeOff, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AdminLink } from '@/components/admin/admin-path';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deletePostAction, setPostStatusAction } from '@/features/blog/actions';

interface PostRowActionsProps {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
}

export function PostRowActions({ id, slug, title, status }: PostRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const setStatus = useAction(setPostStatusAction, {
    success: (result) => (result.status === 'published' ? 'Post published' : 'Post unpublished'),
  });
  const remove = useAction(deletePostAction, { success: 'Post deleted' });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${title}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <AdminLink href={`/blog/${id}`}>
              <Pencil />
              Edit
            </AdminLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <AdminLink href={`/blog/${id}/preview`}>
              <Search />
              Preview
            </AdminLink>
          </DropdownMenuItem>
          {status === 'published' && (
            <DropdownMenuItem asChild>
              <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                View live
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={setStatus.pending}
            onSelect={() =>
              setStatus.run({ id, status: status === 'published' ? 'draft' : 'published' })
            }
          >
            {status === 'published' ? <EyeOff /> : <Eye />}
            {status === 'published' ? 'Unpublish' : 'Publish'}
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => setConfirming(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this post?"
        description={`"${title}" will be permanently removed from the site. This cannot be undone.`}
        confirmLabel="Delete post"
        destructive
        onConfirm={() => remove.run({ id })}
      />
    </>
  );
}
