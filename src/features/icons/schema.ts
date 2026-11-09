import { z } from 'zod';

const ICON_ID = /^[a-z0-9-]+:[a-z0-9_-]+$/;

const LEGACY_ICON_IDS = new Map(
  Object.entries({
    typescript: 'simple-icons:typescript',
    rust: 'simple-icons:rust',
    go: 'simple-icons:go',
    python: 'simple-icons:python',
    cplusplus: 'simple-icons:cplusplus',
    react: 'simple-icons:react',
    nextjs: 'simple-icons:nextdotjs',
    tailwindcss: 'simple-icons:tailwindcss',
    framermotion: 'simple-icons:framer',
    express: 'simple-icons:express',
    nestjs: 'simple-icons:nestjs',
    hono: 'simple-icons:hono',
    bun: 'simple-icons:bun',
    mongodb: 'simple-icons:mongodb',
    postgresql: 'simple-icons:postgresql',
    redis: 'simple-icons:redis',
    prisma: 'simple-icons:prisma',
    drizzle: 'simple-icons:drizzle',
    supabase: 'simple-icons:supabase',
    docker: 'simple-icons:docker',
    git: 'simple-icons:git',
    github: 'simple-icons:github',
    instagram: 'simple-icons:instagram',
    steam: 'simple-icons:steam',
    discord: 'simple-icons:discord',
    x: 'simple-icons:x',
    youtube: 'simple-icons:youtube',
    spotify: 'simple-icons:spotify',
    linkedin: 'fa6-brands:linkedin',
    code: 'lucide:code',
    globe: 'lucide:globe',
    email: 'lucide:mail',
    home: 'lucide:house',
    notebook: 'lucide:notebook',
    pickaxe: 'lucide:pickaxe',
    folder: 'lucide:folder',
    user: 'lucide:user',
    link: 'lucide:link',
  }),
);

export const legacyIconNames = (): string[] => [...LEGACY_ICON_IDS.keys()];

export const iconIdSchema = z.preprocess(
  (value) => (typeof value === 'string' ? (LEGACY_ICON_IDS.get(value) ?? value) : value),
  z.string().max(120).regex(ICON_ID, 'Choose an icon from the library'),
);
