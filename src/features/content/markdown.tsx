import 'server-only';
import { createMarkdownRenderer } from 'fumadocs-core/content/md';
import { rehypeCode, remarkGfm, remarkHeading } from 'fumadocs-core/mdx-plugins';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CopyHeader } from '@/components/site/copy-header';

const sanitizeSchema = {
  ...defaultSchema,
  clobber: [],
};

const { MarkdownServer } = createMarkdownRenderer({
  remarkPlugins: [remarkGfm, [remarkHeading, { generateToc: false }]],
  rehypePlugins: [
    [rehypeSanitize, sanitizeSchema],
    [rehypeCode, { lazy: true, fallbackLanguage: 'text' }],
  ],
});

function MarkdownLink({ href = '', children, ...props }: ComponentProps<'a'>) {
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function MarkdownImage({ src, alt = '', ...props }: ComponentProps<'img'>) {
  if (typeof src !== 'string') return null;
  return <img src={src} alt={alt} loading="lazy" className="rounded-lg" {...props} />;
}

function MarkdownTable(props: ComponentProps<'table'>) {
  return (
    <div className="prose-no-margin relative my-6 overflow-auto">
      <table {...props} />
    </div>
  );
}

function MarkdownPre(props: ComponentProps<'pre'>) {
  return (
    <CodeBlock {...props}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}

const H1 = (props: ComponentProps<'h1'>) => <CopyHeader level={1} {...props} />;
const H2 = (props: ComponentProps<'h2'>) => <CopyHeader level={2} {...props} />;
const H3 = (props: ComponentProps<'h3'>) => <CopyHeader level={3} {...props} />;
const H4 = (props: ComponentProps<'h4'>) => <CopyHeader level={4} {...props} />;
const H5 = (props: ComponentProps<'h5'>) => <CopyHeader level={5} {...props} />;
const H6 = (props: ComponentProps<'h6'>) => <CopyHeader level={6} {...props} />;

const components = {
  a: MarkdownLink,
  img: MarkdownImage,
  table: MarkdownTable,
  pre: MarkdownPre,
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
};

const previewComponents = { img: MarkdownImage, table: MarkdownTable };

export function MarkdownPreview({ content }: { content: string }) {
  return <MarkdownServer components={previewComponents}>{content}</MarkdownServer>;
}

export function Markdown({ content }: { content: string }) {
  return <MarkdownServer components={components}>{content}</MarkdownServer>;
}
