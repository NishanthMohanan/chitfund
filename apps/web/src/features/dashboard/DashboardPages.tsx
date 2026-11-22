import { Dashboard, Home } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

export function MemberHomePage() {
  const { t } = useTranslation();
  return <EmptySection icon={Home} message={t('empty.memberHome')} />;
}

export function OrganizerDashboardPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Dashboard} message={t('empty.organizerDashboard')} />;
}

export function AdminOverviewPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Dashboard} message={t('empty.adminOverview')} />;
}
