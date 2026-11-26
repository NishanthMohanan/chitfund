import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { type Payment } from '../../lib/chit-api';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { DateText } from '../../ui/DateText';
import { type Column } from '../../ui/ResponsiveTable';
import { ReversedTag } from '../common/shared';

/** Payment columns shared by the payments page, ticket and member records. */
export function usePaymentColumns(onReverse: (payment: Payment) => void): Column<Payment>[] {
  const { t } = useTranslation();
  return [
    {
      key: 'paidOn',
      header: t('form.paidOn'),
      cell: (payment) => <DateText value={payment.paidOn} />,
    },
    {
      key: 'member',
      header: t('form.member'),
      primary: true,
      cell: (payment) => (
        <Link
          to={`/members/${payment.payer.id}`}
          className="font-medium text-primary hover:underline"
        >
          {payment.payer.name}
        </Link>
      ),
    },
    {
      key: 'ticket',
      header: t('form.ticket'),
      cell: (payment) => (
        <Link
          to={`/groups/${payment.ticket.group.id}/tickets/${payment.ticket.id}`}
          className="text-primary hover:underline"
        >
          {payment.ticket.group.code} ·{' '}
          {t('tickets.number', { number: payment.ticket.ticketNumber })}
        </Link>
      ),
    },
    { key: 'mode', header: t('form.mode'), cell: (payment) => payment.mode.name },
    {
      key: 'reference',
      header: t('form.reference'),
      hideOnMobile: true,
      cell: (payment) => payment.reference ?? '',
    },
    {
      key: 'amount',
      header: t('form.amount'),
      align: 'end',
      cell: (payment) => (
        <span className={payment.reversedAt ? 'text-text-secondary line-through' : undefined}>
          <Amount value={payment.amount} />
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('form.status'),
      align: 'end',
      cell: (payment) =>
        payment.reversedAt ? (
          <span title={payment.reversalReason ?? undefined}>
            <ReversedTag />
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onReverse(payment)}>
            {t('payments.reverse')}
          </Button>
        ),
    },
  ];
}
