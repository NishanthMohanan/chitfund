import { Receipt } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

export function PaymentsPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Receipt} message={t('empty.memberPayments')} />;
}
