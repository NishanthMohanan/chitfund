import { Add, Receipt } from '@carbon/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { type LedgerRow, type Payment, type TicketDetail, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { DateText } from '../../ui/DateText';
import { PageHeader } from '../../ui/PageHeader';
import { type Column, ResponsiveTable } from '../../ui/ResponsiveTable';
import { StatusTag } from '../../ui/StatusTag';
import { PagedTable } from '../common/PagedTable';
import { GroupStatusTag, MemberLink, QueryBoundary, Stat, StatGrid } from '../common/shared';
import { ReversePaymentDialog } from '../payments/PaymentsPage';
import { usePaymentColumns } from '../payments/payment-columns';
import { RecordPaymentDialog } from '../payments/RecordPaymentDialog';

export function TicketDetailPage() {
  const { groupId = '', ticketId = '' } = useParams();
  const query = useQuery({
    queryKey: ['groups', groupId, 'ticket', ticketId],
    queryFn: ({ signal }) => chitApi.ticket(groupId, ticketId, signal),
  });
  return <QueryBoundary query={query}>{(ticket) => <TicketView ticket={ticket} />}</QueryBoundary>;
}

function TicketView({ ticket }: { ticket: TicketDetail }) {
  const { t } = useTranslation();
  const [paying, setPaying] = useState(false);
  const [page, setPage] = useState(1);
  const [reversing, setReversing] = useState<Payment | null>(null);
  const payments = usePagedQuery(
    ['payments', { ticketId: ticket.id }],
    (p, pageSize, signal) => chitApi.payments({ page: p, pageSize, ticketId: ticket.id }, signal),
    page,
  );
  const paymentColumns = usePaymentColumns(setReversing).filter(
    (column) => column.key !== 'ticket',
  );
  const takesPayments = ticket.group.status === 'ACTIVE' || ticket.group.status === 'COMPLETED';
  const label = t('tickets.seatLabel', {
    number: ticket.ticketNumber,
    name: ticket.member?.name ?? t('tickets.vacant'),
  });

  const columns: Column<LedgerRow>[] = [
    {
      key: 'month',
      header: t('groups.month'),
      primary: true,
      cell: (row) => t('groups.monthNumber', { month: row.monthNumber }),
    },
    { key: 'due', header: t('groups.dueDate'), cell: (row) => <DateText value={row.dueDate} /> },
    {
      key: 'amount',
      header: t('tickets.installment'),
      align: 'end',
      cell: (row) => <Amount value={row.due} />,
    },
    {
      key: 'paid',
      header: t('tickets.paid'),
      align: 'end',
      cell: (row) => <Amount value={row.paid} />,
    },
    {
      key: 'balance',
      header: t('tickets.balance'),
      align: 'end',
      cell: (row) => <Amount value={row.balance} />,
    },
    { key: 'status', header: t('form.status'), cell: (row) => <StatusTag status={row.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={t('tickets.number', { number: ticket.ticketNumber })}
        description={t('tickets.detailDescription')}
        actions={
          takesPayments && (
            <Button icon={Add} requiresNetwork onClick={() => setPaying(true)}>
              {t('payments.record')}
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 text-body-sm text-text-secondary">
          <Link
            to={`/groups/${ticket.group.id}?tab=tickets`}
            className="font-medium text-primary hover:underline"
          >
            {ticket.group.name} ({ticket.group.code})
          </Link>
          <GroupStatusTag status={ticket.group.status} />
          <span className="flex items-center gap-1">
            {t('tickets.holder')} <MemberLink member={ticket.member} />
          </span>
        </div>
        <StatGrid>
          <Stat
            label={t('tickets.paid')}
            value={<Amount value={ticket.ledger.totalPaid} emphasis />}
          />
          <Stat
            label={t('tickets.outstanding')}
            value={<Amount value={ticket.ledger.outstanding} emphasis />}
            hint={
              ticket.ledger.oldestUnpaidMonth
                ? t('tickets.oldestUnpaid', { month: ticket.ledger.oldestUnpaidMonth })
                : undefined
            }
          />
          <Stat
            label={t('tickets.advance')}
            value={<Amount value={ticket.ledger.advance} emphasis />}
          />
          <Stat
            label={t('tickets.payout')}
            value={
              ticket.payout ? (
                <Amount value={ticket.payout.amount} emphasis />
              ) : (
                t('tickets.noPayout')
              )
            }
            hint={
              ticket.payout ? (
                <>
                  {t('groups.monthNumber', { month: ticket.payout.monthNumber })} ·{' '}
                  <DateText value={ticket.payout.paidOn} />
                </>
              ) : undefined
            }
          />
        </StatGrid>
        <Card flush title={t('tickets.ledger')} description={t('tickets.ledgerDescription')}>
          <ResponsiveTable
            caption={t('tickets.ledger')}
            columns={columns}
            rows={ticket.ledger.rows}
            getRowKey={(row) => String(row.monthNumber)}
          />
        </Card>
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
      {paying && (
        <RecordPaymentDialog
          open
          onOpenChange={setPaying}
          preset={{
            ticketId: ticket.id,
            groupId: ticket.group.id,
            label,
            suggestedPaise: ticket.ledger.outstanding,
          }}
        />
      )}
      <ReversePaymentDialog payment={reversing} onClose={() => setReversing(null)} />
    </>
  );
}
