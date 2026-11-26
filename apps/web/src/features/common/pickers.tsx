import { maskPhone } from '@chitfund/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PICKER_PAGE } from '../../lib/form-helpers';
import { chitApi } from '../../lib/chit-api';
import { Input } from '../../ui/Input';
import { Select, type SelectOption } from '../../ui/Select';

/** Search members by name or mobile number, then choose one. */
export function MemberPicker({
  value,
  onChange,
  error,
  excludeId,
}: {
  value: string;
  onChange: (memberId: string) => void;
  error?: string;
  excludeId?: string;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const members = useQuery({
    queryKey: ['members', 'picker', search],
    queryFn: ({ signal }) => chitApi.members({ ...PICKER_PAGE, search }, signal),
    placeholderData: keepPreviousData,
  });
  const options: SelectOption[] = [
    { value: '', label: members.isPending ? t('form.loading') : t('form.chooseMember') },
    ...(members.data?.items ?? [])
      .filter((member) => member.id !== excludeId)
      .map((member) => ({
        value: member.id,
        label: `${member.name} · ${maskPhone(member.phone)}`,
      })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={t('form.searchMembers')}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        label={t('form.member')}
        value={value}
        error={error}
        options={options}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
