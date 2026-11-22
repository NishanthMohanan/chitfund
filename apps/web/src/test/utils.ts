import { vi } from 'vitest';

/** jsdom has no matchMedia; tests choose which queries match. */
export function mockMatchMedia(matches: (query: string) => boolean = () => false): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

export function mockDesktop(): void {
  mockMatchMedia((query) => query === '(min-width: 1024px)');
}
