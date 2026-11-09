import type { Metadata } from 'next';
import { PageHeading } from '@/components/site/page-heading';
import { PrivacyControls } from '@/components/site/privacy-controls';
import { MarkdownPreview } from '@/features/content/markdown';
import { getCopy } from '@/features/copy/queries';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy['privacy.metaTitle'], description: copy['privacy.metaDescription'] };
}

export default async function PrivacyPage() {
  const copy = await getCopy();

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6">
      <PageHeading title={copy['privacy.heading']} />
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
    </div>
  );
}
