import { Money, UserMultiple } from '@carbon/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/page-title';
import { type Dashboard, chitApi } from '../../lib/chit-api';
import { Amount } from '../../ui/Amount';
import { buttonClasses } from '../../ui/button-classes';
import { Card } from '../../ui/Card';
import { DateText } from '../../ui/DateText';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { type Column, ResponsiveTable } from '../../ui/ResponsiveTable';
import { QueryBoundary, Stat, StatGrid } from '../common/shared';

export function DashboardPage() {
  const title = usePageTitle();
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => chitApi.dashboard(signal),
  });

  return (
    <>
      <PageHeader title={title} description={t('dashboard.description')} />
      <QueryBoundary query={query}>{(data) => <DashboardView data={data} />}</QueryBoundary>
    </>
  );
}

type PendingPayout = Dashboard['payoutsPending'][number];
type EndingGroup = Dashboard['endingSoon'][number];

function DashboardView({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const month = data.thisMonth;

  const payoutColumns: Column<PendingPayout>[] = [
    { key: 'group', header: t('form.group'), primary: true, cell: (row) => row.groupName },
    {
      key: 'month',
      header: t('groups.month'),
      cell: (row) => t('groups.monthNumber', { month: row.monthNumber }),
    },
    { key: 'due', header: t('groups.dueDate'), cell: (row) => <DateText value={row.dueDate} /> },
    {
      key: 'amount',
      header: t('payouts.scheduled'),
      align: 'end',
      cell: (row) => <Amount value={row.payoutAmount} />,
    },
  ];
  const endingColumns: Column<EndingGroup>[] = [
    {
      key: 'name',
      header: t('form.group'),
      primary: true,
      cell: (row) => `${row.name} (${row.code})`,
    },
    { key: 'end', header: t('groups.endsOn'), cell: (row) => <DateText value={row.endDate} /> },
    {
      key: 'left',
      header: t('dashboard.monthsLeft'),
      align: 'end',
      cell: (row) => <span className="tabular">{row.monthsLeft}</span>,
    },
  ];

  if (data.activeGroups === 0 && data.draftGroups === 0) {
    return (
      <Card flush>
        <EmptyState
          icon={UserMultiple}
          message={t('dashboard.empty')}
          action={
            <Link to="/groups" className={buttonClasses('primary', 'md')}>
              {t('dashboard.goToGroups')}
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="this-month" className="flex flex-col gap-3">
        <h2 id="this-month" className="text-subheading font-semibold text-text">
          {month.label}
        </h2>
        <StatGrid>
          <Stat
            label={t('dashboard.expected')}
            value={<Amount value={month.expected} emphasis />}
          />
          <Stat
            label={t('dashboard.receivedForMonth')}
            value={<Amount value={month.receivedForMonth} emphasis />}
            hint={t('dashboard.ticketsPaid', { paid: month.ticketsPaid, total: month.ticketsDue })}
          />
          <Stat
            label={t('dashboard.collected')}
            value={<Amount value={month.collected} emphasis />}
            hint={t('dashboard.collectedHint')}
          />
          <Stat
            label={t('dashboard.outstanding')}
            value={<Amount value={data.outstanding} emphasis />}
            hint={
              <Link to="/dues" className="text-primary hover:underline">
                {t('dashboard.defaulters', { count: data.defaulters })}
              </Link>
            }
          />
        </StatGrid>
      </section>
      <StatGrid>
        <Stat label={t('dashboard.activeGroups')} value={data.activeGroups} />
        <Stat label={t('dashboard.draftGroups')} value={data.draftGroups} />
        <Stat label={t('dashboard.members')} value={data.memberCount} />
        <Stat label={t('dashboard.advance')} value={<Amount value={data.advance} emphasis />} />
      </StatGrid>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card
          flush
          title={t('dashboard.payoutsPending')}
          description={t('dashboard.payoutsPendingHint')}
        >
          {data.payoutsPending.length === 0 ? (
            <EmptyState icon={Money} message={t('dashboard.noPayoutsPending')} />
          ) : (
            <ResponsiveTable
              caption={t('dashboard.payoutsPending')}
              columns={payoutColumns}
              rows={data.payoutsPending}
              getRowKey={(row) => `${row.groupId}-${row.monthNumber}`}
              onRowClick={(row) => navigate(`/groups/${row.groupId}`)}
            />
          )}
        </Card>
        <Card flush title={t('dashboard.endingSoon')}>
          {data.endingSoon.length === 0 ? (
            <EmptyState icon={UserMultiple} message={t('dashboard.noneEnding')} />
          ) : (
            <ResponsiveTable
              caption={t('dashboard.endingSoon')}
              columns={endingColumns}
              rows={data.endingSoon}
              getRowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/groups/${row.id}`)}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
