import { ImageResponse } from 'next/og';
import { imageDataUrl, loadOgFonts } from '@/features/content/og-assets';
import { getCopy } from '@/features/copy/queries';
import { getSiteProfile } from '@/features/profile/queries';

export const alt = 'Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image() {
  const [copy, profile, fonts] = await Promise.all([getCopy(), getSiteProfile(), loadOgFonts()]);
  const logo = await imageDataUrl(profile.logo);

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
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid black',
          padding: '60px',
        }}
      >
        {logo && <img src={logo} alt="" width={100} height={100} />}
        <h1 style={{ fontSize: '64px', color: 'black', marginBottom: '10px' }}>
          {copy['blog.ogTitle']}
        </h1>
        <p
          style={{
            fontSize: '28px',
            color: 'black',
            textAlign: 'center',
            maxWidth: '800px',
            border: '3px solid black',
            padding: '10px 15px',
            borderRadius: '100px',
          }}
        >
          {copy['blog.ogSubtitle']}
        </p>
      </div>
    </div>,
    { ...size, fonts },
  );
}
