import { CheckmarkFilled, CircleDash, Time, WarningAltFilled } from '@carbon/icons-react';
import { type DueStatus } from '@chitfund/shared';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from './Badge';
import { type IconComponent } from './icon';

const PRESENTATION: Record<DueStatus, { tone: BadgeTone; icon: IconComponent }> = {
  PAID: { tone: 'success', icon: CheckmarkFilled },
  ADVANCE: { tone: 'success', icon: CheckmarkFilled },
  PARTIAL: { tone: 'warning', icon: CircleDash },
  DUE: { tone: 'info', icon: Time },
  UPCOMING: { tone: 'neutral', icon: Time },
  OVERDUE: { tone: 'danger', icon: WarningAltFilled },
};

/** Installment status. Always an icon and a text label, never colour alone. */
export function StatusTag({ status }: { status: DueStatus }) {
  const { t } = useTranslation();
  const { tone, icon } = PRESENTATION[status];

  return (
    <Badge tone={tone} icon={icon}>
      {t(`status.${status}`)}
    </Badge>
  );
}
