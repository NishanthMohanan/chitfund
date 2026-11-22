import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '../lib/i18n';
import { mockMatchMedia } from './utils';

afterEach(() => {
  cleanup();
  mockMatchMedia();
});

mockMatchMedia();
