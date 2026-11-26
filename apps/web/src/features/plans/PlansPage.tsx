import { Add, Catalog } from '@carbon/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/page-title';
import { type Template, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { Amount } from '../../ui/Amount';
import { Badge } from '../../ui/Badge';
import { buttonClasses } from '../../ui/button-classes';
import { Checkbox } from '../../ui/Checkbox';
import { PageHeader } from '../../ui/PageHeader';
import { type Column } from '../../ui/ResponsiveTable';
import { PagedTable } from '../common/PagedTable';

export function PlansPage() {
  const { t } = useTranslation();
  const title = usePageTitle();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const query = usePagedQuery(
    ['templates', { includeArchived }],
    (p, pageSize, signal) =>
      chitApi.templates({ page: p, pageSize, includeArchived: String(includeArchived) }, signal),
    page,
  );

  const columns: Column<Template>[] = [
    {
      key: 'name',
      header: t('form.name'),
      primary: true,
      cell: (plan) => (
        <span className="flex items-center gap-2">
          {plan.name}
          {plan.archivedAt && <Badge>{t('plans.archived')}</Badge>}
        </span>
      ),
    },
    {
      key: 'chitValue',
      header: t('plans.chitValue'),
      align: 'end',
      cell: (plan) => <Amount value={plan.chitValue} />,
    },
    {
      key: 'installment',
      header: t('plans.installment'),
      align: 'end',
      cell: (plan) => <Amount value={plan.monthlyInstallment} />,
    },
    {
      key: 'shape',
      header: t('plans.shape'),
      cell: (plan) =>
        t('plans.shapeValue', { members: plan.memberCount, months: plan.durationMonths }),
    },
    {
      key: 'groups',
      header: t('plans.groupsUsing'),
      align: 'end',
      hideOnMobile: true,
      cell: (plan) => <span className="tabular">{plan.groupCount}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={t('plans.description')}
        actions={
          <Link to="/plans/new" className={buttonClasses('primary', 'md')}>
            <Add size={16} aria-hidden />
            {t('plans.add')}
          </Link>
        }
      />
      <PagedTable
        query={query}
        caption={title}
        columns={columns}
        getRowKey={(plan) => plan.id}
        onRowClick={(plan) => navigate(`/plans/${plan.id}`)}
        onPageChange={setPage}
        emptyIcon={Catalog}
        emptyMessage={t('plans.empty')}
        toolbar={
          <Checkbox
            label={t('plans.showArchived')}
            checked={includeArchived}
            onCheckedChange={(checked) => {
              setIncludeArchived(checked);
              setPage(1);
            }}
          />
        }
      />
    </>
  );
}
