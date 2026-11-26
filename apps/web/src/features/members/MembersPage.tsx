import { Add, Events } from '@carbon/icons-react';
import { maskPhone } from '@chitfund/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../app/page-title';
import { type MemberListItem, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Button } from '../../ui/Button';
import { DateText } from '../../ui/DateText';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { type Column } from '../../ui/ResponsiveTable';
import { PagedTable } from '../common/PagedTable';
import { MemberFormDialog } from './MemberFormDialog';

export function MembersPage() {
  const { t } = useTranslation();
  const title = usePageTitle();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const query = usePagedQuery(
    ['members', { search }],
    (p, pageSize, signal) => chitApi.members({ page: p, pageSize, search }, signal),
    page,
  );

  const columns: Column<MemberListItem>[] = [
    { key: 'name', header: t('form.name'), primary: true, cell: (member) => member.name },
    {
      key: 'phone',
      header: t('form.phoneLabel'),
      cell: (member) => <span className="font-mono tabular">{maskPhone(member.phone)}</span>,
    },
    {
      key: 'tickets',
      header: t('members.tickets'),
      align: 'end',
      cell: (member) => <span className="tabular">{member.ticketCount}</span>,
    },
    {
      key: 'createdAt',
      header: t('members.addedOn'),
      hideOnMobile: true,
      cell: (member) => <DateText value={member.createdAt} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={t('members.description')}
        actions={
          <Button icon={Add} requiresNetwork onClick={() => setAdding(true)}>
            {t('members.add')}
          </Button>
        }
      />
      <PagedTable
        query={query}
        caption={title}
        columns={columns}
        getRowKey={(member) => member.id}
        onRowClick={(member) => navigate(`/members/${member.id}`)}
        onPageChange={setPage}
        emptyIcon={Events}
        emptyMessage={search ? t('members.noMatch') : t('members.empty')}
        toolbar={
          <div className="max-w-sm">
            <Input
              label={t('form.searchMembers')}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        }
      />
      {adding && (
        <MemberFormDialog
          open
          onOpenChange={setAdding}
          onSaved={(member) => navigate(`/members/${member.id}`)}
        />
      )}
    </>
  );
}
