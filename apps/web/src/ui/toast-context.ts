import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'success' | 'danger';

export type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** e.g. Undo after marking an installment paid. */
  action?: { label: string; altText: string; onAction: () => void };
  durationMs?: number;
};

export const DEFAULT_TOAST_MS = 5_000;
export const UNDO_TOAST_MS = 10_000;

export const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

export function useToast(): (options: ToastOptions) => void {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return show;
}
