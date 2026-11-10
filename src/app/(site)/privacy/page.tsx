import type { Metadata } from 'next';
import { PageHeading } from '@/components/site/page-heading';
import { PrivacyControls } from '@/components/site/privacy-controls';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownPreview } from '@/features/content/markdown';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy['privacy.metaTitle'], description: copy['privacy.metaDescription'] };
}

export default async function PrivacyPage() {
  const copy = await getCopy();
  const pending = isCopyGroupBlank(copy, 'privacy');

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6">
      <PageHeading title={copy['privacy.heading']} pending={pending} />
      {pending ? (
        <div aria-hidden="true" className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-6 h-8 w-28" />
        </div>
      ) : (
        <>
          <div className="prose dark:prose-invert max-w-none text-sm">
            <MarkdownPreview content={copy['privacy.content']} />
          </div>
          <PrivacyControls
            labels={{
              optOut: copy['privacy.optOut'],
              allow: copy['privacy.allow'],
              statusOut: copy['privacy.statusOut'],
              statusIn: copy['privacy.statusIn'],
            }}
          />
        </>
      )}
    </div>
  );
}
