import { Edit, Receipt, UserMultiple } from '@carbon/icons-react';
import { type GroupStatus } from '@chitfund/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toIsoDay, todayIso } from '../../lib/form-helpers';
import {
  type CollectionRow,
  type GroupDetail,
  type GroupMonth,
  type TicketSeat,
  chitApi,
} from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Amount } from '../../ui/Amount';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { DateText } from '../../ui/DateText';
import { PageHeader } from '../../ui/PageHeader';
import { type Column, ResponsiveTable } from '../../ui/ResponsiveTable';
import { Select } from '../../ui/Select';
import { StatusTag } from '../../ui/StatusTag';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs';
import { PagedTable } from '../common/PagedTable';
import { GroupStatusTag, MemberLink, QueryBoundary, Stat, StatGrid } from '../common/shared';
import { type PresetTicket, RecordPaymentDialog } from '../payments/RecordPaymentDialog';
import {
  AssignTicketDialog,
  EditGroupDialog,
  EditMonthPayoutDialog,
  GroupStatusDialog,
  RecordPayoutDialog,
  ReplaceMemberDialog,
} from './group-dialogs';

const TABS = ['schedule', 'tickets', 'collection'] as const;
type Tab = (typeof TABS)[number];

export function GroupDetailPage() {
  const { groupId = '' } = useParams();
  const query = useQuery({
    queryKey: ['groups', groupId],
    queryFn: ({ signal }) => chitApi.group(groupId, signal),
  });
  return <QueryBoundary query={query}>{(group) => <GroupView group={group} />}</QueryBoundary>;
}

/** The month whose due date is the latest one that has arrived (1 before the plan starts). */
function currentMonthNumber(group: GroupDetail): number {
  const today = todayIso();
  return group.months.filter((month) => toIsoDay(month.dueDate) <= today).length || 1;
}

function GroupView({ group }: { group: GroupDetail }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '')
    ? (params.get('tab') as Tab)
    : 'schedule';
  const [editing, setEditing] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Exclude<GroupStatus, 'DRAFT'> | null>(null);
  const payoutsDone = group.months.filter((month) => month.payout).length;
  const paidOut = group.months.reduce(
    (sum, month) => sum + (month.payout ? BigInt(month.payout.amount) : 0n),
    0n,
  );

  return (
    <>
      <PageHeader
        title={group.name}
        description={t('groups.detailDescription', {
          code: group.code,
          members: group.memberCount,
          months: group.durationMonths,
        })}
        actions={
          <>
            <Button variant="secondary" icon={Edit} onClick={() => setEditing(true)}>
              {t('actions.edit')}
            </Button>
            {group.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => setStatusTarget('CANCELLED')}>
                  {t('groups.cancelGroup')}
                </Button>
                <Button onClick={() => setStatusTarget('ACTIVE')}>{t('groups.start')}</Button>
              </>
            )}
            {group.status === 'ACTIVE' && (
              <Button variant="secondary" onClick={() => setStatusTarget('COMPLETED')}>
                {t('groups.complete')}
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 text-body-sm text-text-secondary">
          <GroupStatusTag status={group.status} />
          <span>
            {t('groups.startsOn')} <DateText value={group.startDate} />
          </span>
          {group.endDate && (
            <span>
              {t('groups.endsOn')} <DateText value={group.endDate} />
            </span>
          )}
          <span>{t('groups.dueDayValue', { day: group.dueDayOfMonth })}</span>
        </div>
        <StatGrid>
          <Stat label={t('plans.chitValue')} value={<Amount value={group.chitValue} emphasis />} />
          <Stat
            label={t('plans.installment')}
            value={<Amount value={group.monthlyInstallment} emphasis />}
          />
          <Stat
            label={t('groups.ticketsFilled')}
            value={`${group.filledTickets}/${group.memberCount}`}
          />
          <Stat
            label={t('groups.payoutsDone')}
            value={`${payoutsDone}/${group.durationMonths - 1}`}
            hint={<Amount value={paidOut} />}
          />
        </StatGrid>
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
          <TabsList aria-label={t('groups.sections')}>
            <TabsTrigger value="schedule">{t('groups.tabs.schedule')}</TabsTrigger>
            <TabsTrigger value="tickets">{t('groups.tabs.tickets')}</TabsTrigger>
            <TabsTrigger value="collection" disabled={group.status === 'DRAFT'}>
              {t('groups.tabs.collection')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="schedule">
            <ScheduleTab group={group} />
          </TabsContent>
          <TabsContent value="tickets">
            <TicketsTab group={group} />
          </TabsContent>
          <TabsContent value="collection">
            {group.status !== 'DRAFT' && <CollectionTab group={group} />}
          </TabsContent>
        </Tabs>
      </div>
      {editing && <EditGroupDialog open onOpenChange={setEditing} group={group} />}
      <GroupStatusDialog
        group={group}
        target={statusTarget}
        onClose={() => setStatusTarget(null)}
      />
    </>
  );
}

function ScheduleTab({ group }: { group: GroupDetail }) {
  const { t } = useTranslation();
  const [editingMonth, setEditingMonth] = useState<GroupMonth | null>(null);
  const [payingMonth, setPayingMonth] = useState<GroupMonth | null>(null);
  const today = todayIso();
  const collection = BigInt(group.monthlyInstallment) * BigInt(group.memberCount);

  const columns: Column<GroupMonth>[] = [
    {
      key: 'month',
      header: t('groups.month'),
      primary: true,
      cell: (month) => t('groups.monthNumber', { month: month.monthNumber }),
    },
    {
      key: 'due',
      header: t('groups.dueDate'),
      cell: (month) => <DateText value={month.dueDate} />,
    },
    {
      key: 'payoutAmount',
      header: t('payouts.scheduled'),
      align: 'end',
      cell: (month) =>
        month.isOrganizerMonth ? (
          <Badge tone="info">{t('plans.commissionMonth')}</Badge>
        ) : (
          <Amount value={month.payoutAmount} />
        ),
    },
    {
      key: 'pool',
      header: t('plans.toPool'),
      align: 'end',
      hideOnMobile: true,
      cell: (month) =>
        month.isOrganizerMonth ? (
          <span className="text-text-secondary">{t('groups.commission')}</span>
        ) : (
          <Amount value={collection - BigInt(month.payout?.amount ?? month.payoutAmount)} />
        ),
    },
    {
      key: 'recipient',
      header: t('payouts.recipient'),
      cell: (month) =>
        month.payout ? (
          <span className="flex flex-col">
            <MemberLink member={month.payout.member} />
            <span className="text-caption text-text-secondary">
              {t('tickets.number', { number: month.payout.ticketNumber })} ·{' '}
              <Amount value={month.payout.amount} /> · <DateText value={month.payout.paidOn} />
            </span>
          </span>
        ) : month.isOrganizerMonth ? (
          <span className="text-text-secondary">{t('groups.noRecipient')}</span>
        ) : (
          <span className="text-text-secondary">{t('groups.notPaidOut')}</span>
        ),
    },
    {
      key: 'actions',
      header: t('form.actions'),
      align: 'end',
      cell: (month) => {
        if (group.status === 'DRAFT' && !month.isOrganizerMonth) {
          return (
            <Button variant="ghost" size="sm" onClick={() => setEditingMonth(month)}>
              {t('groups.editPayout')}
            </Button>
          );
        }
        if (group.status === 'ACTIVE' && !month.isOrganizerMonth && !month.payout) {
          const early = toIsoDay(month.dueDate) > today;
          return (
            <Button
              variant={early ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setPayingMonth(month)}
            >
              {t('payouts.record')}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Card flush>
      <ResponsiveTable
        caption={t('groups.tabs.schedule')}
        columns={columns}
        rows={group.months}
        getRowKey={(month) => month.id}
      />
      {editingMonth && (
        <EditMonthPayoutDialog
          key={editingMonth.id}
          open
          onOpenChange={(open) => !open && setEditingMonth(null)}
          group={group}
          month={editingMonth}
        />
      )}
      {payingMonth && (
        <RecordPayoutDialog
          key={payingMonth.id}
          open
          onOpenChange={(open) => !open && setPayingMonth(null)}
          group={group}
          month={payingMonth}
        />
      )}
    </Card>
  );
}

type SeatAction =
  | { kind: 'assign'; ticketNumber: number }
  | { kind: 'replace'; seat: TicketSeat }
  | { kind: 'pay'; preset: PresetTicket };

function TicketsTab({ group }: { group: GroupDetail }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<SeatAction | null>(null);
  const query = usePagedQuery(
    ['groups', group.id, 'tickets'],
    (p, pageSize, signal) => chitApi.groupTickets(group.id, { page: p, pageSize }, signal),
    page,
  );
  const open = group.status === 'DRAFT' || group.status === 'ACTIVE';
  const takesPayments = group.status === 'ACTIVE' || group.status === 'COMPLETED';

  const columns: Column<TicketSeat>[] = [
    {
      key: 'number',
      header: t('form.ticket'),
      cell: (seat) => (
        <span className="tabular">{t('tickets.number', { number: seat.ticketNumber })}</span>
      ),
    },
    {
      key: 'member',
      header: t('form.member'),
      primary: true,
      cell: (seat) => (
        <span className="flex flex-col">
          <MemberLink member={seat.ticket?.member ?? null} withPhone />
          {seat.ticket && seat.ticket.previousHolders.length > 0 && (
            <span className="text-caption text-text-secondary">
              {t('tickets.previously', {
                names: seat.ticket.previousHolders.map((holder) => holder.member.name).join(', '),
              })}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'paid',
      header: t('tickets.paid'),
      align: 'end',
      cell: (seat) => (seat.ticket ? <Amount value={seat.ticket.ledger.totalPaid} /> : ''),
    },
    {
      key: 'outstanding',
      header: t('tickets.outstanding'),
      align: 'end',
      cell: (seat) =>
        seat.ticket ? (
          <span className={seat.ticket.ledger.outstanding !== '0' ? 'text-danger' : undefined}>
            <Amount value={seat.ticket.ledger.outstanding} />
          </span>
        ) : (
          ''
        ),
    },
    {
      key: 'advance',
      header: t('tickets.advance'),
      align: 'end',
      hideOnMobile: true,
      cell: (seat) => (seat.ticket ? <Amount value={seat.ticket.ledger.advance} /> : ''),
    },
    {
      key: 'payout',
      header: t('tickets.payout'),
      cell: (seat) =>
        seat.ticket?.payout ? (
          t('groups.monthNumber', { month: seat.ticket.payout.monthNumber })
        ) : (
          <span className="text-text-secondary">{t('tickets.noPayout')}</span>
        ),
    },
    {
      key: 'actions',
      header: t('form.actions'),
      align: 'end',
      cell: (seat) => {
        const ticket = seat.ticket;
        if (!ticket) {
          return open ? (
            <Button
              size="sm"
              onClick={() => setAction({ kind: 'assign', ticketNumber: seat.ticketNumber })}
            >
              {t('tickets.assign')}
            </Button>
          ) : null;
        }
        return (
          <span className="inline-flex flex-wrap justify-end gap-1">
            {takesPayments && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setAction({
                    kind: 'pay',
                    preset: {
                      ticketId: ticket.id,
                      groupId: group.id,
                      label: t('tickets.seatLabel', {
                        number: seat.ticketNumber,
                        name: ticket.member?.name ?? t('tickets.vacant'),
                      }),
                      suggestedPaise: ticket.ledger.outstanding,
                    },
                  })
                }
              >
                {t('payments.record')}
              </Button>
            )}
            {group.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAction({ kind: 'assign', ticketNumber: seat.ticketNumber })}
              >
                {t('tickets.change')}
              </Button>
            )}
            {group.status === 'ACTIVE' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAction({ kind: 'replace', seat })}
              >
                {t('tickets.replace')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/groups/${group.id}/tickets/${ticket.id}`)}
            >
              {t('actions.view')}
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PagedTable
        query={query}
        caption={t('groups.tabs.tickets')}
        columns={columns}
        getRowKey={(seat) => String(seat.ticketNumber)}
        onPageChange={setPage}
        emptyIcon={UserMultiple}
        emptyMessage={t('tickets.empty')}
      />
      {action?.kind === 'assign' && (
        <AssignTicketDialog
          open
          onOpenChange={(next) => !next && setAction(null)}
          group={group}
          ticketNumber={action.ticketNumber}
        />
      )}
      {action?.kind === 'replace' && action.seat.ticket?.member && (
        <ReplaceMemberDialog
          open
          onOpenChange={(next) => !next && setAction(null)}
          group={group}
          ticketNumber={action.seat.ticketNumber}
          currentMemberId={action.seat.ticket.member.id}
          currentMemberName={action.seat.ticket.member.name}
        />
      )}
      {action?.kind === 'pay' && (
        <RecordPaymentDialog
          key={action.preset.ticketId}
          open
          onOpenChange={(next) => !next && setAction(null)}
          preset={action.preset}
        />
      )}
    </>
  );
}

function CollectionTab({ group }: { group: GroupDetail }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => currentMonthNumber(group));
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<PresetTicket | null>(null);
  const query = usePagedQuery(
    ['groups', group.id, 'collection', month],
    (p, pageSize, signal) =>
      chitApi.monthCollection(group.id, month, { page: p, pageSize }, signal),
    page,
  );
  const items = query.data?.items ?? [];
  const paidCount = items.filter((row) => row.month && row.month.balance === '0').length;

  const columns: Column<CollectionRow>[] = [
    {
      key: 'ticket',
      header: t('form.ticket'),
      cell: (row) => (
        <span className="tabular">{t('tickets.number', { number: row.ticketNumber })}</span>
      ),
    },
    {
      key: 'member',
      header: t('form.member'),
      primary: true,
      cell: (row) => <MemberLink member={row.member} />,
    },
    {
      key: 'status',
      header: t('form.status'),
      cell: (row) => (row.month ? <StatusTag status={row.month.status} /> : ''),
    },
    {
      key: 'paid',
      header: t('collection.paidForMonth'),
      align: 'end',
      cell: (row) => (row.month ? <Amount value={row.month.paid} /> : ''),
    },
    {
      key: 'outstanding',
      header: t('tickets.outstanding'),
      align: 'end',
      cell: (row) => <Amount value={row.outstanding} />,
    },
    {
      key: 'actions',
      header: t('form.actions'),
      align: 'end',
      cell: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setPaying({
              ticketId: row.ticketId,
              groupId: group.id,
              label: t('tickets.seatLabel', {
                number: row.ticketNumber,
                name: row.member?.name ?? t('tickets.vacant'),
              }),
              suggestedPaise: row.outstanding,
            })
          }
        >
          {t('payments.record')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PagedTable
        query={query}
        caption={t('groups.tabs.collection')}
        columns={columns}
        getRowKey={(row) => row.ticketId}
        onPageChange={setPage}
        emptyIcon={Receipt}
        emptyMessage={t('tickets.empty')}
        toolbar={
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-56">
              <Select
                label={t('groups.month')}
                value={String(month)}
                options={group.months.map((item) => ({
                  value: String(item.monthNumber),
                  label: t('collection.monthOption', {
                    month: item.monthNumber,
                    date: toIsoDay(item.dueDate),
                  }),
                }))}
                onChange={(event) => {
                  setMonth(Number(event.target.value));
                  setPage(1);
                }}
              />
            </div>
            {query.data && (
              <p className="pb-3 text-body-sm text-text-secondary">
                {t('collection.summary', { paid: paidCount, total: items.length })}
              </p>
            )}
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
