import { cn } from './cn';

/** Shared look for text inputs, selects and textareas. */
export function controlClasses(invalid: boolean): string {
  return cn(
    'h-11 w-full rounded-sm border bg-surface px-3 text-body text-text placeholder:text-text-muted',
    'transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:bg-surface-muted',
    invalid ? 'border-danger' : 'border-border-strong hover:border-text-secondary',
  );
}
