import { CheckmarkFilled } from '@carbon/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../app/page-title';
import { type DueRow, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { DateText } from '../../ui/DateText';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { type Column } from '../../ui/ResponsiveTable';
import { Select } from '../../ui/Select';
import { PagedTable } from '../common/PagedTable';
import { useGroupOptions } from '../common/option-hooks';
import { MemberLink } from '../common/shared';
import { type PresetTicket, RecordPaymentDialog } from '../payments/RecordPaymentDialog';

export function DuesPage() {
  const { t } = useTranslation();
  const title = usePageTitle();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [groupId, setGroupId] = useState('');
  const [filter, setFilter] = useState<'unpaid' | 'all'>('unpaid');
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<PresetTicket | null>(null);
  const groupOptions = useGroupOptions();
  const query = usePagedQuery(
    ['dues', { groupId, filter, search }],
    (p, pageSize, signal) => chitApi.dues({ page: p, pageSize, groupId, filter, search }, signal),
    page,
  );

  const columns: Column<DueRow>[] = [
    {
      key: 'member',
      header: t('form.member'),
      primary: true,
      cell: (row) => <MemberLink member={row.member} withPhone />,
    },
    {
      key: 'ticket',
      header: t('form.ticket'),
      cell: (row) => `${row.group.code} · ${t('tickets.number', { number: row.ticketNumber })}`,
    },
    {
      key: 'behind',
      header: t('dues.monthsBehind'),
      align: 'end',
      cell: (row) => <span className="tabular">{row.monthsBehind}</span>,
    },
    {
      key: 'since',
      header: t('dues.oldestUnpaid'),
      hideOnMobile: true,
      cell: (row) =>
        row.oldestUnpaidDueDate && row.outstanding !== '0' ? (
          <DateText value={row.oldestUnpaidDueDate} />
        ) : (
          '—'
        ),
    },
    {
      key: 'outstanding',
      header: t('tickets.outstanding'),
      align: 'end',
      cell: (row) => (
        <span className={row.outstanding !== '0' ? 'text-danger' : undefined}>
          <Amount value={row.outstanding} />
        </span>
      ),
    },
    {
      key: 'advance',
      header: t('tickets.advance'),
      align: 'end',
      hideOnMobile: true,
      cell: (row) => <Amount value={row.advance} />,
    },
    {
      key: 'actions',
      header: t('form.actions'),
      align: 'end',
      cell: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            setPaying({
              ticketId: row.ticketId,
              groupId: row.group.id,
              label: `${row.group.name} · ${t('tickets.seatLabel', {
                number: row.ticketNumber,
                name: row.member?.name ?? t('tickets.vacant'),
              })}`,
              suggestedPaise: row.outstanding,
            });
          }}
        >
          {t('payments.record')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={title} description={t('dues.description')} />
      <PagedTable
        query={query}
        caption={title}
        columns={columns}
        getRowKey={(row) => row.ticketId}
        onRowClick={(row) => navigate(`/groups/${row.group.id}/tickets/${row.ticketId}`)}
        onPageChange={setPage}
        emptyIcon={CheckmarkFilled}
        emptyMessage={filter === 'unpaid' ? t('dues.empty') : t('dues.emptyAll')}
        toolbar={
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={t('form.searchMembers')}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Select
              label={t('form.group')}
              value={groupId}
              options={[{ value: '', label: t('form.allGroups') }, ...groupOptions.slice(1)]}
              onChange={(event) => {
                setGroupId(event.target.value);
                setPage(1);
              }}
            />
            <Select
              label={t('dues.show')}
              value={filter}
              options={[
                { value: 'unpaid', label: t('dues.unpaidOnly') },
                { value: 'all', label: t('dues.allTickets') },
              ]}
              onChange={(event) => {
                setFilter(event.target.value === 'all' ? 'all' : 'unpaid');
                setPage(1);
              }}
            />
          </div>
        }
      />
      {paying && (
        <RecordPaymentDialog
          key={paying.ticketId}
          open
          onOpenChange={(next) => !next && setPaying(null)}
          preset={paying}
        />
      )}
    </>
  );
}
