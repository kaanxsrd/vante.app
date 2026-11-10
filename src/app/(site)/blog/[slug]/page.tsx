import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CopyText } from '@/components/site/copy-text';
import { PostArticle } from '@/components/site/post-article';
import { ReadMoreSection } from '@/components/site/read-more-section';
import { getAuthorBySlug } from '@/features/authors/queries';
import { getPublishedPost, getPublishedPosts, getRelatedPosts } from '@/features/blog/queries';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';
import { getSiteProfile } from '@/features/profile/queries';
import { siteUrl } from '@/lib/env';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, profile, copy] = await Promise.all([
    getPublishedPost(slug),
    getSiteProfile(),
    getCopy(),
  ]);
  if (!post) return { title: copy['notFound.heading'] };

  const site = siteUrl();
  const url = `${site}/blog/${slug}`;
  const author = post.author ? await getAuthorBySlug(post.author) : null;
  const authorName = author?.name ?? profile.name;
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.description;
  const image = post.ogImage ?? post.thumbnail;

  return {
    title,
    description,
    keywords: [post.title, ...post.tags],
    authors: [{ name: authorName, url: site }],
    creator: authorName,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [authorName],
      tags: post.tags,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: post.title }] } : {}),
      siteName: profile.siteName || profile.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogPost({ params }: PageProps) {
  const { slug } = await params;
  const [post, copy] = await Promise.all([getPublishedPost(slug), getCopy()]);
  if (!post) notFound();

  const related = await getRelatedPosts(post);
  return (
    <PostArticle
      post={post}
      footer={
        <ReadMoreSection
          posts={related}
          heading={
            <CopyText
              text={copy['blog.readMore']}
              pending={isCopyGroupBlank(copy, 'blog')}
              className="w-40"
            />
          }
        />
      }
    />
  );
}
