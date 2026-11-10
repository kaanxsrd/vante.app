import { Check, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SetupStage } from '@/features/setup/queries';
import { cn } from '@/lib/utils';

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

function Command({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/50 px-3 py-2 font-mono text-[13px]">
      <code className="select-all">{children}</code>
    </pre>
  );
}

const STEPS: { stage: SetupStage; title: string; detail: ReactNode; command: string }[] = [
  {
    stage: 'environment',
    title: 'Create your settings file',
    detail:
      'This copies the template, which already points at the local database in the next step.',
    command: 'cp .env.example .env',
  },
  {
    stage: 'database',
    title: 'Start the database',
    detail: (
      <>
        This runs PostgreSQL in Docker, so Docker needs to be open. To use your own PostgreSQL 15+
        instead, put its address in <Code>DATABASE_URL</Code> in <Code>.env</Code> and restart{' '}
        <Code>bun run dev</Code>.
      </>
    ),
    command: 'bun run db:up',
  },
  {
    stage: 'migrations',
    title: 'Create the tables',
    detail: 'This builds the database structure the site needs.',
    command: 'bun run db:migrate',
  },
  {
    stage: 'content',
    title: 'Add the starter content',
    detail:
      'This fills the empty database with a placeholder profile, sample posts and projects. It never overwrites real content.',
    command: 'bun run db:seed',
  },
];

export function SetupNotice({ stage }: { stage: Exclude<SetupStage, 'ready'> }) {
  const current = STEPS.findIndex((step) => step.stage === stage);

  return (
    <main className="relative mx-auto min-h-screen max-w-2xl bg-background px-6 py-12 pb-28 font-sans antialiased sm:py-24">
      <div aria-hidden="true" className="hero-glow" />
      <div className="relative flex flex-col space-y-10">
        <section className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <div className="space-y-1.5">
            <h1 className="title text-lg font-medium">This site is not set up yet</h1>
            <p className="text-pretty text-sm text-foreground/80">
              Don&apos;t worry, nothing is broken. A fresh copy starts without a database or
              content, so there is nothing to show here yet. Run the steps below in a second
              terminal and refresh this page after each one. Your site will appear here when you
              finish.
            </p>
            <p className="text-pretty text-xs text-muted-foreground">
              Only the dev server shows this page. Visitors to a deployed site never see it.
            </p>
          </div>
        </section>

        <section>
          <h2 className="title mb-4 text-xl font-medium">Set up the site</h2>
          <ol className="space-y-5">
            {STEPS.map((step, index) => {
              const done = index < current;
              const active = index === current;
              return (
                <li key={step.stage} className="flex gap-3">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                      done && 'border-transparent bg-emerald-500/15',
                      done && 'text-emerald-600 dark:text-emerald-400',
                      active && 'border-transparent bg-amber-500/15',
                      active && 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-label="Done" /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        'flex min-h-6 flex-wrap items-center gap-x-2 text-sm font-medium',
                        done && 'text-muted-foreground',
                      )}
                    >
                      {step.title}
                      {active && (
                        <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                          Do this next
                        </span>
                      )}
                    </h3>
                    {!done && (
                      <>
                        <p className="mt-0.5 text-pretty text-sm text-muted-foreground">
                          {step.detail}
                        </p>
                        <Command>{step.command}</Command>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2 className="title mb-2 text-xl font-medium">Then make it yours</h2>
          <p className="mb-4 text-pretty text-sm text-muted-foreground">
            Your name, menu, posts and every piece of text are edited from a private dashboard. This
            page goes away after the steps above, so set the dashboard up with these:
          </p>
          <ol className="list-decimal space-y-3 pl-5 text-pretty text-sm text-foreground/80 marker:text-muted-foreground">
            <li>
              In <Code>.env</Code>, fill in <Code>ADMIN_PATH</Code> (the secret address of your
              dashboard), <Code>ADMIN_EMAIL</Code>, <Code>ADMIN_PASSWORD</Code> and{' '}
              <Code>BETTER_AUTH_SECRET</Code>. Create the secret with:
              <Command>openssl rand -base64 48</Command>
            </li>
            <li>
              Create your account:
              <Command>bun run admin:create</Command>
            </li>
            <li>
              Open <Code>http://localhost:3000/&lt;ADMIN_PATH&gt;</Code>, sign in, and edit{' '}
              <strong className="font-medium">Site Profile</strong> and{' '}
              <strong className="font-medium">Site Text</strong>.
            </li>
          </ol>
          <p className="mt-4 text-pretty text-xs text-muted-foreground">
            Email, the music page and every other option are explained under Configuration in{' '}
            <Code>README.md</Code>.
          </p>
        </section>
      </div>
    </main>
  );
}
