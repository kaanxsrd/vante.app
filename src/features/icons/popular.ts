import type { IconPurpose } from './types';

const brands = (names: string) => names.split(' ').map((name) => `simple-icons:${name}`);
const general = (names: string) => names.split(' ').map((name) => `lucide:${name}`);

export const POPULAR_ICONS: Record<IconPurpose, string[]> = {
  tech: [
    ...brands('typescript javascript python rust go cplusplus c'),
    'logos:java',
    'logos:c-sharp',
    ...brands('php ruby swift kotlin dart elixir scala lua'),
    ...brands('react nextdotjs vuedotjs nuxt angular svelte astro solid remix'),
    ...brands('tailwindcss html5 css sass shadcnui framer threedotjs'),
    ...brands('nodedotjs bun deno express nestjs fastify hono trpc graphql'),
    ...brands('django flask fastapi laravel rubyonrails spring'),
    'logos:dotnet',
    ...brands('postgresql mysql sqlite mariadb mongodb redis prisma drizzle supabase firebase'),
    ...brands('docker kubernetes terraform ansible linux ubuntu nginx apache'),
    'logos:aws',
    'logos:microsoft-azure',
    ...brands('googlecloud vercel netlify cloudflare digitalocean'),
    ...brands('git github gitlab bitbucket githubactions'),
    'logos:visual-studio-code',
    ...brands('neovim jetbrains figma postman'),
    ...brands('vite webpack turborepo npm pnpm yarn'),
    ...brands('jest vitest cypress electron tauri flutter unity unrealengine'),
    ...brands('pytorch tensorflow pandas numpy'),
    'logos:openai-icon',
  ],
  social: [
    ...brands('github gitlab instagram x facebook'),
    'fa6-brands:linkedin',
    ...brands('youtube twitch tiktok discord telegram whatsapp signal reddit'),
    ...brands('threads bluesky mastodon snapchat pinterest'),
    ...brands('medium devdotto hashnode substack stackoverflow'),
    ...brands('dribbble behance spotify applemusic soundcloud'),
    ...brands('steam playstation epicgames battledotnet'),
    'fa6-brands:xbox',
    ...brands('buymeacoffee patreon kofi paypal'),
    ...general('mail globe rss phone link at-sign send message-circle'),
  ],
  menu: general(
    'house notebook pickaxe folder user link mail globe disc-3 headphones book-open newspaper briefcase layers code-xml terminal rocket sparkles image camera music gamepad-2 heart star message-circle phone map-pin calendar file-text pen-tool palette rss users video mic wrench zap',
  ),
};
