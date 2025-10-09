import { Icons } from '@/components/icons';
import { HomeIcon, NotebookIcon, Pickaxe } from 'lucide-react';

export const siteConfig = {
  name: "Kaan 'Vante' Karahanlı",
  initials: 'KK',
  title: 'Junior Full-Stack Developer',
  avatarUrl: 'https://github.com/kaanxsrd.png',
  url: 'https://vante.app',
  description: 'About myself and my projects.',

  landing: {
    intro:
      "Hi, I'm Kaan a freelance developer from Denmark. I work on various projects, from simple websites to complex backend apps, and I enjoy the variety of challenges each project offers.",
    about: "When I'm not coding, I'm probably playing fps games or talking with my friends.",
  },

  navbar: [
    { href: '/', icon: HomeIcon, label: 'Home' },
    { href: '/blog', icon: NotebookIcon, label: 'Blog' },
    { href: '/projects', icon: Pickaxe, label: 'Projects' },
  ],

  skills: [
    { name: 'HTML', icon: Icons.html },
    { name: 'CSS', icon: Icons.css },
    { name: 'Sass', icon: Icons.sass },
    { name: 'JavaScript', icon: Icons.javascript },
    { name: 'TypeScript', icon: Icons.typescript },
    { name: 'React', icon: Icons.react },
    { name: 'Next.js', icon: Icons.nextjs },
    { name: 'Tailwind', icon: Icons.tailwindcss },
    { name: 'Express.js', icon: Icons.express },
    { name: 'Nest.js', icon: Icons.nestjs },
    { name: 'Hono', icon: Icons.hono },
    { name: 'MongoDB', icon: Icons.mongodb },
    { name: 'PostgreSQL', icon: Icons.postgresql },
    { name: 'Prisma', icon: Icons.prisma },
    { name: 'Drizzle', icon: Icons.drizzle },
    { name: 'Supabase', icon: Icons.supabase },
    { name: 'Docker', icon: Icons.docker },
    { name: 'GitHub', icon: Icons.github },
    { name: 'Python', icon: Icons.python },
    { name: 'C++', icon: Icons.cplusplus },
  ],

  contact: {
    social: {
      GitHub: {
        name: 'GitHub',
        url: 'https://github.com/kaanxsrd',
        icon: Icons.github,
        navbar: true,
      },
      Instagram: {
        name: 'Instagram',
        url: 'https://instagram.com/kaanxsrd',
        icon: Icons.instagram,
        navbar: true,
      },
      Spotify: {
        name: 'Spotify',
        url: 'https://open.spotify.com/user/31ofln37ijxflqlbvke75mzsm5qi?si=c31514882f6745d7',
        icon: Icons.spotify,
        navbar: true,
      },
      Steam: {
        name: 'Steam',
        url: 'https://steamcommunity.com/id/vante-dev',
        icon: Icons.steam,
        navbar: true,
      },
      Email: {
        name: 'Email',
        url: '/contact',
        icon: Icons.email,
        navbar: true,
      },
    },
  },
};

export type SiteConfig = typeof siteConfig;
