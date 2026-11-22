import { Events } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

export function MembersPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Events} message={t('empty.organizerMembers')} />;
}
