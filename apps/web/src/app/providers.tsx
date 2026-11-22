import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { createQueryClient } from '../lib/query-client';
import { ToastProvider } from '../ui/Toast';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
