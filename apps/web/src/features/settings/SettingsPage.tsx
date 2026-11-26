import { Add, Money } from '@carbon/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../app/page-title';
import { useTheme } from '../../app/theme-context';
import { errorMessage, useChange } from '../../lib/form-helpers';
import { type PaymentMode, chitApi } from '../../lib/chit-api';
import { usePagedQuery } from '../../lib/pagination';
import { parseThemePreference } from '../../lib/theme';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Checkbox } from '../../ui/Checkbox';
import { Dialog } from '../../ui/Dialog';
import { InlineAlert } from '../../ui/InlineAlert';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { type Column } from '../../ui/ResponsiveTable';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/toast-context';
import { PagedTable } from '../common/PagedTable';

export function SettingsPage() {
  const title = usePageTitle();
  return (
    <>
      <PageHeader title={title} />
      <div className="flex max-w-3xl flex-col gap-6">
        <PaymentModes />
        <AppearanceSettings />
      </div>
    </>
  );
}

function PaymentModes() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PaymentMode | 'new' | null>(null);
  const query = usePagedQuery(
    ['payment-modes'],
    (p, pageSize, signal) => chitApi.paymentModes({ page: p, pageSize }, signal),
    page,
  );
  const columns: Column<PaymentMode>[] = [
    { key: 'name', header: t('form.name'), primary: true, cell: (mode) => mode.name },
    {
      key: 'status',
      header: t('form.status'),
      cell: (mode) =>
        mode.isActive ? (
          <Badge tone="success">{t('settings.active')}</Badge>
        ) : (
          <Badge>{t('settings.inactive')}</Badge>
        ),
    },
    {
      key: 'order',
      header: t('settings.order'),
      align: 'end',
      cell: (mode) => <span className="tabular">{mode.sortOrder}</span>,
    },
    {
      key: 'actions',
      header: t('form.actions'),
      align: 'end',
      cell: (mode) => (
        <Button size="sm" variant="ghost" onClick={() => setEditing(mode)}>
          {t('actions.edit')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PagedTable
        title={t('settings.paymentModes')}
        actions={
          <Button size="sm" icon={Add} onClick={() => setEditing('new')}>
            {t('settings.addMode')}
          </Button>
        }
        query={query}
        caption={t('settings.paymentModes')}
        columns={columns}
        getRowKey={(mode) => mode.id}
        onPageChange={setPage}
        emptyIcon={Money}
        emptyMessage={t('settings.noModes')}
      />
      {editing && (
        <PaymentModeDialog
          key={editing === 'new' ? 'new' : editing.id}
          mode={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function PaymentModeDialog({ mode, onClose }: { mode?: PaymentMode; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [name, setName] = useState(mode?.name ?? '');
  const [sortOrder, setSortOrder] = useState(String(mode?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(mode?.isActive ?? true);
  const [nameError, setNameError] = useState<string>();
  const save = useChange(
    (body: { name: string; sortOrder: number; isActive: boolean }) =>
      mode ? chitApi.updatePaymentMode(mode.id, body) : chitApi.createPaymentMode(body),
    () => {
      toast({ tone: 'success', title: t('settings.modeSaved') });
      onClose();
    },
  );
  const submit = () => {
    if (name.trim().length < 2) {
      setNameError(t('settings.modeNameError'));
      return;
    }
    const order = Number.parseInt(sortOrder, 10);
    save.mutate({
      name: name.trim(),
      sortOrder: Number.isInteger(order) ? Math.min(Math.max(order, 0), 999) : 0,
      isActive,
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={mode ? t('settings.editMode') : t('settings.addMode')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            pending={save.isPending}
            pendingLabel={t('actions.saving')}
            requiresNetwork
            onClick={submit}
          >
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {save.error ? <InlineAlert tone="danger">{errorMessage(save.error)}</InlineAlert> : null}
        <Input
          label={t('form.name')}
          value={name}
          error={nameError}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label={t('settings.order')}
          hint={t('settings.orderHint')}
          inputMode="numeric"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
        <Checkbox
          label={t('settings.active')}
          description={t('settings.activeHint')}
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>
    </Dialog>
  );
}

function AppearanceSettings() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <Card title={t('settings.appearance')}>
      <div className="max-w-xs">
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
      </div>
    </Card>
  );
}
