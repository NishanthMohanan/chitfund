import { zodResolver } from '@hookform/resolvers/zod';
import { formatINR, parseRupeesToPaise } from '@chitfund/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  applyFieldErrors,
  errorMessage,
  rupeesSchema,
  rupeesToPaise,
  todayIso,
  useChange,
} from '../../lib/form-helpers';
import { chitApi } from '../../lib/chit-api';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { DescriptionList } from '../../ui/DescriptionList';
import { Dialog } from '../../ui/Dialog';
import { InlineAlert } from '../../ui/InlineAlert';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { useToast } from '../../ui/toast-context';
import { useGroupOptions, usePaymentModeOptions } from '../common/option-hooks';
import { useAllSeats } from '../groups/use-seats';

export type PresetTicket = {
  ticketId: string;
  groupId: string;
  /** e.g. "Ticket 4 · Lakshmi R" */
  label: string;
  /** Suggested amount in paise, usually the outstanding balance. */
  suggestedPaise?: string;
};

const formSchema = z.object({
  groupId: z.string().min(1, 'Choose a group'),
  ticketId: z.string().min(1, 'Choose a ticket'),
  amount: rupeesSchema.refine(
    (value) => (parseRupeesToPaise(value) ?? 0n) > 0n,
    'Enter an amount above zero',
  ),
  paidOn: z.string().min(1, 'Choose a date'),
  modeId: z.string().min(1, 'Choose a payment mode'),
  reference: z.string().max(120),
  note: z.string().max(500),
});
type PaymentForm = z.infer<typeof formSchema>;

/**
 * Record payment in two steps: fill in the details, then confirm a summary
 * that restates the member, ticket and amount. The confirm button locks while
 * saving, so a double click records one payment.
 */
export function RecordPaymentDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: PresetTicket;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const defaults: PaymentForm = {
    groupId: preset?.groupId ?? '',
    ticketId: preset?.ticketId ?? '',
    amount: '',
    paidOn: todayIso(),
    modeId: '',
    reference: '',
    note: '',
  };
  const form = useForm<PaymentForm>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: defaults,
  });
  const groupOptions = useGroupOptions();
  const modeOptions = usePaymentModeOptions();
  const groupId = form.watch('groupId');
  const tickets = useAllSeats(preset ? '' : groupId);

  const close = () => {
    form.reset(defaults);
    setStep('details');
    record.reset();
    onOpenChange(false);
  };

  const record = useChange(
    (values: PaymentForm) =>
      chitApi.recordPayment({
        ticketId: values.ticketId,
        amount: rupeesToPaise(values.amount),
        paidOn: values.paidOn,
        modeId: values.modeId,
        reference: values.reference,
        note: values.note,
      }),
    (_result, values) => {
      toast({
        tone: 'success',
        title: t('payments.recorded'),
        description: formatINR(parseRupeesToPaise(values.amount) ?? 0n),
      });
      close();
    },
  );

  const values = form.watch();
  const seat = tickets.data?.find((item) => item.ticket?.id === values.ticketId);
  const ticketLabel =
    preset?.label ??
    (seat
      ? t('tickets.seatLabel', {
          number: seat.ticketNumber,
          name: seat.ticket?.member?.name ?? t('tickets.vacant'),
        })
      : '');
  const groupLabel = groupOptions.find((option) => option.value === values.groupId)?.label;
  const modeLabel = modeOptions.find((option) => option.value === values.modeId)?.label;
  const amountPaise = parseRupeesToPaise(values.amount) ?? 0n;
  const message = errorMessage(record.error);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={step === 'details' ? t('payments.recordTitle') : t('payments.confirmTitle')}
      description={step === 'confirm' ? t('payments.confirmDescription') : undefined}
      footer={
        step === 'details' ? (
          <>
            <Button variant="secondary" onClick={close}>
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
              onClick={() =>
                record.mutate(form.getValues(), {
                  onError: (error) => {
                    applyFieldErrors(form, error);
                  },
                })
              }
            >
              {t('payments.confirmAction', { amount: formatINR(amountPaise) })}
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
          {preset ? (
            <InlineAlert tone="info">{preset.label}</InlineAlert>
          ) : (
            <>
              <Select
                label={t('form.group')}
                options={groupOptions}
                error={form.formState.errors.groupId?.message}
                {...form.register('groupId', {
                  onChange: () => form.setValue('ticketId', ''),
                })}
              />
              <Select
                label={t('form.ticket')}
                disabled={!groupId}
                error={form.formState.errors.ticketId?.message}
                options={[
                  {
                    value: '',
                    label: tickets.isFetching ? t('form.loading') : t('form.chooseTicket'),
                  },
                  ...(tickets.data ?? []).flatMap((item) =>
                    item.ticket
                      ? [
                          {
                            value: item.ticket.id,
                            label: t('tickets.seatLabel', {
                              number: item.ticketNumber,
                              name: item.ticket.member?.name ?? t('tickets.vacant'),
                            }),
                          },
                        ]
                      : [],
                  ),
                ]}
                {...form.register('ticketId')}
              />
            </>
          )}
          <Input
            label={t('form.amountRupees')}
            inputMode="decimal"
            hint={
              preset?.suggestedPaise && preset.suggestedPaise !== '0'
                ? t('payments.outstandingHint', {
                    amount: formatINR(BigInt(preset.suggestedPaise)),
                  })
                : t('payments.oldestFirstHint')
            }
            error={form.formState.errors.amount?.message}
            {...form.register('amount')}
          />
          <Input
            label={t('form.paidOn')}
            type="date"
            error={form.formState.errors.paidOn?.message}
            {...form.register('paidOn')}
          />
          <Select
            label={t('form.mode')}
            options={modeOptions}
            error={form.formState.errors.modeId?.message}
            {...form.register('modeId')}
          />
          <Input label={t('form.reference')} optional {...form.register('reference')} />
          <Textarea label={t('form.note')} optional rows={2} {...form.register('note')} />
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {message && <InlineAlert tone="danger">{message}</InlineAlert>}
          <DescriptionList
            items={[
              ...(groupLabel && !preset
                ? [{ term: t('form.group'), description: groupLabel }]
                : []),
              { term: t('form.ticket'), description: ticketLabel },
              { term: t('form.amount'), description: <Amount value={amountPaise} emphasis /> },
              { term: t('form.paidOn'), description: values.paidOn },
              { term: t('form.mode'), description: modeLabel ?? '' },
              ...(values.reference
                ? [{ term: t('form.reference'), description: values.reference }]
                : []),
            ]}
          />
          {values.paidOn > todayIso() && (
            <InlineAlert tone="warning">{t('payments.futureDateWarning')}</InlineAlert>
          )}
        </div>
      )}
    </Dialog>
  );
}
