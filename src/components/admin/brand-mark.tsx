import { cn } from '@/lib/utils';

export function BrandMark({
  name,
  logo,
  className,
}: {
  name: string;
  logo: string;
  className?: string;
}) {
  if (logo) {
    return <img src={logo} alt="" className={cn('rounded-md object-cover', className)} />;
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-primary font-bold text-primary-foreground',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
