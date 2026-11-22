import * as RadixTabs from '@radix-ui/react-tabs';
import { type ComponentProps } from 'react';
import { cn } from './cn';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        '-mx-4 flex overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        '-mb-px h-11 shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 text-body-sm font-medium text-text-secondary',
        'hover:text-text data-[state=active]:border-primary data-[state=active]:text-text',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn('pt-4', className)} {...props} />;
}
