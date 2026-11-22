import { UserMultiple } from '@carbon/icons-react';
import { type Role } from '@chitfund/shared';
import { useTranslation } from 'react-i18next';
import { EmptySection } from '../common/EmptySection';

const EMPTY_MESSAGE = {
  MEMBER: 'empty.memberGroups',
  ORGANIZER: 'empty.organizerGroups',
  SUPERADMIN: 'empty.adminGroups',
} as const satisfies Record<Role, string>;

export function GroupsPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return <EmptySection icon={UserMultiple} message={t(EMPTY_MESSAGE[role])} />;
}
