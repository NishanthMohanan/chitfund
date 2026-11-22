import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../app/page-title';
import { useTheme } from '../../app/theme-context';
import { parseThemePreference } from '../../lib/theme';
import { Card } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';

export function ProfilePage() {
  const title = usePageTitle();

  return (
    <>
      <PageHeader title={title} />
      <div className="flex max-w-xl flex-col gap-4">
        <AppearanceSettings />
      </div>
    </>
  );
}

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <Card title={t('settings.appearance')}>
      <Select
        label={t('settings.theme')}
        value={preference}
        onChange={(event) => setPreference(parseThemePreference(event.target.value))}
        options={[
          { value: 'system', label: t('settings.themeSystem') },
          { value: 'light', label: t('settings.themeLight') },
          { value: 'dark', label: t('settings.themeDark') },
        ]}
      />
    </Card>
  );
}
