import * as RadixDialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { DialogHeader, type DialogProps, overlayClasses } from './Dialog';
import { cn } from './cn';

/**
 * Slides up from the bottom on phones, within thumb reach. From 1024px it
 * becomes a centred dialog.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: DialogProps) {
  const { t } = useTranslation();

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClasses} />
        <RadixDialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-lg border-t border-border bg-surface shadow-overlay animate-sheet-in',
            'lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg lg:border lg:animate-fade-in',
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 rounded-sm bg-border-strong lg:hidden"
          />
          <DialogHeader title={title} description={description} closeLabel={t('actions.close')} />
          {children && <div className="overflow-y-auto px-4 pb-4 lg:px-6">{children}</div>}
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:flex-row lg:justify-end lg:px-6 lg:pb-3">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
