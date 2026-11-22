import { Notification } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

export function NotificationsPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Notification} message={t('empty.notifications')} />;
}
