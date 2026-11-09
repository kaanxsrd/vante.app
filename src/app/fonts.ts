import localFont from 'next/font/local';

export const clashDisplay = localFont({
  src: '../../public/fonts/ClashDisplay-Semibold.ttf',
  weight: '600',
  display: 'swap',
  variable: '--font-clash',
});

export const cabinetGrotesk = localFont({
  src: '../../public/fonts/CabinetGrotesk-Medium.ttf',
  weight: '500',
  display: 'swap',
  variable: '--font-cabinet',
});
