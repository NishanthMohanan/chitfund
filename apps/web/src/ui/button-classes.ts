import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover',
  secondary: 'border-border-strong bg-surface text-text hover:bg-surface-muted',
  ghost: 'border-transparent bg-transparent text-text hover:bg-surface-muted',
  danger: 'border-danger bg-danger text-on-danger hover:border-danger-hover hover:bg-danger-hover',
};

// "sm" is only compact on desktop; on touch screens every target stays 44px tall.
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-3 text-body-sm lg:h-9',
  md: 'h-11 px-4 text-body',
};

/** Button styling, also used for links that look like buttons. */
export function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth = false): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-md border font-medium',
    'transition-colors duration-150 ease-out',
    'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-text-muted',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
  );
}
