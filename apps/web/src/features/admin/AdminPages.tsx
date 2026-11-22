import { Activity, UserAdmin } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

export function OrganizersPage() {
  const { t } = useTranslation();
  return <EmptySection icon={UserAdmin} message={t('empty.adminOrganizers')} />;
}

export function ActivityPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Activity} message={t('empty.adminActivity')} />;
}
