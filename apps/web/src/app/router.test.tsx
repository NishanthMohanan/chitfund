import { render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockDesktop } from '../test/utils';
import { AppProviders } from './providers';
import { routes } from './router';

type Reply = { status: number; body: unknown };

/** Answers API calls by path; anything unlisted is a 404. */
function mockApi(replies: Record<string, Reply>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const path = input.replace(/^\/api/, '').split('?')[0] ?? '';
      const reply = replies[path] ?? {
        status: 404,
        body: { statusCode: 404, code: 'NOT_FOUND', message: 'Not found' },
      };
      return Promise.resolve(
        new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );
}

const signedIn: Record<string, Reply> = {
  '/auth/me': {
    status: 200,
    body: { id: 'u1', name: 'Kannan', role: 'SUPERADMIN', lastLoginAt: null },
  },
  '/dashboard': {
    status: 200,
    body: {
      activeGroups: 1,
      draftGroups: 0,
      memberCount: 20,
      outstanding: '500000',
      advance: '0',
      defaulters: 2,
      thisMonth: {
        label: 'November 2026',
        expected: '5000000',
        receivedForMonth: '4500000',
        collected: '4500000',
        ticketsDue: 20,
        ticketsPaid: 18,
      },
      payoutsPending: [],
      endingSoon: [],
    },
  },
  '/members': { status: 200, body: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } },
};

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('app routes', () => {
  it('sends a signed-out visitor to sign-in', async () => {
    mockApi({
      '/auth/me': {
        status: 401,
        body: { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Sign in' },
      },
    });
    const router = renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('shows the organizer menu and dashboard totals on a laptop', async () => {
    mockDesktop();
    mockApi(signedIn);
    renderAt('/');
    expect(await screen.findByText('November 2026')).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0] as HTMLElement;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dashboard', 'Groups', 'Plans', 'Members', 'Payments', 'Dues', 'Settings']);
    expect(screen.getByText('2 members owe')).toBeInTheDocument();
    expect(screen.getByText('Kannan')).toBeInTheDocument();
    expect(document.title).toBe('Dashboard · ChitFund');
  });

  it('shows an empty member list with its next action', async () => {
    mockDesktop();
    mockApi(signedIn);
    renderAt('/members');
    expect(await screen.findByText('No members yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths', () => {
    renderAt('/nowhere/at/all');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
