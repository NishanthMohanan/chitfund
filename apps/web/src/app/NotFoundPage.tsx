import { Launch } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonClasses } from '../ui/button-classes';
import { EmptyState } from '../ui/EmptyState';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto w-full max-w-xl px-safe pt-safe">
      <h1 className="mt-12 text-h2 font-semibold text-text">{t('notFound.title')}</h1>
      <EmptyState
        icon={Launch}
        message={t('notFound.body')}
        action={
          <Link to="/sign-in" className={buttonClasses('secondary', 'md')}>
            {t('notFound.action')}
          </Link>
        }
      />
    </main>
  );
}
