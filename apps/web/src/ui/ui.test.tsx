import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockDesktop } from '../test/utils';
import { Amount } from './Amount';
import { initialsFor } from './initials';
import { Button } from './Button';
import { DateText } from './DateText';
import { LoadMore, Pagination } from './Pagination';
import { PasswordInput } from './PasswordInput';
import { ResponsiveTable } from './ResponsiveTable';
import { StatusTag } from './StatusTag';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Amount', () => {
  it('formats paise with Indian grouping in tabular mono figures', () => {
    render(<Amount value={10_000_000n} />);
    const amount = screen.getByText('₹1,00,000');
    expect(amount).toHaveClass('font-mono', 'tabular');
  });

  it('accepts the string paise the API sends', () => {
    render(<Amount value="850050" />);
    expect(screen.getByText('₹8,500.50')).toBeInTheDocument();
  });
});

describe('DateText', () => {
  it('renders the India date with a machine-readable value', () => {
    render(<DateText value="2026-08-14T20:00:00Z" />);
    const time = screen.getByText('15 Aug 2026');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-08-14T20:00:00.000Z');
  });
});

describe('StatusTag', () => {
  it.each([
    ['PAID', 'Paid'],
    ['DUE', 'Due'],
    ['OVERDUE', 'Overdue'],
    ['REVERSED', 'Reversed'],
  ] as const)('labels %s with text and an icon', (status, label) => {
    render(<StatusTag status={status} />);
    const tag = screen.getByText(label);
    expect(tag.querySelector('svg')).not.toBeNull();
  });
});

describe('Avatar initials', () => {
  it.each([
    ['Arun Kumar', 'AK'],
    ['meena', 'M'],
    ['  Ravi  P  Shankar ', 'RS'],
  ])('%s -> %s', (name, initials) => {
    expect(initialsFor(name)).toBe(initials);
  });
});

describe('Button', () => {
  it('shows the pending label and blocks repeat presses', () => {
    render(
      <Button pending pendingLabel="Saving">
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('disables server actions while offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<Button requiresNetwork>Mark as paid</Button>);
    expect(screen.getByRole('button', { name: 'Mark as paid' })).toBeDisabled();
    vi.restoreAllMocks();
  });
});

describe('PasswordInput', () => {
  it('toggles visibility and links the error to the field', async () => {
    render(<PasswordInput label="Password" error="Use at least 10 characters" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Use at least 10 characters');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});

describe('Pagination', () => {
  it('summarises the range and pages through the server results', async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={20} total={45} totalPages={3} onPageChange={onPageChange} />,
    );

    expect(screen.getByText('21–40 of 45')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables moving past the ends', () => {
    render(<Pagination page={1} pageSize={20} total={5} totalPages={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('offers load more on phones until everything is shown', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <LoadMore shown={20} total={45} hasMore loading={false} onLoadMore={onLoadMore} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    rerender(
      <LoadMore shown={45} total={45} hasMore={false} loading={false} onLoadMore={onLoadMore} />,
    );
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(screen.getByText('Showing 45 of 45')).toBeInTheDocument();
  });
});

describe('ResponsiveTable', () => {
  type Row = { id: string; member: string; due: string };
  const rows: Row[] = [
    { id: '1', member: 'Arun Kumar', due: '₹8,500' },
    { id: '2', member: 'Meena S', due: '₹9,000' },
  ];
  const columns = [
    { key: 'member', header: 'Member', cell: (row: Row) => row.member, primary: true },
    { key: 'due', header: 'Due', cell: (row: Row) => row.due, align: 'end' as const },
  ];

  it('renders list rows with label and value pairs on phones', () => {
    render(
      <ResponsiveTable
        caption="Collections"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
      />,
    );

    expect(screen.queryByRole('table')).toBeNull();
    const list = screen.getByRole('list', { name: 'Collections' });
    const [first] = within(list).getAllByRole('listitem');
    expect(within(first as HTMLElement).getByText('Arun Kumar')).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText('Due')).toBeInTheDocument();
  });

  it('renders a table on desktop', async () => {
    mockDesktop();
    const onRowClick = vi.fn();
    render(
      <ResponsiveTable
        caption="Collections"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );

    const table = screen.getByRole('table', { name: 'Collections' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Member', 'Due']);
    await userEvent.click(within(table).getByRole('button', { name: 'Meena S' }));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
