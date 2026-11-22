import { type ReactNode } from 'react';

export type DescriptionItem = { term: string; description: ReactNode };

/** Label and value pairs. Values sit on the right so amounts line up on phones. */
export function DescriptionList({ items }: { items: readonly DescriptionItem[] }) {
  return (
    <dl className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.term} className="flex items-start justify-between gap-4 py-3">
          <dt className="text-body-sm text-text-secondary">{item.term}</dt>
          <dd className="text-right text-body text-text">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
