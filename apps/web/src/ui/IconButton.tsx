import { type ButtonHTMLAttributes, type Ref } from 'react';
import { cn } from './cn';
import { ICON_SIZE, type IconComponent } from './icon';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconComponent;
  /** Accessible name; icon-only buttons must always have one. */
  label: string;
  variant?: 'ghost' | 'secondary';
  ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-text-secondary',
        'transition-colors duration-150 ease-out hover:bg-surface-muted hover:text-text',
        'disabled:cursor-not-allowed disabled:text-text-muted',
        variant === 'ghost' ? 'border-transparent' : 'border-border-strong bg-surface',
        className,
      )}
      {...props}
    >
      <Icon size={ICON_SIZE.standalone} aria-hidden />
    </button>
  );
}
