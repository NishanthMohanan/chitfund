import { type ReactNode } from 'react';
import { ICON_SIZE, type IconComponent } from './icon';

export type EmptyStateProps = {
  icon: IconComponent;
  /** One plain sentence describing what will appear here. */
  message: string;
  /** At most one next action. */
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-8 lg:px-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted text-text-secondary">
        <Icon size={ICON_SIZE.standalone} aria-hidden />
      </span>
      <p className="text-body text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
