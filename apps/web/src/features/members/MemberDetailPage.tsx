import { Edit, Receipt, UserMultiple } from '@carbon/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { type MemberTicket, type Payment, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Amount } from '../../ui/Amount';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { DateText } from '../../ui/DateText';
import { DescriptionList } from '../../ui/DescriptionList';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { type Column, ResponsiveTable } from '../../ui/ResponsiveTable';
import { PagedTable } from '../common/PagedTable';
import { GroupStatusTag, QueryBoundary, Stat, StatGrid } from '../common/shared';
import { ReversePaymentDialog } from '../payments/PaymentsPage';
import { usePaymentColumns } from '../payments/payment-columns';
import { MemberFormDialog } from './MemberFormDialog';

export function MemberDetailPage() {
  const { memberId = '' } = useParams();
  const query = useQuery({
    queryKey: ['members', memberId],
    queryFn: ({ signal }) => chitApi.member(memberId, signal),
  });
  return <QueryBoundary query={query}>{(member) => <MemberView member={member} />}</QueryBoundary>;
}

function MemberView({ member }: { member: Awaited<ReturnType<typeof chitApi.member>> }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [reversing, setReversing] = useState<Payment | null>(null);
  const payments = usePagedQuery(
    ['payments', { memberId: member.id }],
    (p, pageSize, signal) => chitApi.payments({ page: p, pageSize, memberId: member.id }, signal),
    page,
  );
  const paymentColumns = usePaymentColumns(setReversing).filter(
    (column) => column.key !== 'member',
  );
  const current = member.tickets.filter((ticket) => ticket.current);
  const outstanding = current.reduce((sum, ticket) => sum + BigInt(ticket.ledger.outstanding), 0n);
  const paid = member.tickets.reduce((sum, ticket) => sum + BigInt(ticket.ledger.totalPaid), 0n);

  const ticketColumns: Column<MemberTicket>[] = [
    {
      key: 'group',
      header: t('form.group'),
      primary: true,
      cell: (ticket) =>
        `${ticket.group.name} · ${t('tickets.number', { number: ticket.ticketNumber })}`,
    },
    {
      key: 'status',
      header: t('form.status'),
      cell: (ticket) => <GroupStatusTag status={ticket.group.status} />,
    },
    {
      key: 'holding',
      header: t('members.holding'),
      cell: (ticket) =>
        ticket.current ? (
          t('members.fromMonth', { month: ticket.fromMonth })
        ) : (
          <Badge>{t('members.leftTicket')}</Badge>
        ),
    },
    {
      key: 'paid',
      header: t('tickets.paid'),
      align: 'end',
      cell: (ticket) => <Amount value={ticket.ledger.totalPaid} />,
    },
    {
      key: 'outstanding',
      header: t('tickets.outstanding'),
      align: 'end',
      cell: (ticket) => <Amount value={ticket.ledger.outstanding} />,
    },
    {
      key: 'payout',
      header: t('tickets.payout'),
      align: 'end',
      cell: (ticket) =>
        ticket.payout ? (
          <span className="flex flex-col items-end">
            <Amount value={ticket.payout.amount} />
            <span className="text-caption text-text-secondary">
              {t('groups.monthNumber', { month: ticket.payout.monthNumber })}
            </span>
          </span>
        ) : (
          <span className="text-text-secondary">{t('tickets.noPayout')}</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={member.name}
        description={t('members.detailDescription')}
        actions={
          <Button variant="secondary" icon={Edit} onClick={() => setEditing(true)}>
            {t('actions.edit')}
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <StatGrid>
          <Stat label={t('members.currentTickets')} value={current.length} />
          <Stat label={t('members.totalPaid')} value={<Amount value={paid} emphasis />} />
          <Stat label={t('tickets.outstanding')} value={<Amount value={outstanding} emphasis />} />
        </StatGrid>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card title={t('members.details')} className="xl:col-span-1">
            <DescriptionList
              items={[
                {
                  term: t('form.phoneLabel'),
                  description: <span className="font-mono tabular">{member.phone}</span>,
                },
                { term: t('form.address'), description: member.address ?? '—' },
                {
                  term: t('form.idProof'),
                  description: member.idProofType
                    ? `${member.idProofType} ${member.idProofNumber ?? ''}`
                    : '—',
                },
                {
                  term: t('form.nominee'),
                  description: member.nomineeName
                    ? `${member.nomineeName}${member.nomineePhone ? ` · ${member.nomineePhone}` : ''}`
                    : '—',
                },
                { term: t('form.notes'), description: member.notes ?? '—' },
                { term: t('members.addedOn'), description: <DateText value={member.createdAt} /> },
              ]}
            />
          </Card>
          <Card flush title={t('members.ticketsTitle')} className="xl:col-span-2">
            {member.tickets.length === 0 ? (
              <EmptyState icon={UserMultiple} message={t('members.noTickets')} />
            ) : (
              <ResponsiveTable
                caption={t('members.ticketsTitle')}
                columns={ticketColumns}
                rows={member.tickets}
                getRowKey={(ticket) => `${ticket.ticketId}-${ticket.fromMonth}`}
                onRowClick={(ticket) =>
                  navigate(`/groups/${ticket.group.id}/tickets/${ticket.ticketId}`)
                }
              />
            )}
          </Card>
        </div>
        <PagedTable
          title={t('members.paymentsTitle')}
          query={payments}
          caption={t('members.paymentsTitle')}
          columns={paymentColumns}
          getRowKey={(payment) => payment.id}
          onPageChange={setPage}
          emptyIcon={Receipt}
          emptyMessage={t('payments.empty')}
        />
      </div>
      {editing && <MemberFormDialog open onOpenChange={setEditing} member={member} />}
      <ReversePaymentDialog payment={reversing} onClose={() => setReversing(null)} />
    </>
  );
}
