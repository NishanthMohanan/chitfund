import {
  CheckmarkFilled,
  CloseFilled,
  Edit as EditIcon,
  Time,
  WarningAltFilled,
} from '@carbon/icons-react';
import { type GroupStatus, maskPhone } from '@chitfund/shared';
import { type UseQueryResult } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { errorMessage } from '../../lib/form-helpers';
import { type MemberSummary } from '../../lib/chit-api';
import { Badge, type BadgeTone } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Dialog } from '../../ui/Dialog';
import { InlineAlert } from '../../ui/InlineAlert';
import { Skeleton } from '../../ui/Skeleton';
import { Textarea } from '../../ui/Textarea';
import { type IconComponent } from '../../ui/icon';

const GROUP_STATUS: Record<GroupStatus, { tone: BadgeTone; icon: IconComponent }> = {
  DRAFT: { tone: 'neutral', icon: EditIcon },
  ACTIVE: { tone: 'info', icon: Time },
  COMPLETED: { tone: 'success', icon: CheckmarkFilled },
  CANCELLED: { tone: 'danger', icon: CloseFilled },
};

export function GroupStatusTag({ status }: { status: GroupStatus }) {
  const { t } = useTranslation();
  const { tone, icon } = GROUP_STATUS[status];
  return (
    <Badge tone={tone} icon={icon}>
      {t(`groupStatus.${status}`)}
    </Badge>
  );
}

export function ReversedTag() {
  const { t } = useTranslation();
  return (
    <Badge tone="danger" icon={WarningAltFilled}>
      {t('payments.reversed')}
    </Badge>
  );
}

/** Member name linking to their record, or "Vacant" for an empty seat. */
export function MemberLink({
  member,
  withPhone = false,
}: {
  member: MemberSummary | null;
  withPhone?: boolean;
}) {
  const { t } = useTranslation();
  if (!member) {
    return <span className="text-text-secondary">{t('tickets.vacant')}</span>;
  }
  return (
    <span className="flex flex-col">
      <Link
        to={`/members/${member.id}`}
        onClick={(event) => event.stopPropagation()}
        className="font-medium text-primary hover:underline"
      >
        {member.name}
      </Link>
      {withPhone && (
        <span className="font-mono text-caption text-text-secondary tabular">
          {maskPhone(member.phone)}
        </span>
      )}
    </span>
  );
}

/** Loading and error handling for a page that shows one record. */
export function QueryBoundary<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return <InlineAlert tone="danger">{errorMessage(query.error)}</InlineAlert>;
  }
  return <>{children(query.data)}</>;
}

/** A row of headline figures. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary bg-primary-subtle' : undefined}>
      <p className="text-body-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-h2 font-semibold text-text">{value}</p>
      {hint && <p className="mt-1 text-body-sm text-text-secondary">{hint}</p>}
    </Card>
  );
}

/**
 * Confirms a consequential action. With `reasonLabel` the person must write a
 * reason, which is passed to `onConfirm`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  reasonLabel,
  pending,
  error,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  reasonLabel?: string;
  pending: boolean;
  error: unknown;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const message = errorMessage(error);

  const confirm = () => {
    if (reasonLabel && reason.trim().length < 2) {
      setReasonError(t('form.reasonRequired'));
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('');
          setReasonError(undefined);
        }
        onOpenChange(next);
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant={tone}
            pending={pending}
            pendingLabel={t('actions.saving')}
            requiresNetwork
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {message && <InlineAlert tone="danger">{message}</InlineAlert>}
        {children}
        {reasonLabel && (
          <Textarea
            label={reasonLabel}
            rows={3}
            value={reason}
            error={reasonError}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </div>
    </Dialog>
  );
}
