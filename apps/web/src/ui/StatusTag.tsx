import { CheckmarkFilled, Time, Undo, WarningAltFilled } from '@carbon/icons-react';
import { type InstallmentStatus } from '@chitfund/shared';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from './Badge';
import { type IconComponent } from './icon';

const PRESENTATION: Record<InstallmentStatus, { tone: BadgeTone; icon: IconComponent }> = {
  PAID: { tone: 'success', icon: CheckmarkFilled },
  DUE: { tone: 'info', icon: Time },
  OVERDUE: { tone: 'danger', icon: WarningAltFilled },
  REVERSED: { tone: 'neutral', icon: Undo },
};

/** Installment status. Always an icon and a text label, never colour alone. */
export function StatusTag({ status }: { status: InstallmentStatus }) {
  const { t } = useTranslation();
  const { tone, icon } = PRESENTATION[status];

  return (
    <Badge tone={tone} icon={icon}>
      {t(`status.${status}`)}
    </Badge>
  );
}
