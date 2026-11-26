import { zodResolver } from '@hookform/resolvers/zod';
import { type GroupStatus, formatINR, parseRupeesToPaise } from '@chitfund/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  PICKER_PAGE,
  applyFieldErrors,
  errorMessage,
  paiseToRupees,
  rupeesSchema,
  rupeesToPaise,
  toIsoDay,
  todayIso,
  useChange,
} from '../../lib/form-helpers';
import { type GroupDetail, type GroupMonth, chitApi } from '../../lib/chit-api';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { DateText } from '../../ui/DateText';
import { DescriptionList } from '../../ui/DescriptionList';
import { Dialog } from '../../ui/Dialog';
import { InlineAlert } from '../../ui/InlineAlert';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { useToast } from '../../ui/toast-context';
import { usePaymentModeOptions } from '../common/option-hooks';
import { MemberPicker } from '../common/pickers';
import { ConfirmDialog } from '../common/shared';
import { useAllSeats } from './use-seats';

type OpenProps = { open: boolean; onOpenChange: (open: boolean) => void };

function DialogFooter({
  onCancel,
  onSave,
  pending,
  label,
}: {
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button variant="secondary" onClick={onCancel}>
        {t('actions.cancel')}
      </Button>
      <Button pending={pending} pendingLabel={t('actions.saving')} requiresNetwork onClick={onSave}>
        {label}
      </Button>
    </>
  );
}

const dueDaySchema = z.coerce
  .number({ invalid_type_error: 'Enter a day from 1 to 31' })
  .int('Enter a day from 1 to 31')
  .min(1, 'Enter a day from 1 to 31')
  .max(31, 'Enter a day from 1 to 31');

const createSchema = z.object({
  templateId: z.string().min(1, 'Choose a plan'),
  name: z.string().trim().min(2, 'Enter a name').max(120),
  code: z
    .string()
    .trim()
    .min(1, 'Enter a code')
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens only'),
  startDate: z.string().min(1, 'Choose the start date'),
  dueDayOfMonth: dueDaySchema,
});
type CreateForm = z.input<typeof createSchema>;

/** A group starts from a plan; the start date and due day are chosen here. */
export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: OpenProps & { onCreated: (id: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const plans = useQuery({
    queryKey: ['templates', 'picker'],
    queryFn: ({ signal }) => chitApi.templates(PICKER_PAGE, signal),
  });
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    mode: 'onBlur',
    defaultValues: { templateId: '', name: '', code: '', startDate: todayIso(), dueDayOfMonth: 5 },
  });
  const create = useChange(
    (values: CreateForm) => chitApi.createGroup(createSchema.parse(values)),
    (group) => {
      toast({ tone: 'success', title: t('groups.created') });
      onOpenChange(false);
      onCreated(group.id);
    },
  );
  const errors = form.formState.errors;
  const chosen = plans.data?.items.find((plan) => plan.id === form.watch('templateId'));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('groups.addTitle')}
      description={t('groups.addDescription')}
      footer={
        <DialogFooter
          onCancel={() => onOpenChange(false)}
          pending={create.isPending}
          label={t('groups.create')}
          onSave={form.handleSubmit((values) =>
            create.mutate(values, { onError: (error) => applyFieldErrors(form, error) }),
          )}
        />
      }
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
        {create.error ? (
          <InlineAlert tone="danger">{errorMessage(create.error)}</InlineAlert>
        ) : null}
        {plans.data && plans.data.items.length === 0 && (
          <InlineAlert tone="warning">{t('groups.noPlans')}</InlineAlert>
        )}
        <Select
          label={t('groups.plan')}
          error={errors.templateId?.message}
          options={[
            { value: '', label: t('groups.choosePlan') },
            ...(plans.data?.items ?? []).map((plan) => ({ value: plan.id, label: plan.name })),
          ]}
          {...form.register('templateId')}
        />
        {chosen && (
          <p className="text-body-sm text-text-secondary">
            {t('groups.planSummary', {
              value: formatINR(BigInt(chosen.chitValue)),
              installment: formatINR(BigInt(chosen.monthlyInstallment)),
              members: chosen.memberCount,
              months: chosen.durationMonths,
            })}
          </p>
        )}
        <Input label={t('form.name')} error={errors.name?.message} {...form.register('name')} />
        <Input
          label={t('groups.code')}
          hint={t('groups.codeHint')}
          error={errors.code?.message}
          {...form.register('code')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('groups.startDate')}
            type="date"
            error={errors.startDate?.message}
            {...form.register('startDate')}
          />
          <Input
            label={t('groups.dueDay')}
            inputMode="numeric"
            hint={t('groups.dueDayHint')}
            error={errors.dueDayOfMonth?.message}
            {...form.register('dueDayOfMonth')}
          />
        </div>
      </form>
    </Dialog>
  );
}

const editSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  dueDayOfMonth: dueDaySchema,
});
type EditForm = z.input<typeof editSchema>;

/** Rename a group; while it is a draft, the due day can change too. */
export function EditGroupDialog({ open, onOpenChange, group }: OpenProps & { group: GroupDetail }) {
  const { t } = useTranslation();
  const toast = useToast();
  const draft = group.status === 'DRAFT';
  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    mode: 'onBlur',
    defaultValues: { name: group.name, dueDayOfMonth: group.dueDayOfMonth },
  });
  const save = useChange(
    (values: EditForm) => {
      const parsed = editSchema.parse(values);
      return chitApi.updateGroup(group.id, draft ? parsed : { name: parsed.name });
    },
    () => {
      toast({ tone: 'success', title: t('groups.updated') });
      onOpenChange(false);
    },
  );
  const errors = form.formState.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('groups.editTitle')}
      footer={
        <DialogFooter
          onCancel={() => onOpenChange(false)}
          pending={save.isPending}
          label={t('actions.save')}
          onSave={form.handleSubmit((values) =>
            save.mutate(values, { onError: (error) => applyFieldErrors(form, error) }),
          )}
        />
      }
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
        {save.error ? <InlineAlert tone="danger">{errorMessage(save.error)}</InlineAlert> : null}
        <Input label={t('form.name')} error={errors.name?.message} {...form.register('name')} />
        <Input
          label={t('groups.dueDay')}
          inputMode="numeric"
          disabled={!draft}
          hint={draft ? t('groups.dueDayDraftHint') : t('groups.dueDayFixed')}
          error={errors.dueDayOfMonth?.message}
          {...form.register('dueDayOfMonth')}
        />
      </form>
    </Dialog>
  );
}

/** Draft groups only: change one month's scheduled payout. */
export function EditMonthPayoutDialog({
  open,
  onOpenChange,
  group,
  month,
}: OpenProps & { group: GroupDetail; month: GroupMonth }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [value, setValue] = useState(paiseToRupees(month.payoutAmount));
  const [error, setError] = useState<string>();
  const save = useChange(
    (payoutAmount: string) =>
      chitApi.updateGroupMonth(group.id, month.monthNumber, { payoutAmount }),
    () => {
      toast({ tone: 'success', title: t('groups.monthUpdated') });
      onOpenChange(false);
    },
  );
  const submit = () => {
    const paise = parseRupeesToPaise(value);
    if (paise === null || paise <= 0n) {
      setError(t('plans.errors.amount'));
      return;
    }
    save.mutate(paise.toString());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('groups.editMonthTitle', { month: month.monthNumber })}
      footer={
        <DialogFooter
          onCancel={() => onOpenChange(false)}
          pending={save.isPending}
          label={t('actions.save')}
          onSave={submit}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {save.error ? <InlineAlert tone="danger">{errorMessage(save.error)}</InlineAlert> : null}
        <Input
          label={t('plans.payoutRupees')}
          inputMode="decimal"
          value={value}
          error={error}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
    </Dialog>
  );
}

/** Give a seat to a member: a vacant seat, or any seat while the group is a draft. */
export function AssignTicketDialog({
  open,
  onOpenChange,
  group,
  ticketNumber,
}: OpenProps & { group: GroupDetail; ticketNumber: number }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState<string>();
  const assign = useChange(
    (id: string) => chitApi.assignTicket(group.id, ticketNumber, id),
    () => {
      toast({ tone: 'success', title: t('tickets.assigned', { number: ticketNumber }) });
      onOpenChange(false);
    },
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('tickets.assignTitle', { number: ticketNumber })}
      footer={
        <DialogFooter
          onCancel={() => onOpenChange(false)}
          pending={assign.isPending}
          label={t('tickets.assign')}
          onSave={() => (memberId ? assign.mutate(memberId) : setError(t('form.chooseMember')))}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {assign.error ? (
          <InlineAlert tone="danger">{errorMessage(assign.error)}</InlineAlert>
        ) : null}
        <MemberPicker value={memberId} onChange={setMemberId} error={error} />
      </div>
    </Dialog>
  );
}

const replaceSchema = z.object({
  memberId: z.string().min(1, 'Choose a member'),
  fromMonth: z.coerce.number().int().min(1, 'Choose a month'),
  reason: z.string().trim().min(2, 'Enter a reason').max(500),
});
type ReplaceForm = z.input<typeof replaceSchema>;

/** A member leaves mid-plan: the new member takes over the ticket and its unpaid dues. */
export function ReplaceMemberDialog({
  open,
  onOpenChange,
  group,
  ticketNumber,
  currentMemberId,
  currentMemberName,
}: OpenProps & {
  group: GroupDetail;
  ticketNumber: number;
  currentMemberId: string;
  currentMemberName: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const currentMonth =
    group.months.filter((month) => new Date(month.dueDate) <= new Date()).length || 1;
  const form = useForm<ReplaceForm>({
    resolver: zodResolver(replaceSchema),
    mode: 'onBlur',
    defaultValues: { memberId: '', fromMonth: currentMonth, reason: '' },
  });
  const replace = useChange(
    (values: ReplaceForm) =>
      chitApi.replaceMember(group.id, ticketNumber, replaceSchema.parse(values)),
    () => {
      toast({ tone: 'success', title: t('tickets.replaced', { number: ticketNumber }) });
      onOpenChange(false);
    },
  );
  const errors = form.formState.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('tickets.replaceTitle', { number: ticketNumber })}
      description={t('tickets.replaceDescription', { name: currentMemberName })}
      footer={
        <DialogFooter
          onCancel={() => onOpenChange(false)}
          pending={replace.isPending}
          label={t('tickets.replace')}
          onSave={form.handleSubmit((values) =>
            replace.mutate(values, { onError: (error) => applyFieldErrors(form, error) }),
          )}
        />
      }
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
        {replace.error ? (
          <InlineAlert tone="danger">{errorMessage(replace.error)}</InlineAlert>
        ) : null}
        <MemberPicker
          value={form.watch('memberId')}
          excludeId={currentMemberId}
          error={errors.memberId?.message}
          onChange={(id) => form.setValue('memberId', id, { shouldValidate: true })}
        />
        <Select
          label={t('tickets.fromMonth')}
          error={errors.fromMonth?.message}
          options={group.months.map((month) => ({
            value: String(month.monthNumber),
            label: t('groups.monthNumber', { month: month.monthNumber }),
          }))}
          {...form.register('fromMonth')}
        />
        <Textarea
          label={t('form.reason')}
          rows={3}
          error={errors.reason?.message}
          {...form.register('reason')}
        />
        <InlineAlert tone="info">{t('tickets.inheritDues')}</InlineAlert>
      </form>
    </Dialog>
  );
}

const payoutSchema = z.object({
  ticketId: z.string().min(1, 'Choose the recipient'),
  amount: rupeesSchema,
  paidOn: z.string().min(1, 'Choose a date'),
  modeId: z.string(),
  reference: z.string().max(120),
  note: z.string().max(500),
  confirmEarly: z.boolean(),
});
type PayoutForm = z.infer<typeof payoutSchema>;

/**
 * Record a month's payout in two steps. The amount starts at the scheduled
 * payout; a different amount needs a reason. Paying out a month that has not
 * come yet needs an explicit confirmation.
 */
export function RecordPayoutDialog({
  open,
  onOpenChange,
  group,
  month,
}: OpenProps & { group: GroupDetail; month: GroupMonth }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const seats = useAllSeats(group.id);
  const modeOptions = usePaymentModeOptions();
  const early = toIsoDay(month.dueDate) > todayIso();
  const scheduled = BigInt(month.payoutAmount);
  const form = useForm<PayoutForm>({
    resolver: zodResolver(
      payoutSchema.superRefine((values, ctx) => {
        const amount = parseRupeesToPaise(values.amount);
        if (amount !== null && amount <= 0n) {
          ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount above zero' });
        }
        if (amount !== null && amount !== scheduled && values.note.trim().length < 2) {
          ctx.addIssue({ code: 'custom', path: ['note'], message: t('payouts.reasonRequired') });
        }
        if (early && !values.confirmEarly) {
          ctx.addIssue({
            code: 'custom',
            path: ['confirmEarly'],
            message: t('payouts.confirmEarlyRequired'),
          });
        }
      }),
    ),
    mode: 'onBlur',
    defaultValues: {
      ticketId: '',
      amount: paiseToRupees(month.payoutAmount),
      paidOn: todayIso(),
      modeId: '',
      reference: '',
      note: '',
      confirmEarly: false,
    },
  });
  const record = useChange(
    (values: PayoutForm) =>
      chitApi.recordPayout(group.id, {
        monthNumber: month.monthNumber,
        ticketId: values.ticketId,
        amount: rupeesToPaise(values.amount),
        paidOn: values.paidOn,
        modeId: values.modeId || null,
        reference: values.reference,
        note: values.note,
      }),
    () => {
      toast({ tone: 'success', title: t('payouts.recorded', { month: month.monthNumber }) });
      onOpenChange(false);
    },
  );

  const eligible = (seats.data ?? []).filter((seat) => seat.ticket && !seat.ticket.payout);
  const values = form.watch();
  const chosen = eligible.find((seat) => seat.ticket?.id === values.ticketId);
  const amount = parseRupeesToPaise(values.amount) ?? 0n;
  const overdue = chosen?.ticket ? BigInt(chosen.ticket.ledger.outstanding) : 0n;
  const errors = form.formState.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        step === 'details'
          ? t('payouts.title', { month: month.monthNumber })
          : t('payouts.confirmTitle', { month: month.monthNumber })
      }
      description={step === 'details' ? t('payouts.description') : t('payments.confirmDescription')}
      footer={
        step === 'details' ? (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={form.handleSubmit(() => setStep('confirm'))}>
              {t('actions.continue')}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              disabled={record.isPending}
              onClick={() => setStep('details')}
            >
              {t('actions.back')}
            </Button>
            <Button
              pending={record.isPending}
              pendingLabel={t('actions.saving')}
              requiresNetwork
              onClick={() => record.mutate(form.getValues())}
            >
              {t('payouts.confirmAction', { amount: formatINR(amount) })}
            </Button>
          </>
        )
      }
    >
      {step === 'details' ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          {early && (
            <InlineAlert tone="warning" title={t('payouts.earlyTitle')}>
              {t('payouts.earlyBody', { date: toIsoDay(month.dueDate) })}
            </InlineAlert>
          )}
          <Select
            label={t('payouts.recipient')}
            error={errors.ticketId?.message}
            options={[
              {
                value: '',
                label: seats.isPending ? t('form.loading') : t('payouts.chooseRecipient'),
              },
              ...eligible.map((seat) => ({
                value: seat.ticket?.id ?? '',
                label: t('payouts.recipientOption', {
                  number: seat.ticketNumber,
                  name: seat.ticket?.member?.name ?? t('tickets.vacant'),
                  owes: formatINR(BigInt(seat.ticket?.ledger.outstanding ?? '0')),
                }),
              })),
            ]}
            {...form.register('ticketId')}
          />
          {chosen && overdue > 0n && (
            <InlineAlert tone="warning">
              {t('payouts.owesWarning', { amount: formatINR(overdue) })}
            </InlineAlert>
          )}
          <Input
            label={t('form.amountRupees')}
            inputMode="decimal"
            hint={t('payouts.scheduledHint', { amount: formatINR(scheduled) })}
            error={errors.amount?.message}
            {...form.register('amount')}
          />
          <Input
            label={t('form.paidOn')}
            type="date"
            error={errors.paidOn?.message}
            {...form.register('paidOn')}
          />
          <Select
            label={t('form.mode')}
            optional
            options={modeOptions}
            {...form.register('modeId')}
          />
          <Input label={t('form.reference')} optional {...form.register('reference')} />
          <Textarea
            label={amount !== scheduled ? t('payouts.reasonLabel') : t('form.note')}
            optional={amount === scheduled}
            rows={2}
            error={errors.note?.message}
            {...form.register('note')}
          />
          {early && (
            <div>
              <Checkbox
                label={t('payouts.confirmEarly')}
                checked={values.confirmEarly}
                onCheckedChange={(checked) =>
                  form.setValue('confirmEarly', checked, { shouldValidate: true })
                }
              />
              {errors.confirmEarly && (
                <p className="text-body-sm text-danger">{errors.confirmEarly.message}</p>
              )}
            </div>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {record.error ? (
            <InlineAlert tone="danger">{errorMessage(record.error)}</InlineAlert>
          ) : null}
          <DescriptionList
            items={[
              {
                term: t('groups.month'),
                description: t('groups.monthNumber', { month: month.monthNumber }),
              },
              {
                term: t('payouts.recipient'),
                description: chosen
                  ? t('tickets.seatLabel', {
                      number: chosen.ticketNumber,
                      name: chosen.ticket?.member?.name ?? t('tickets.vacant'),
                    })
                  : '',
              },
              { term: t('payouts.scheduled'), description: <Amount value={scheduled} /> },
              { term: t('form.amount'), description: <Amount value={amount} emphasis /> },
              { term: t('form.paidOn'), description: values.paidOn },
              ...(values.note ? [{ term: t('form.note'), description: values.note }] : []),
            ]}
          />
          {overdue > 0n && (
            <InlineAlert tone="warning">
              {t('payouts.owesWarning', { amount: formatINR(overdue) })}
            </InlineAlert>
          )}
        </div>
      )}
    </Dialog>
  );
}

type TargetStatus = Exclude<GroupStatus, 'DRAFT'>;

const STATUS_COPY = {
  ACTIVE: {
    title: 'groups.startTitle',
    body: 'groups.startBody',
    action: 'groups.start',
    done: 'groups.statusChanged.ACTIVE',
    tone: 'primary',
  },
  COMPLETED: {
    title: 'groups.completeTitle',
    body: 'groups.completeBody',
    action: 'groups.complete',
    done: 'groups.statusChanged.COMPLETED',
    tone: 'primary',
  },
  CANCELLED: {
    title: 'groups.cancelTitle',
    body: 'groups.cancelBody',
    action: 'groups.cancelGroup',
    done: 'groups.statusChanged.CANCELLED',
    tone: 'danger',
  },
} as const satisfies Record<TargetStatus, { tone: 'primary' | 'danger' } & Record<string, string>>;

/** Start, complete or cancel a group, after confirming. */
export function GroupStatusDialog({
  group,
  target,
  onClose,
}: {
  group: GroupDetail;
  target: TargetStatus | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const change = useChange(
    (status: TargetStatus) => chitApi.changeGroupStatus(group.id, status),
    (_result, status) => {
      toast({ tone: 'success', title: t(STATUS_COPY[status].done) });
      onClose();
    },
  );
  const copy = target ? STATUS_COPY[target] : null;

  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          change.reset();
          onClose();
        }
      }}
      title={copy ? t(copy.title, { name: group.name }) : ''}
      description={copy ? t(copy.body, { name: group.name }) : undefined}
      confirmLabel={copy ? t(copy.action) : ''}
      tone={copy?.tone}
      pending={change.isPending}
      error={change.error}
      onConfirm={() => target && change.mutate(target)}
    >
      {target === 'COMPLETED' && (
        <DescriptionList
          items={[
            {
              term: t('groups.payoutsDone'),
              description: `${group.months.filter((month) => month.payout).length}/${group.durationMonths - 1}`,
            },
            {
              term: t('groups.endsOn'),
              description: group.endDate ? <DateText value={group.endDate} /> : '—',
            },
          ]}
        />
      )}
    </ConfirmDialog>
  );
}
