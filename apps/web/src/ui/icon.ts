import { type ComponentType } from 'react';

/** One icon family (Carbon) and one size scale: 16 inline with text, 20 standalone. */
export const ICON_SIZE = { inline: 16, standalone: 20 } as const;

export type IconComponent = ComponentType<{
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}>;
