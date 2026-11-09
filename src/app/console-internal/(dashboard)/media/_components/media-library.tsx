'use client';

import { Copy, ImageIcon, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { useImageUpload } from '@/components/admin/content-fields';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { deleteMediaAction } from '@/features/media/actions';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<MediaItem | null>(null);
  const remove = useAction(deleteMediaAction, { success: 'Image deleted' });
  const { input, uploading, openPicker } = useImageUpload(() => {
    toast.success('Image uploaded');
    router.refresh();
  });

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Image path copied');
    } catch {
      toast.error('Copy failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="Media"
        description="Every image the site uses. Images in use cannot be deleted."
        actions={
          <Button onClick={openPicker} disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            Upload image
          </Button>
        }
      />
      {input}

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={ImageIcon} title="No images yet" description="Upload the first one." />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="overflow-hidden">
                <div className="flex aspect-video items-center justify-center bg-muted">
                  <img
                    src={item.url}
                    alt={item.filename}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={item.filename}>
                      {item.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Copy path of ${item.filename}`}
                      onClick={() => void copyUrl(item.url)}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Delete ${item.filename}`}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmAction
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Delete ${removing?.filename ?? 'this image'}?`}
        description="This cannot be undone."
        confirmLabel="Delete image"
        destructive
        onConfirm={() => removing && remove.run({ id: removing.id })}
      />
    </>
  );
}
