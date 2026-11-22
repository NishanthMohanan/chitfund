import { Money } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

export function CollectionsPage() {
  const { t } = useTranslation();
  return <EmptySection icon={Money} message={t('empty.organizerCollections')} />;
}
