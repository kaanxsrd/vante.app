# 🌐 [vante.app](https://vante.app)

A modern full-stack developer portfolio built with **Next.js 15**, featuring a blog system powered by **Fumadocs**, Spotify "Now Playing" integration, and a secure Nodemailer contact service.

---

## 🚀 Features

- **Personal Portfolio** – Showcase of skills, experience, and projects.
- **Blog & Projects** – Content-driven via `fumadocs-mdx` and `data/` folder.
- **Configurable Site Settings** – Modify values in `lib/site.ts`.
- **Reusable UI Components** – Radix UI + TailwindCSS design system.
- **Spotify Integration** – Live "Now Playing" widget connected to Spotify API.
- **Contact Form** – Secure **Nodemailer** API route for email handling.
- **Dark/Minimal UI** – Clean, developer-focused design.
- **Turbopack Dev Server** – Lightning-fast development mode.

---

## 🛠️ Tech Stack

### Frontend

- Next.js 15 (App Router + Turbopack)
- React 19
- TailwindCSS 4 + Tailwind Merge
- Radix UI Primitives
- Framer Motion + Motion

### Backend & Content

- Fumadocs (Core, UI, MDX)
- Nodemailer (Contact API)
- Zod (Validation)

### Utilities

- ESLint 9 + Prettier 3
- Docker (optional for deployment)
- TypeScript 5

---

## 📂 Project Structure

```bash
├── app/                # Next.js App Router
│   ├── api/            # API routes (contact, spotify, etc.)
│   ├── blog/           # Blog pages
│   ├── contact/        # Contact page
│   └── projects/       # Projects page
│
├── components/         # Reusable UI + MagicUI components
│   └── ui/             # BlogCard, AuthorCard, SpotifyNowPlaying, etc.
│
├── data/               # Content data
│   ├── blog/           # Blog posts
│   └── projects/       # Project entries
│
├── lib/                # Config & helpers
│   ├── authors.ts
│   ├── projects.ts
│   ├── site.ts         # Site configuration
│   └── utils.ts
│
├── public/             # Static assets
├── .env                # Environment variables
└── package.json
```

## ⚙️ Configuration

### Edit lib/site.ts to update:

- Site metadata (title, description, SEO tags).
- Author and social links.
- Global configuration for blog/projects.

## 🚀 Getting Started

```bash
# Clone repository
git clone https://github.com/kaanxsrd/vante.app.git
cd vante.app

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

then open http://localhost:3000.

## � Projects

Here are some featured projects showcased in the portfolio:

- **Portfolio Site** - This very site, built with Next.js and Fumadocs. [Repo](https://github.com/kaanxsrd/vante.app) | [Live Demo](https://vante.app)
- **Bots Project** - Description of bots project. [Repo](link) | [Live Demo](link)
- **Other Project** - Placeholder for additional projects. [Repo](link) | [Live Demo](link)

## �📄 License

### [GPL-3.0-only](LICENSE) License © 2025 Kaan Karahanlı
