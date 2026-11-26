import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PICKER_PAGE } from '../../lib/form-helpers';
import { chitApi } from '../../lib/chit-api';
import { type SelectOption } from '../../ui/Select';

/** Active payment modes for a select, in the organizer's order. */
export function usePaymentModeOptions(includeInactiveId?: string): SelectOption[] {
  const { t } = useTranslation();
  const modes = useQuery({
    queryKey: ['payment-modes', 'picker'],
    queryFn: ({ signal }) => chitApi.paymentModes(PICKER_PAGE, signal),
  });
  return [
    { value: '', label: t('form.chooseMode') },
    ...(modes.data?.items ?? [])
      .filter((mode) => mode.isActive || mode.id === includeInactiveId)
      .map((mode) => ({ value: mode.id, label: mode.name })),
  ];
}

/** Running and completed groups, which can take payments. */
export function useGroupOptions(): SelectOption[] {
  const { t } = useTranslation();
  const groups = useQuery({
    queryKey: ['groups', 'picker'],
    queryFn: ({ signal }) => chitApi.groups(PICKER_PAGE, signal),
  });
  return [
    { value: '', label: t('form.chooseGroup') },
    ...(groups.data?.items ?? [])
      .filter((group) => group.status === 'ACTIVE' || group.status === 'COMPLETED')
      .map((group) => ({ value: group.id, label: `${group.name} (${group.code})` })),
  ];
}
