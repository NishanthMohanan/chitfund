import { render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { mockDesktop } from '../test/utils';
import { AppProviders } from './providers';
import { routes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe('app routes', () => {
  it('sends the root to sign-in', () => {
    const router = renderAt('/');
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows the member tabs on phones', () => {
    renderAt('/m/payments');
    const nav = screen
      .getAllByRole('navigation', { name: 'Main navigation' })
      .at(-1) as HTMLElement;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Groups', 'Payments', 'Notifications', 'Profile']);
    expect(within(nav).getByRole('link', { name: 'Payments' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
    expect(document.title).toBe('Payments · ChitFund');
  });

  it('shows the organizer tabs', () => {
    renderAt('/o');
    const nav = screen
      .getAllByRole('navigation', { name: 'Main navigation' })
      .at(-1) as HTMLElement;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dashboard', 'Groups', 'Members', 'Collections', 'More']);
  });

  it('renders the admin area with a sidebar on desktop', () => {
    mockDesktop();
    renderAt('/admin/activity');
    expect(screen.getByRole('heading', { level: 1, name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByText('Superadmin')).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths', () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
