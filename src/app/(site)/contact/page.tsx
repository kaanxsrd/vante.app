import type { Metadata } from 'next';
import { CopyText } from '@/components/site/copy-text';
import { pinFrom } from '@/features/copy/pin';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';
import worldMap from '../../../../scripts/seed-data/world.svg';
import { ContactForm } from './contact-form';
import { ContactFormSkeleton } from './contact-form-skeleton';
import { ContactMap } from './contact-map';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy['contact.metaTitle'], description: copy['contact.metaDescription'] };
}

export default async function ContactPage() {
  const copy = await getCopy();
  const pending = isCopyGroupBlank(copy, 'contact');
  const mapImage = copy['contact.mapImage'];

  return (
    <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-16 gap-y-10 px-6 pt-16 pb-28 lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:content-center lg:py-24">
      <header className="min-w-0 lg:col-start-1">
        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text font-display text-4xl text-transparent sm:text-5xl lg:text-6xl">
          <CopyText text={copy['contact.heading']} pending={pending} className="w-64 max-w-full" />
        </h1>
        <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">
          <CopyText
            text={copy['contact.description']}
            pending={pending}
            className="w-96 max-w-full"
          />
        </p>
      </header>

      <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        {pending ? <ContactFormSkeleton /> : <ContactForm copy={copy} />}
      </div>

      <ContactMap
        className="min-w-0 max-w-xl lg:col-start-1"
        src={mapImage || worldMap.src}
        pin={mapImage ? pinFrom(copy['contact.pinPosition']) : null}
        label={copy['contact.pinLabel']}
      />
    </main>
  );
}
