import { type ReactNode } from 'react';
import { cn } from './cn';
import { ICON_SIZE, type IconComponent } from './icon';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-muted text-text-secondary',
  info: 'border-transparent bg-info-subtle text-info',
  success: 'border-transparent bg-success-subtle text-success',
  warning: 'border-transparent bg-warning-subtle text-warning',
  danger: 'border-transparent bg-danger-subtle text-danger',
};

export type BadgeProps = {
  tone?: BadgeTone;
  icon?: IconComponent;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = 'neutral', icon: Icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm border px-2 text-caption font-medium',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon size={ICON_SIZE.inline} aria-hidden />}
      {children}
    </span>
  );
}
