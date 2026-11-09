import type { ArtShape } from './art';

export const AUTHOR_SLUG = 'your-name';

export const STARTER_AUTHOR = {
  slug: AUTHOR_SLUG,
  name: 'Your Name',
  position: 'Full-Stack Developer',
};

export function starterProfile(images: { avatar: string; logo: string; favicon: string }) {
  return {
    name: 'Your Name',
    title: 'Full-Stack Developer',
    intro:
      'Welcome! This is a starter profile. I build fast websites and the tools behind them, and this is where you introduce yourself to whoever just landed here.',
    about:
      'Every word, image, icon and link on this page can be changed from the dashboard. Sign in and open Site Profile to make it yours.',
    siteName: 'My Site',
    initials: 'YN',
    description: 'A personal website, blog and portfolio.',
    keywords: ['portfolio', 'developer', 'blog', 'projects'],
    ...images,
    skills: [
      { name: 'TypeScript', icon: 'simple-icons:typescript' },
      { name: 'JavaScript', icon: 'simple-icons:javascript' },
      { name: 'React', icon: 'simple-icons:react' },
      { name: 'Next.js', icon: 'simple-icons:nextdotjs' },
      { name: 'Tailwind CSS', icon: 'simple-icons:tailwindcss' },
      { name: 'Node.js', icon: 'simple-icons:nodedotjs' },
      { name: 'Bun', icon: 'simple-icons:bun' },
      { name: 'PostgreSQL', icon: 'simple-icons:postgresql' },
      { name: 'Redis', icon: 'simple-icons:redis' },
      { name: 'Docker', icon: 'simple-icons:docker' },
      { name: 'Git', icon: 'simple-icons:git' },
      { name: 'Figma', icon: 'simple-icons:figma' },
    ],
    socials: [
      { name: 'GitHub', url: 'https://github.com', icon: 'simple-icons:github' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com', icon: 'fa6-brands:linkedin' },
      { name: 'X', url: 'https://x.com', icon: 'simple-icons:x' },
    ],
    navigation: [
      { label: 'Home', href: '/', icon: 'lucide:house' },
      { label: 'Blog', href: '/blog', icon: 'lucide:notebook' },
      { label: 'Projects', href: '/projects', icon: 'lucide:folder' },
      { label: 'Contact', href: '/contact', icon: 'lucide:mail' },
    ],
  };
}

const PRIVACY_CONTENT = `This site uses a small, first-party analytics system to see which pages people read. It sets no cookies, uses no third-party trackers and never shares the data.

## What is recorded

- The page you viewed, and the time
- The website that referred you, reduced to its domain name
- Your approximate country and device category (desktop, mobile or tablet)

## What is not recorded

Your IP address is never stored. To count unique visits, it is combined with your browser string and a random value into a one-way hash. The random value is replaced every day and the old one is destroyed, so a visit cannot be linked to you or to your visits on other days.

## Contact form

Messages sent through the contact form are delivered by email and used only to reply to you.

## Your choices

If your browser sends Global Privacy Control or Do Not Track, nothing is recorded at all. You can also opt out here. The choice is stored only in this browser.`;

export function starterCopy(mapImage: string) {
  return {
    'home.todayHeading': 'Today',
    'home.techHeading': 'Tech Stack',
    'home.blogsHeading': 'Latest Blogs',
    'home.blogsLink': 'view more blogs',
    'home.blogsEmpty': 'No blogs published yet.',
    'home.projectsHeading': 'Projects',
    'home.projectsLink': 'view all projects',
    'home.projectsEmpty': 'No projects added yet.',
    'home.privacyLink': 'Privacy',
    'blog.heading': 'Blogs',
    'blog.empty': 'No blogs published yet.',
    'blog.readMore': 'Read more',
    'blog.tocHeading': 'On this page',
    'blog.metaTitle': 'Blog',
    'blog.metaDescription': 'Notes on building things.',
    'blog.ogTitle': 'Blog',
    'blog.ogSubtitle': 'Notes on building things.',
    'projects.heading': 'Projects',
    'projects.empty': 'No projects added yet.',
    'projects.technologiesHeading': 'Technologies Used',
    'projects.metaTitle': 'Projects',
    'projects.metaDescription': 'Things I have built.',
    'contact.heading': 'Contact me',
    'contact.description':
      "Questions, feedback, collaboration, or just saying hello: I'm always happy to hear from you.",
    'contact.mapImage': mapImage,
    'contact.pinLabel': "I'm here",
    'contact.nameLabel': 'Full name',
    'contact.namePlaceholder': 'Jane Doe',
    'contact.emailLabel': 'Email address',
    'contact.emailPlaceholder': 'you@example.com',
    'contact.messageLabel': 'Message',
    'contact.messagePlaceholder': 'Type your message here',
    'contact.continueLabel': 'Continue',
    'contact.sendingCodeLabel': 'Sending code...',
    'contact.verifyNote':
      "To keep spam out, I'll email you a 6-digit code to confirm your address before your message is sent.",
    'contact.verifyHeading': 'Check your email',
    'contact.verifyBody':
      'I sent a 6-digit code to {email}. Enter it below to send your message. It expires in 10 minutes.',
    'contact.codeLabel': 'Verification code',
    'contact.verifySubmit': 'Verify & send',
    'contact.verifySending': 'Sending...',
    'contact.resendLabel': 'Resend code',
    'contact.resendCountdown': 'Resend code in {seconds}s',
    'contact.changeLabel': 'Change email or message',
    'contact.sentHeading': 'Message sent',
    'contact.sentBody':
      "Thanks, {name}! Your email is confirmed and your message is on its way. I'll reply to {email}.",
    'contact.sendAnotherLabel': 'Send another message',
    'contact.metaTitle': 'Contact',
    'contact.metaDescription': 'Questions, feedback, collaboration, or just to say hello.',
    'privacy.heading': 'Privacy',
    'privacy.content': PRIVACY_CONTENT,
    'privacy.optOut': 'Opt out of analytics',
    'privacy.allow': 'Allow analytics',
    'privacy.statusOut': 'You are opted out.',
    'privacy.statusIn': 'Analytics are on.',
    'privacy.metaTitle': 'Privacy',
    'privacy.metaDescription': 'What this site measures and how to opt out.',
    'notFound.heading': '404',
    'notFound.body':
      "Sorry, we couldn't find the page you're looking for. It might have been moved or deleted, or the address may be wrong.",
    'notFound.button': 'Back to Home',
    'nav.themeLabel': 'Theme',
  };
}

interface ArtPalette {
  from: string;
  to: string;
  glow: string;
  shape: ArtShape;
}

export const AVATAR_ART: ArtPalette = {
  from: '#312e81',
  to: '#0f172a',
  glow: '#818cf8',
  shape: 'ring',
};

export const STARTER_POSTS: {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  featured: boolean;
  daysAgo: number;
  art: ArtPalette;
  content: string;
}[] = [
  {
    slug: 'welcome-to-your-new-site',
    title: 'Welcome to your new site',
    description:
      'A quick tour of what you can change from the dashboard, and where to start making this place your own.',
    tags: ['Getting started'],
    featured: true,
    daysAgo: 1,
    art: { from: '#1e1b4b', to: '#0f172a', glow: '#6366f1', shape: 'ring' },
    content: `Your site is up and running. This post is sample content, so edit it or delete it whenever you like.

## Where to start

Sign in to the dashboard and work through these in order:

1. **Site Profile** holds your name, photo, tech stack, menu and social links.
2. **Site Text** holds every heading, label and message on the public pages.
3. **Blog** and **Projects** hold your writing and your work.

## Nothing here is hard-coded

Everything you see lives in the database. When you save in the dashboard, the public pages update straight away, with no redeploy.

## When you are ready

Delete the sample posts and projects, publish something of your own, and share the link.`,
  },
  {
    slug: 'writing-in-markdown',
    title: 'Writing posts in Markdown',
    description:
      'Headings, lists, code blocks and images: everything the editor supports, shown in one short post.',
    tags: ['Writing', 'Markdown'],
    featured: false,
    daysAgo: 4,
    art: { from: '#042f2e', to: '#0f172a', glow: '#2dd4bf', shape: 'bars' },
    content: `Posts are written in Markdown, and the editor shows you the finished result as you type.

## Formatting

You can write **bold** text, *italics* and [links](https://example.com). Lists work the way you would expect:

- Short bullet points
- Numbered steps
- Nested ideas

## Code

Code blocks are highlighted automatically:

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Images

Upload an image from the editor and it is stored with the rest of your content, so there is nothing else to host.`,
  },
  {
    slug: 'privacy-friendly-analytics',
    title: 'Analytics without the tracking',
    description:
      'How this site counts visitors without cookies, stored IP addresses or anything that follows you around.',
    tags: ['Privacy'],
    featured: false,
    daysAgo: 9,
    art: { from: '#431407', to: '#1c1917', glow: '#fb923c', shape: 'orbs' },
    content: `It is useful to know which pages people read. It is not necessary to know who they are.

## What gets counted

A page view records the page, the referring domain, an approximate country and the device category. That is all.

## What does not

There are no cookies and no stored IP addresses. Unique visits use a one-way hash with a random value that is destroyed every day, so a visit cannot be linked to a person or to another day.

## Opting out

Browsers that send Global Privacy Control or Do Not Track are never counted, and the privacy page has an opt-out button for everyone else.`,
  },
];

export const STARTER_PROJECTS: {
  slug: string;
  title: string;
  description: string;
  category: string;
  frontend: string[];
  backend: string[];
  featured: boolean;
  art: ArtPalette;
  content: string;
}[] = [
  {
    slug: 'example-storefront',
    title: 'Example Storefront',
    description: 'A sample project. Replace it with something you built from the dashboard.',
    category: 'Web Application',
    frontend: ['Next.js', 'Tailwind CSS'],
    backend: ['PostgreSQL', 'Stripe'],
    featured: true,
    art: { from: '#4c0519', to: '#1e1b4b', glow: '#f43f5e', shape: 'orbs' },
    content: `## The idea

Describe what you built and why it matters. This page is sample content.

## How it works

Explain the interesting parts: the architecture, the hard problems, and what you would do differently next time.`,
  },
  {
    slug: 'example-dashboard',
    title: 'Example Dashboard',
    description: 'Another sample project. Add a cover image, links and your own write-up.',
    category: 'Internal Tool',
    frontend: ['React', 'TypeScript'],
    backend: ['Bun', 'Redis'],
    featured: true,
    art: { from: '#172554', to: '#022c22', glow: '#38bdf8', shape: 'bars' },
    content: `## The idea

Describe what you built and why it matters. This page is sample content.

## How it works

Explain the interesting parts: the architecture, the hard problems, and what you would do differently next time.`,
  },
  {
    slug: 'example-mobile-app',
    title: 'Example Mobile App',
    description: 'A third sample project, here so the projects page has a little weight to it.',
    category: 'Mobile',
    frontend: ['React Native'],
    backend: ['Node.js', 'PostgreSQL'],
    featured: false,
    art: { from: '#3b0764', to: '#0f172a', glow: '#c084fc', shape: 'ring' },
    content: `## The idea

Describe what you built and why it matters. This page is sample content.`,
  },
  {
    slug: 'example-open-source',
    title: 'Example Open Source',
    description: 'One more sample project. Delete it once you have added your own.',
    category: 'Library',
    frontend: [],
    backend: ['Rust', 'Docker'],
    featured: false,
    art: { from: '#422006', to: '#052e16', glow: '#facc15', shape: 'orbs' },
    content: `## The idea

Describe what you built and why it matters. This page is sample content.`,
  },
];
