import {
  CheckmarkFilled,
  ErrorFilled,
  InformationFilled,
  WarningAltFilled,
} from '@carbon/icons-react';
import { type ReactNode } from 'react';
import { cn } from './cn';
import { ICON_SIZE, type IconComponent } from './icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { classes: string; icon: IconComponent }> = {
  info: { classes: 'border-info bg-info-subtle', icon: InformationFilled },
  success: { classes: 'border-success bg-success-subtle', icon: CheckmarkFilled },
  warning: { classes: 'border-warning bg-warning-subtle', icon: WarningAltFilled },
  danger: { classes: 'border-danger bg-danger-subtle', icon: ErrorFilled },
};

const ICON_COLORS: Record<AlertTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export type InlineAlertProps = {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function InlineAlert({ tone = 'info', title, children, action }: InlineAlertProps) {
  const { classes, icon: Icon } = TONES[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border-l-4 border-y border-r px-4 py-3', classes)}
    >
      <Icon
        size={ICON_SIZE.standalone}
        aria-hidden
        className={cn('mt-0.5 shrink-0', ICON_COLORS[tone])}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="text-body font-semibold text-text">{title}</p>}
        <div className="text-body-sm text-text">{children}</div>
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
