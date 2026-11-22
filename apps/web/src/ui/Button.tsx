import { type ButtonHTMLAttributes, type Ref } from 'react';
import { useOnlineStatus } from '../lib/use-online-status';
import { type ButtonSize, type ButtonVariant, buttonClasses } from './button-classes';
import { cn } from './cn';
import { ICON_SIZE, type IconComponent } from './icon';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconComponent;
  fullWidth?: boolean;
  /** Shows `pendingLabel` and blocks repeat submissions while work is in flight. */
  pending?: boolean;
  pendingLabel?: string;
  /** Disables the button while the device is offline. */
  requiresNetwork?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth,
  pending = false,
  pendingLabel,
  requiresNetwork = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const online = useOnlineStatus();
  const unavailable = requiresNetwork && !online;

  return (
    <button
      type={type}
      disabled={disabled || pending || unavailable}
      aria-busy={pending || undefined}
      className={cn(buttonClasses(variant, size, fullWidth), className)}
      {...props}
    >
      {Icon && <Icon size={ICON_SIZE.inline} aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
