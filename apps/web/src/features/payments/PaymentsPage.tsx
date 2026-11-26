import { Add, Receipt } from '@carbon/icons-react';
import { formatINR } from '@chitfund/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../app/page-title';
import { useChange } from '../../lib/form-helpers';
import { type Payment, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/toast-context';
import { PagedTable } from '../common/PagedTable';
import { useGroupOptions } from '../common/option-hooks';
import { ConfirmDialog } from '../common/shared';
import { usePaymentColumns } from './payment-columns';
import { RecordPaymentDialog } from './RecordPaymentDialog';

/** Reverse a payment with a reason. Nothing is deleted; the record stays, marked reversed. */
export function ReversePaymentDialog({
  payment,
  onClose,
}: {
  payment: Payment | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const reverse = useChange(
    ({ id, reason }: { id: string; reason: string }) => chitApi.reversePayment(id, reason),
    () => {
      toast({ tone: 'success', title: t('payments.reversedToast') });
      onClose();
    },
  );

  return (
    <ConfirmDialog
      open={payment !== null}
      onOpenChange={(open) => {
        if (!open) {
          reverse.reset();
          onClose();
        }
      }}
      title={t('payments.reverseTitle')}
      description={
        payment
          ? t('payments.reverseDescription', {
              amount: formatINR(BigInt(payment.amount)),
              name: payment.payer.name,
            })
          : undefined
      }
      confirmLabel={t('payments.reverse')}
      tone="danger"
      reasonLabel={t('form.reason')}
      pending={reverse.isPending}
      error={reverse.error}
      onConfirm={(reason) => payment && reverse.mutate({ id: payment.id, reason })}
    />
  );
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const title = usePageTitle();
  const [page, setPage] = useState(1);
  const [groupId, setGroupId] = useState('');
  const [recording, setRecording] = useState(false);
  const [reversing, setReversing] = useState<Payment | null>(null);
  const groupOptions = useGroupOptions();
  const query = usePagedQuery(
    ['payments', { groupId }],
    (p, pageSize, signal) => chitApi.payments({ page: p, pageSize, groupId }, signal),
    page,
  );
  const columns = usePaymentColumns(setReversing);

  return (
    <>
      <PageHeader
        title={title}
        description={t('payments.description')}
        actions={
          <Button icon={Add} requiresNetwork onClick={() => setRecording(true)}>
            {t('payments.record')}
          </Button>
        }
      />
      <PagedTable
        query={query}
        caption={title}
        columns={columns}
        getRowKey={(payment) => payment.id}
        onPageChange={setPage}
        emptyIcon={Receipt}
        emptyMessage={t('payments.empty')}
        toolbar={
          <div className="max-w-xs">
            <Select
              label={t('form.group')}
              value={groupId}
              options={[{ value: '', label: t('form.allGroups') }, ...groupOptions.slice(1)]}
              onChange={(event) => {
                setGroupId(event.target.value);
                setPage(1);
              }}
            />
          </div>
        }
      />
      {recording && <RecordPaymentDialog open onOpenChange={setRecording} />}
      <ReversePaymentDialog payment={reversing} onClose={() => setReversing(null)} />
    </>
  );
}
