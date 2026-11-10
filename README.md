<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/banner-dark.webp">
  <img alt="vante.app: a fast public site, with a private control center behind it" src="docs/assets/banner-light.webp" width="100%">
</picture>

<br>

**A personal website and blog, backed by a private dashboard for publishing content, issuing API keys, watching traffic and catching abuse.**

<br>

[![Next.js 16.4](https://img.shields.io/badge/Next.js-16.4-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19.3](https://img.shields.io/badge/React-19.3-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun 1.4](https://img.shields.io/badge/Bun-1.4-f9f1e1?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle 0.45](https://img.shields.io/badge/Drizzle-0.45-c5f74f?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Tailwind CSS 4.3](https://img.shields.io/badge/Tailwind-4.3-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
<br>
[![Better Auth 1.7](https://img.shields.io/badge/Better_Auth-1.7-111111?style=flat-square)](https://www.better-auth.com)
[![Motion 14](https://img.shields.io/badge/Motion-14-fff312?style=flat-square&logo=framer&logoColor=black)](https://motion.dev)
[![Zod 4](https://img.shields.io/badge/Zod-4-3e67b1?style=flat-square&logo=zod&logoColor=white)](https://zod.dev)
[![Resend 6](https://img.shields.io/badge/Resend-6-000000?style=flat-square&logo=resend&logoColor=white)](https://resend.com)
[![Biome 2.6](https://img.shields.io/badge/Biome-2.6-60a5fa?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-8b7cf6?style=flat-square)](LICENSE)

**[Website](https://vante.app)** ·
**[Quick start](#quick-start)** ·
**[API](#api)** ·
**[Security](#security-architecture)** ·
**[Deployment](#deployment)**

</div>

<br>

<img alt="The dashboard overview in the dark theme: traffic, content, API and security statistics above visitor and API charts" src="docs/assets/screenshot-overview.webp" width="100%">

<table>
  <tr>
    <td width="50%"><img alt="The public home page: name, introduction, tech stack and latest posts" src="docs/assets/screenshot-home.webp"></td>
    <td width="50%"><img alt="The overview in the light theme" src="docs/assets/screenshot-overview-light.webp"></td>
  </tr>
  <tr>
    <td align="center"><sub>The public site: static, fast and quiet.</sub></td>
    <td align="center"><sub>The control center, in light or dark.</sub></td>
  </tr>
</table>

<sub>Dashboard screenshots come from a local instance filled with generated test traffic, and the music page from sample data.</sub>

## Features

<table>
  <tr>
    <td width="50%" valign="top">

**Blog CMS**<br>
Markdown editor with a live preview, image uploads, categories, tags, custom slugs, scheduled publication and SEO fields. Saving updates the public site immediately.

</td>
    <td width="50%" valign="top">

**Project management**<br>
Thumbnails, galleries, technology stacks, repository and demo links, featured projects, categories and a custom order.

</td>
  </tr>
  <tr>
    <td valign="top">

**API keys**<br>
Scoped keys with rate limits, daily quotas, expiry, and IP and origin restrictions. Rotate with a grace period, suspend temporarily or revoke instantly. A key is shown once and stored only as a keyed hash.

</td>
    <td valign="top">

**Threat detection**<br>
Twelve configurable rules cover credential abuse, request spikes, invalid keys, scanning and more. Incidents are deduplicated, and a rule can suspend a key automatically when you enable it.

</td>
  </tr>
  <tr>
    <td valign="top">

**Honest incident labels**<br>
An unusual country is an _anomaly_, a blocked origin is a _policy violation_, a credential pattern is a _suspected threat_. Only you can mark something a _confirmed threat_.

</td>
    <td valign="top">

**Email alerts**<br>
HTML alerts through Resend with severity, metadata and recommended actions. Per-category preferences, retries with backoff and a full delivery history.

</td>
  </tr>
  <tr>
    <td valign="top">

**Music page**<br>
What you are listening to right now, listening stats, a 14-day chart and top albums, artists and tracks from Last.fm, with a live listening badge on the home page.

</td>
    <td valign="top">

**Verified contact form**<br>
Visitors confirm their address with a 6-digit code before a message is sent, which keeps spam out. The map dot can be placed on any country from the dashboard.

</td>
  </tr>
  <tr>
    <td valign="top">

**API analytics**<br>
Requests over time, by endpoint and by key, status codes, response times, rate-limit violations, countries, and a searchable request history with a live mode.

</td>
    <td valign="top">

**Private website analytics**<br>
No cookies and no stored IP addresses. Honors Global Privacy Control and Do Not Track, and has a visitor opt-out. Kept entirely separate from API monitoring.

</td>
  </tr>
</table>

Everything public lives in the database and is edited from the dashboard, with the same instant updates: your name, branding, menu and social links under **Site Profile**, which has a searchable library of nearly 10,000 icons, every heading and label under **Site Text**, the people on your posts under **Authors**, and all images under **Media**.

<table>
  <tr>
    <td width="50%"><img alt="The music page: the track playing now on a record, listening totals and a 14-day chart" src="docs/assets/screenshot-music.webp"></td>
    <td width="50%"><img alt="The contact page: a form beside a tilted world map with a pin on it" src="docs/assets/screenshot-contact.webp"></td>
  </tr>
  <tr>
    <td align="center"><sub>Live listening, straight from Last.fm.</sub></td>
    <td align="center"><sub>A contact form that verifies the sender.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img alt="The icon picker: a searchable grid of technology logos" src="docs/assets/screenshot-icons.webp"></td>
    <td width="50%"><img alt="Site Text: a world map for placing the contact page dot, with a country list" src="docs/assets/screenshot-site-text.webp"></td>
  </tr>
  <tr>
    <td align="center"><sub>Nearly 10,000 icons to choose from.</sub></td>
    <td align="center"><sub>Every word on the site, and the dot on the map.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img alt="The post editor with Markdown on the left, rendered preview on the right and publishing options in a side column" src="docs/assets/screenshot-editor.webp"></td>
    <td width="50%"><img alt="API Management: a table of keys with their state, permissions, limits and usage" src="docs/assets/screenshot-api-keys.webp"></td>
  </tr>
  <tr>
    <td align="center"><sub>Write in Markdown, see the result as you type.</sub></td>
    <td align="center"><sub>Every key, its permissions and its usage.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img alt="Security Monitoring: incidents with severity, assessment, source and status" src="docs/assets/screenshot-security.webp"></td>
    <td width="50%"><img alt="An incident page with request metadata, response actions and recommended steps" src="docs/assets/screenshot-incident.webp"></td>
  </tr>
  <tr>
    <td align="center"><sub>Incidents, filtered by severity and assessment.</sub></td>
    <td align="center"><sub>Full context and one-click responses.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img alt="API Analytics: statistics, a requests-over-time chart and status code distribution" src="docs/assets/screenshot-api-analytics.webp"></td>
    <td width="50%"><img alt="Website Analytics: visitors, page views and visitor trends" src="docs/assets/screenshot-analytics.webp"></td>
  </tr>
  <tr>
    <td align="center"><sub>Which keys and endpoints drive traffic and errors.</sub></td>
    <td align="center"><sub>How people use the site, without tracking them.</sub></td>
  </tr>
</table>

## Quick start

Requires [Bun](https://bun.sh) 1.4+ and Docker (or any PostgreSQL 15+).

```sh
git clone https://github.com/kaanxsrd/vante.app.git && cd vante.app
bun install

cp .env.example .env         # then fill in the required values below
bun run db:up                # local PostgreSQL on port 54329
bun run db:migrate
bun run db:seed              # fills a new database with starter content
bun run admin:create         # creates the account named by ADMIN_EMAIL

bun run dev
```

The site runs at <http://localhost:3000> and the dashboard at `http://localhost:3000/<ADMIN_PATH>`.

`db:seed` adds a placeholder profile, sample posts and projects, generated cover images, a world map and all the site text, so a new site looks finished from the first page load. Replace it from the dashboard whenever you are ready. It only runs on an empty database, so it can never overwrite real content. Without it, each page shows placeholder skeletons until you fill in its text under **Site Text**, and the home page needs **Site Profile**.

To turn on the music page, add `LASTFM_API_KEY`, enter your username in **Site Text** on the Music tab, and add `/music` to the menu in **Site Profile**.

## How it works

```mermaid
flowchart LR
  visitor([Visitor]) --> proxy{{proxy.ts}}
  admin([You]) -->|/ADMIN_PATH| proxy
  client([API client]) -->|/api/v1| proxy

  proxy --> site[Public pages<br/>static + revalidated]
  proxy -->|rewrite| panel[Dashboard<br/>session checked on every page]
  proxy --> gateway[API gateway<br/>auth, policy, limits]

  site --> pg[(PostgreSQL)]
  site -.music.-> lastfm([Last.fm])
  panel --> pg
  gateway --> pg
  gateway -.after response.-> detect[Detection]
  detect --> pg
  detect --> queue[Job queue in Postgres]
  queue --> email([Resend or SMTP])
```

- **Public pages** are prerendered and revalidated. Saving in the dashboard regenerates them straight away.
- **The dashboard** lives at a path you choose, set in an environment variable, so it never appears in the source code.
- **PostgreSQL does the coordination.** Rate limits, the job queue and uploaded images all live in it, so there is no Redis or object storage to run.
- **Recording and detection happen after the response** with Next.js `after()`, so monitoring adds no latency to API calls.

<details>
<summary><b>Repository layout</b></summary>

<br>

```text
src/
  app/
    (site)/             Public website, with its own root layout
    console-internal/   Dashboard routes, reachable only through the ADMIN_PATH rewrite
    api/v1/             Public API, built on the gateway in features/api-platform
    api/                Contact, music, analytics beacon, health and cron endpoints
    media/[id]/         Serves uploaded images
  components/
    ui/                 Design system primitives
    admin/              Dashboard shell, charts, tables and editors
    site/               Public website components
    magicui/            Animated components
  features/             One folder per domain: schema, service, queries and actions
    analytics/  api-keys/  api-monitoring/  api-platform/  audit/  auth/  authors/
    blog/  contact/  content/  copy/  icons/  jobs/  media/  music/  notifications/
    overview/  profile/  projects/  security/  settings/
  db/                   Drizzle schema and SQL migrations
  lib/                  Environment, logging, rate limiting, email and request helpers
  proxy.ts              Request gate: dashboard rewrite, CSP and security headers
public/                 Fonts for generated social images
scripts/                migrate, seed, create-admin and worker
  seed-data/            Starter text, generated artwork and the world map
tests/                  Unit tests and integration tests, which only run on a local database
docs/assets/            README images
```

</details>

## Configuration

Copy `.env.example` to `.env`. Generate secrets with `openssl rand -base64 48`.

| Variable                                                          | Required             | Purpose                                                            |
| ----------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                                                    | Yes                  | PostgreSQL connection string                                       |
| `NEXT_PUBLIC_SITE_URL`                                            | Yes                  | Public origin, without a trailing slash                            |
| `ADMIN_PATH`                                                      | For the dashboard    | Secret URL segment. The dashboard answers 404 when unset           |
| `ADMIN_EMAIL`                                                     | For the dashboard    | The only account allowed to sign in                                |
| `BETTER_AUTH_SECRET`                                              | For the dashboard    | Signs sessions. At least 32 characters                             |
| `API_KEY_PEPPER`                                                  | For the API          | Keys stored API key hashes. Changing it invalidates every key      |
| `CRON_SECRET`                                                     | Recommended          | Authorizes `/api/internal/cron`                                    |
| `RESEND_API_KEY`                                                  | For email            | Used whenever set. Otherwise SMTP below                            |
| `EMAIL_FROM`                                                      | For email            | A sender on a verified domain                                      |
| `SECURITY_ALERT_EMAIL`                                            | No                   | Default alert recipient, editable in the dashboard                 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | No                   | Email fallback                                                     |
| `CONTACT_EMAIL`                                                   | For the contact form | Where messages are delivered                                       |
| `CONTACT_TOKEN_SECRET`                                            | No                   | Falls back to `BETTER_AUTH_SECRET`                                 |
| `LASTFM_API_KEY`                                                  | No                   | Music page and the home page listening badge                       |
| `TRUSTED_IP_HEADER`                                               | Self-hosting         | A client IP header your proxy always overwrites                    |
| `GEO_COUNTRY_HEADER`                                              | Self-hosting         | A country header. Vercel and Cloudflare are detected automatically |
| `DATABASE_POOL_MAX`, `LOG_LEVEL`                                  | No                   | Connections per instance, and log verbosity                        |

## Commands

| Command                             | What it does                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`                       | Development server                                                                                                  |
| `bun run build` / `bun run start`   | Production build and server                                                                                         |
| `bun run check`                     | Biome and the TypeScript compiler                                                                                   |
| `bun run lint` / `bun run format`   | Biome lint, or format in place                                                                                      |
| `bun run typecheck`                 | TypeScript only                                                                                                     |
| `bun run test`                      | Unit tests                                                                                                          |
| `bun run test:integration`          | Tests against a real PostgreSQL, with a fake email provider                                                         |
| `bun run db:up` / `bun run db:down` | Start or stop local PostgreSQL                                                                                      |
| `bun run db:generate`               | Create a migration from schema changes                                                                              |
| `bun run db:migrate`                | Apply migrations                                                                                                    |
| `bun run db:seed`                   | Add starter content to an empty database. Does nothing if the site already has content                              |
| `bun run db:studio`                 | Drizzle Studio                                                                                                      |
| `bun run admin:create`              | Create the admin, or reset its password and sign out all sessions. Add `--reset-2fa` if you lose your authenticator |
| `bun run worker`                    | Long-running background worker for self-hosting                                                                     |

## Deployment

### Vercel

1. Create a PostgreSQL database. The client disables prepared statements, so a transaction-mode pooler can be used.
2. Set the variables above in the project settings.
3. From your machine, with `DATABASE_URL` pointing at production:

   ```sh
   bun run db:migrate
   bun run db:seed
   ADMIN_EMAIL=you@example.com bun run admin:create
   ```

4. Deploy. `vercel.json` installs with Bun and registers a daily cron job for maintenance.

Background work also runs after API requests and failed sign-ins, so alerts go out without a dedicated worker. For scans on a fixed schedule with no traffic, call `GET /api/internal/cron` with `Authorization: Bearer $CRON_SECRET` from any scheduler. Vercel's Hobby plan limits its own cron jobs to once a day.

### Self-hosting

Run `bun run build && bun run start` behind a reverse proxy that terminates TLS, plus `bun run worker` as a second process. Set `TRUSTED_IP_HEADER` to a header your proxy overwrites, because per-IP limits and detection trust it. Set `GEO_COUNTRY_HEADER` if your proxy adds one. Without a country source, countries show as Unknown and geographic detection stays quiet.

## API

The API is for server-to-server use. Send a key from **API Management** as a bearer token (or in `X-API-Key`). Keys in URLs are ignored.

```sh
curl https://vante.app/api/v1/posts?limit=5 \
  -H "Authorization: Bearer vnt_xxxxxxxxxxxx_..."
```

| Method and path                 | Permission       | Description                                                      |
| ------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `GET /api/v1/me`                | Any key          | The calling key's identifier, permissions and limits             |
| `GET /api/v1/posts`             | `posts:read`     | Published posts. Supports `limit` and `offset`                   |
| `GET /api/v1/posts/:slug`       | `posts:read`     | One published post, with content                                 |
| `POST /api/v1/posts`            | `posts:write`    | Create a post                                                    |
| `PATCH /api/v1/posts/:slug`     | `posts:write`    | Update any fields of a post                                      |
| `DELETE /api/v1/posts/:slug`    | `posts:write`    | Delete a post                                                    |
| `GET /api/v1/projects`          | `projects:read`  | Published projects                                               |
| `GET /api/v1/projects/:slug`    | `projects:read`  | One published project                                            |
| `POST /api/v1/projects`         | `projects:write` | Create a project                                                 |
| `PATCH /api/v1/projects/:slug`  | `projects:write` | Update any fields of a project                                   |
| `DELETE /api/v1/projects/:slug` | `projects:write` | Delete a project                                                 |
| `GET /api/v1/analytics/summary` | `analytics:read` | Website totals and top pages. Supports `range=24h\|7d\|30d\|90d` |

Successful responses are `{ "data": ..., "meta": ... }`. Errors have a stable code:

```json
{
  "error": {
    "code": "insufficient_scope",
    "message": "This key needs the posts:write permission.",
    "requestId": "..."
  }
}
```

Every response includes `X-Request-Id`. Rate-limited endpoints add `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`, and a `429` adds `Retry-After`.

## Security architecture

**Access to the dashboard**

- The path comes from `ADMIN_PATH`, so it is not in the repository, the bundle, the sitemap or `robots.txt`. The real route folder returns 404 when requested directly.
- The path is not the protection. Every page and server action verifies a database-backed session and that it belongs to `ADMIN_EMAIL`.
- There is no public sign-up and no `/api/auth` endpoint. Sign-in is one rate-limited server action, and every credential failure returns the same error.
- Optional two-factor login with an authenticator app and single-use backup codes, turned on from Settings. No session exists until the second factor passes.
- Session cookies are HTTP-only, SameSite=Lax and Secure over HTTPS. Revoking a session takes effect on the next request.
- Dashboard pages use a per-request nonce CSP, `noindex` and `no-store`.

**API keys**

- Keys hold 256 bits from the OS random source and are stored only as an HMAC-SHA256 with a server-side pepper, so a database leak alone cannot verify one.
- Hash columns are excluded from every dashboard query. The full key is returned once, at creation or rotation.
- Authentication, IP and origin policy, permissions, limits, request recording and detection all live in one gateway, so a new endpoint cannot skip them.

**Monitoring**

- Each incident records its timestamp, key identifier, endpoint, IP address, origin, status code and severity. Secrets are never recorded, and a key pasted into a URL path is scrubbed before it reaches the history.
- Geographic signals never block or suspend anything. IP geolocation is approximate and VPNs, proxies and mobile networks trigger it routinely.
- Automatic suspension is off by default and only available on rules backed by strong evidence.
- Alert email is capped at 60 per hour, so an attacker triggering incidents cannot exhaust your email quota. Every incident is still recorded.
- An IP block covers both the API and dashboard sign-in. Limits count an IPv6 address by its /64.

**Content and privacy**

- Stored content is Markdown, not MDX, so it cannot execute code. Raw HTML is dropped and URLs are sanitized.
- Uploads are identified from their bytes, and SVG is refused.
- Website analytics stores no IP address and no cookie. Visitors are counted with a hash whose salt is destroyed daily, so "unique visitors" over several days counts a person once per day.

**Known limits**

- Public pages are statically cached, so their CSP allows inline scripts. Only dashboard pages have a nonce.
- The page shown when the database cannot be reached has fixed text, because it cannot read from the database.
- The per-account sign-in limit protects against password guessing, but someone sending many attempts for your email can delay your own sign-in for up to 15 minutes.
- Last.fm reports the current track but not the playback position, and the listening badge can take up to about a minute to catch up. "Estimated hours" on the music page assumes 3.5 minutes per play.

## Contributing

1. Keep each change focused. Domain logic belongs in `src/features/<domain>`, and shared helpers in `src/lib`.
2. Every server action goes through `adminAction`, and every `/api/v1` route through `apiRoute`. Every dashboard page starts with `requireAdminPage()`.
3. Change the database by editing `src/db/schema` and running `bun run db:generate`.
4. Before opening a pull request, run `bun run check`, `bun run test` and `bun run test:integration`.

To report a vulnerability, use the [contact form](https://vante.app/contact) instead of a public issue.

## License

[GNU General Public License v3.0](LICENSE) © Kaan Karahanlı.
