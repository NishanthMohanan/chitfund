import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import './lib/i18n';
import { applyTheme, readThemePreference, resolveTheme } from './lib/theme';
import './styles/index.css';

// Apply the theme before the first render to avoid a flash of the wrong colours.
applyTheme(resolveTheme(readThemePreference()));

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
