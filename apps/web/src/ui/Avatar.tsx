import { cn } from './cn';
import { initialsFor } from './initials';

/** Initials only. Decorative, so the name must also appear as text nearby. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-primary-subtle font-semibold text-primary',
        size === 'sm' ? 'h-8 w-8 text-caption' : 'h-10 w-10 text-body-sm',
      )}
    >
      {initialsFor(name)}
    </span>
  );
}
