'use client';

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
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
import {
  deleteProjectAction,
  moveProjectAction,
  setProjectStatusAction,
} from '@/features/projects/actions';

export function ProjectMoveButtons({
  id,
  title,
  isFirst,
  isLast,
}: {
  id: string;
  title: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const move = useAction(moveProjectAction);
  return (
    <div className="flex gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Move ${title} up`}
        disabled={isFirst || move.pending}
        onClick={() => move.run({ id, direction: 'up' })}
      >
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Move ${title} down`}
        disabled={isLast || move.pending}
        onClick={() => move.run({ id, direction: 'down' })}
      >
        <ArrowDown className="size-3.5" />
      </Button>
    </div>
  );
}

interface ProjectRowActionsProps {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
}

export function ProjectRowActions({ id, slug, title, status }: ProjectRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const setStatus = useAction(setProjectStatusAction, {
    success: (result) =>
      result.status === 'published' ? 'Project published' : 'Project unpublished',
  });
  const remove = useAction(deleteProjectAction, { success: 'Project deleted' });

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
            <AdminLink href={`/projects/${id}`}>
              <Pencil />
              Edit
            </AdminLink>
          </DropdownMenuItem>
          {status === 'published' && (
            <DropdownMenuItem asChild>
              <a href={`/projects/${slug}`} target="_blank" rel="noopener noreferrer">
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
        title="Delete this project?"
        description={`"${title}" will be permanently removed from the site. This cannot be undone.`}
        confirmLabel="Delete project"
        destructive
        onConfirm={() => remove.run({ id })}
      />
    </>
  );
}
