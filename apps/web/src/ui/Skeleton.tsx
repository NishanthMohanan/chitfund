import { cn } from './cn';

/**
 * Static placeholder blocks shaped like the content that will replace them.
 * The surrounding region should set aria-busy while loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-sm bg-surface-muted', className)} />;
}

export function SkeletonListRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 px-4 py-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
