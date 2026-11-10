import { Skeleton } from '@/components/ui/skeleton';

const PROGRESS_SEGMENTS = ['compose', 'verify', 'sent'];

function FieldSkeleton({ controlClassName }: { controlClassName: string }) {
  return (
    <div className="min-w-0">
      <Skeleton className="mb-1.5 h-5 w-20" />
      <Skeleton className={controlClassName} />
    </div>
  );
}

export function ContactFormSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="relative overflow-hidden rounded-2xl border bg-card/60 p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.6)] backdrop-blur sm:p-8"
    >
      <div className="mb-7 flex gap-1.5">
        {PROGRESS_SEGMENTS.map((segment) => (
          <Skeleton key={segment} className="h-1 flex-1 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton controlClassName="h-11 rounded-xl" />
          <FieldSkeleton controlClassName="h-11 rounded-xl" />
        </div>
        <FieldSkeleton controlClassName="h-36 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </section>
  );
}
