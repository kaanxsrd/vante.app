import { ImageResponse } from 'next/og';
import { getAuthorBySlug } from '@/features/authors/queries';
import { getPublishedPost } from '@/features/blog/queries';
import { imageDataUrl, loadOgFonts } from '@/features/content/og-assets';
import { getSiteProfile } from '@/features/profile/queries';
import { formatDate } from '@/lib/format';

export const alt = 'Blog Post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return new Response('Blog post not found', { status: 404 });

  const [author, profile, fonts] = await Promise.all([
    post.author ? getAuthorBySlug(post.author) : null,
    getSiteProfile(),
    loadOgFonts(),
  ]);
  const [logo, avatar] = await Promise.all([
    imageDataUrl(profile.logo),
    imageDataUrl(author?.avatar),
  ]);

  const meta = { fontSize: '19px', fontWeight: 500, lineHeight: 1.4, padding: '4px 0px' };

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: '40px',
        fontFamily: 'Clash Display',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          border: '4px solid black',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {logo && (
            <img src={logo} alt="" width={80} height={80} style={{ marginBottom: '20px' }} />
          )}
          <h1
            style={{
              fontSize: '40px',
              fontWeight: 700,
              color: 'black',
              lineHeight: 1.2,
              marginBottom: '10px',
            }}
          >
            {post.title}
          </h1>
          {post.description && (
            <p style={{ fontSize: '25px', fontWeight: 500, color: '#4A4A4A', lineHeight: 1.5 }}>
              {post.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', alignItems: 'center' }}>
          {author && (
            <div style={{ ...meta, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {avatar && (
                <img
                  src={avatar}
                  alt=""
                  width={32}
                  height={32}
                  style={{ borderRadius: '50%', border: '2px solid black' }}
                />
              )}
              <span>{author.name}</span>
            </div>
          )}
          {author && post.publishedAt && <span style={{ fontSize: '19px' }}>•</span>}
          {post.publishedAt && <p style={meta}>{formatDate(post.publishedAt)}</p>}
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
