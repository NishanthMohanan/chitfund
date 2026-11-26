import { Add, UserMultiple } from '@carbon/icons-react';
import { type GroupStatus } from '@chitfund/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../app/page-title';
import { type GroupListItem, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { DateText } from '../../ui/DateText';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { type Column } from '../../ui/ResponsiveTable';
import { Select } from '../../ui/Select';
import { PagedTable } from '../common/PagedTable';
import { GroupStatusTag } from '../common/shared';
import { CreateGroupDialog } from './group-dialogs';

const STATUSES: readonly GroupStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export function GroupsPage() {
  const { t } = useTranslation();
  const title = usePageTitle();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const query = usePagedQuery(
    ['groups', { search, status }],
    (p, pageSize, signal) => chitApi.groups({ page: p, pageSize, search, status }, signal),
    page,
  );

  const columns: Column<GroupListItem>[] = [
    {
      key: 'name',
      header: t('form.name'),
      primary: true,
      cell: (group) => (
        <span>
          {group.name}{' '}
          <span className="font-mono text-caption text-text-secondary">{group.code}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: t('form.status'),
      cell: (group) => <GroupStatusTag status={group.status} />,
    },
    {
      key: 'chitValue',
      header: t('plans.chitValue'),
      align: 'end',
      cell: (group) => <Amount value={group.chitValue} />,
    },
    {
      key: 'tickets',
      header: t('groups.ticketsFilled'),
      align: 'end',
      cell: (group) => (
        <span className="tabular">
          {group.filledTickets}/{group.memberCount}
        </span>
      ),
    },
    {
      key: 'payouts',
      header: t('groups.payoutsDone'),
      align: 'end',
      cell: (group) => (
        <span className="tabular">
          {group.payoutsDone}/{group.durationMonths - 1}
        </span>
      ),
    },
    {
      key: 'dates',
      header: t('groups.runs'),
      hideOnMobile: true,
      cell: (group) => (
        <span className="text-text-secondary">
          <DateText value={group.startDate} />
          {group.endDate && (
            <>
              {' – '}
              <DateText value={group.endDate} />
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={t('groups.description')}
        actions={
          <Button icon={Add} requiresNetwork onClick={() => setCreating(true)}>
            {t('groups.add')}
          </Button>
        }
      />
      <PagedTable
        query={query}
        caption={title}
        columns={columns}
        getRowKey={(group) => group.id}
        onRowClick={(group) => navigate(`/groups/${group.id}`)}
        onPageChange={setPage}
        emptyIcon={UserMultiple}
        emptyMessage={search || status ? t('groups.noMatch') : t('groups.empty')}
        toolbar={
          <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('groups.search')}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Select
              label={t('form.status')}
              value={status}
              options={[
                { value: '', label: t('groups.allStatuses') },
                ...STATUSES.map((value) => ({ value, label: t(`groupStatus.${value}`) })),
              ]}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            />
          </div>
        }
      />
      {creating && (
        <CreateGroupDialog
          open
          onOpenChange={setCreating}
          onCreated={(id) => navigate(`/groups/${id}`)}
        />
      )}
    </>
  );
}
