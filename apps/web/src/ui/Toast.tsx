import { CheckmarkFilled, Close, ErrorFilled, InformationFilled } from '@carbon/icons-react';
import * as RadixToast from '@radix-ui/react-toast';
import { type ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';
import { ICON_SIZE, type IconComponent } from './icon';
import { DEFAULT_TOAST_MS, ToastContext, type ToastOptions, type ToastTone } from './toast-context';

type ToastEntry = ToastOptions & { id: number };

const ICONS: Record<ToastTone, { icon: IconComponent; color: string }> = {
  info: { icon: InformationFilled, color: 'text-info' },
  success: { icon: CheckmarkFilled, color: 'text-success' },
  danger: { icon: ErrorFilled, color: 'text-danger' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((options: ToastOptions) => {
    setToasts((current) => [...current, { ...options, id: Date.now() + Math.random() }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      <RadixToast.Provider swipeDirection="down" duration={DEFAULT_TOAST_MS}>
        {children}
        {toasts.map((toast) => {
          const { icon: Icon, color } = ICONS[toast.tone ?? 'info'];
          return (
            <RadixToast.Root
              key={toast.id}
              duration={toast.durationMs}
              onOpenChange={(open) => !open && dismiss(toast.id)}
              className="flex items-start gap-3 rounded-md border border-border bg-surface p-3 shadow-overlay animate-toast-in"
            >
              <Icon
                size={ICON_SIZE.standalone}
                aria-hidden
                className={cn('mt-0.5 shrink-0', color)}
              />
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-body font-medium text-text">
                  {toast.title}
                </RadixToast.Title>
                {toast.description && (
                  <RadixToast.Description className="text-body-sm text-text-secondary">
                    {toast.description}
                  </RadixToast.Description>
                )}
              </div>
              {toast.action && (
                <RadixToast.Action
                  altText={toast.action.altText}
                  onClick={toast.action.onAction}
                  className="h-11 shrink-0 rounded-md px-3 text-body-sm font-medium text-primary hover:bg-primary-subtle lg:h-9"
                >
                  {toast.action.label}
                </RadixToast.Action>
              )}
              <RadixToast.Close
                aria-label={t('actions.close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-muted lg:h-9 lg:w-9"
              >
                <Close size={ICON_SIZE.inline} aria-hidden />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        {/* Sits above the bottom tab bar on phones. */}
        <RadixToast.Viewport className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 outline-none lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
