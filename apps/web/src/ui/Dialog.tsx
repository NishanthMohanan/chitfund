import { Close } from '@carbon/icons-react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from './IconButton';
import { cn } from './cn';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Action buttons; the primary action goes last. */
  footer?: ReactNode;
  children?: ReactNode;
};

export const overlayClasses = 'fixed inset-0 z-40 bg-scrim animate-fade-in';

export function Dialog({ open, onOpenChange, title, description, footer, children }: DialogProps) {
  const { t } = useTranslation();

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClasses} />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-lg border border-border bg-surface shadow-overlay animate-fade-in',
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <DialogHeader title={title} description={description} closeLabel={t('actions.close')} />
          {children && <div className="overflow-y-auto px-4 pb-4 lg:px-6">{children}</div>}
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end lg:px-6">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function DialogHeader({
  title,
  description,
  closeLabel,
}: {
  title: string;
  description?: string;
  closeLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4 lg:px-6">
      <div className="min-w-0 pt-2">
        <RadixDialog.Title className="text-h3 font-semibold text-text">{title}</RadixDialog.Title>
        {description && (
          <RadixDialog.Description className="mt-1 text-body-sm text-text-secondary">
            {description}
          </RadixDialog.Description>
        )}
      </div>
      <RadixDialog.Close asChild>
        <IconButton icon={Close} label={closeLabel} className="-mr-2" />
      </RadixDialog.Close>
    </div>
  );
}
