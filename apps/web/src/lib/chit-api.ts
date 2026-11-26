import { type DueStatus, type GroupStatus, type Paginated } from '@chitfund/shared';
import { z } from 'zod';
import { apiRequest } from './api';

/**
 * Response shapes of the organizer API. Money arrives as decimal paise
 * strings and dates as ISO strings; `<Amount>` and `<DateText>` take both.
 */
type Paise = string;
type IsoDate = string;

export type MemberSummary = { id: string; name: string; phone: string };

export type LedgerSummary = {
  dueToDate: Paise;
  totalPaid: Paise;
  outstanding: Paise;
  advance: Paise;
  remainingForPlan: Paise;
  planTotal: Paise;
  oldestUnpaidMonth: number | null;
  paidThroughMonth: number;
};

export type LedgerRow = {
  monthNumber: number;
  dueDate: IsoDate;
  due: Paise;
  paid: Paise;
  balance: Paise;
  status: DueStatus;
};

export type TemplateMonth = { monthNumber: number; payoutAmount: Paise; isOrganizerMonth: boolean };

export type Template = {
  id: string;
  name: string;
  chitValue: Paise;
  memberCount: number;
  durationMonths: number;
  monthlyInstallment: Paise;
  archivedAt: IsoDate | null;
  groupCount: number;
};

export type TemplateDetail = Omit<Template, 'groupCount'> & { months: TemplateMonth[] };

export type GroupListItem = {
  id: string;
  name: string;
  code: string;
  chitValue: Paise;
  memberCount: number;
  durationMonths: number;
  monthlyInstallment: Paise;
  startDate: IsoDate;
  dueDayOfMonth: number;
  status: GroupStatus;
  endDate: IsoDate | null;
  filledTickets: number;
  payoutsDone: number;
};

export type GroupPayout = {
  id: string;
  amount: Paise;
  paidOn: IsoDate;
  ticketNumber: number;
  member: MemberSummary | null;
  modeName: string | null;
  reference: string | null;
  note: string | null;
};

export type GroupMonth = {
  id: string;
  monthNumber: number;
  dueDate: IsoDate;
  payoutAmount: Paise;
  isOrganizerMonth: boolean;
  isPast: boolean;
  payout: GroupPayout | null;
};

export type GroupDetail = Omit<GroupListItem, 'payoutsDone'> & {
  templateId: string | null;
  activatedAt: IsoDate | null;
  months: GroupMonth[];
};

export type PreviousHolder = {
  member: MemberSummary;
  fromMonth: number;
  leftAt: IsoDate;
  leftReason: string | null;
};

export type TicketSeat = {
  ticketNumber: number;
  ticket: {
    id: string;
    member: MemberSummary | null;
    payout: { monthNumber: number; amount: Paise; paidOn: IsoDate } | null;
    previousHolders: PreviousHolder[];
    ledger: LedgerSummary;
  } | null;
};

export type TicketDetail = {
  id: string;
  ticketNumber: number;
  member: MemberSummary | null;
  payout: { monthNumber: number; amount: Paise; paidOn: IsoDate; note: string | null } | null;
  group: { id: string; name: string; code: string; status: GroupStatus };
  ledger: LedgerSummary & { rows: LedgerRow[] };
};

export type CollectionRow = {
  ticketId: string;
  ticketNumber: number;
  member: MemberSummary | null;
  month: LedgerRow | undefined;
  outstanding: Paise;
  advance: Paise;
};

export type MonthCollection = Paginated<CollectionRow> & {
  month: { monthNumber: number; dueDate: IsoDate; payoutAmount: Paise; isOrganizerMonth: boolean };
};

export type Member = {
  id: string;
  createdAt: IsoDate;
  name: string;
  phone: string;
  phoneVerified: boolean;
  address: string | null;
  idProofType: string | null;
  idProofNumber: string | null;
  nomineeName: string | null;
  nomineePhone: string | null;
  notes: string | null;
};

export type MemberListItem = Member & { ticketCount: number };

export type MemberTicket = {
  ticketId: string;
  ticketNumber: number;
  current: boolean;
  fromMonth: number;
  leftAt: IsoDate | null;
  leftReason: string | null;
  group: {
    id: string;
    name: string;
    code: string;
    status: GroupStatus;
    monthlyInstallment: Paise;
  };
  payout: { monthNumber: number; amount: Paise; paidOn: IsoDate } | null;
  ledger: LedgerSummary;
};

export type MemberDetail = Member & { tickets: MemberTicket[] };

export type PaymentMode = { id: string; name: string; isActive: boolean; sortOrder: number };

export type Payment = {
  id: string;
  ticketId: string;
  amount: Paise;
  reference: string | null;
  note: string | null;
  paidOn: IsoDate;
  markedAt: IsoDate;
  reversedAt: IsoDate | null;
  reversalReason: string | null;
  mode: { id: string; name: string };
  payer: { id: string; name: string };
  ticket: { id: string; ticketNumber: number; group: { id: string; name: string; code: string } };
};

export type Dashboard = {
  activeGroups: number;
  draftGroups: number;
  memberCount: number;
  outstanding: Paise;
  advance: Paise;
  defaulters: number;
  thisMonth: {
    label: string;
    expected: Paise;
    receivedForMonth: Paise;
    collected: Paise;
    ticketsDue: number;
    ticketsPaid: number;
  };
  payoutsPending: {
    groupId: string;
    groupName: string;
    monthNumber: number;
    dueDate: IsoDate;
    payoutAmount: Paise;
  }[];
  endingSoon: { id: string; name: string; code: string; endDate: IsoDate; monthsLeft: number }[];
};

export type DueRow = {
  ticketId: string;
  ticketNumber: number;
  member: MemberSummary | null;
  group: { id: string; name: string; code: string };
  payout: { monthNumber: number; amount: Paise } | null;
  outstanding: Paise;
  advance: Paise;
  totalPaid: Paise;
  remainingForPlan: Paise;
  oldestUnpaidMonth: number | null;
  oldestUnpaidDueDate: IsoDate | null;
  monthsBehind: number;
};

export type SessionUser = { id: string; name: string; role: string; lastLoginAt: IsoDate | null };

/**
 * The API is ours and typed on the server; responses are taken as the shapes
 * above rather than re-validated field by field.
 */
function shape<T>() {
  return z.custom<T>(() => true);
}

type Query = Record<string, string | number | undefined>;

function withQuery(path: string, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

const get = <T>(path: string, query?: Query, signal?: AbortSignal) =>
  apiRequest(withQuery(path, query), { schema: shape<T>(), signal });

const send = <T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown) =>
  apiRequest(path, { method, body: body ?? {}, schema: shape<T>() });

export const chitApi = {
  me: (signal?: AbortSignal) => get<SessionUser>('/auth/me', undefined, signal),
  logout: () => apiRequest('/auth/logout', { method: 'POST', schema: z.null() }),

  dashboard: (signal?: AbortSignal) => get<Dashboard>('/dashboard', undefined, signal),
  dues: (query: Query, signal?: AbortSignal) => get<Paginated<DueRow>>('/dues', query, signal),

  templates: (query: Query, signal?: AbortSignal) =>
    get<Paginated<Template>>('/templates', query, signal),
  template: (id: string, signal?: AbortSignal) =>
    get<TemplateDetail>(`/templates/${id}`, undefined, signal),
  createTemplate: (body: unknown) => send<TemplateDetail>('POST', '/templates', body),
  updateTemplate: (id: string, body: unknown) =>
    send<TemplateDetail>('PUT', `/templates/${id}`, body),
  archiveTemplate: (id: string) => send<Template>('POST', `/templates/${id}/archive`),
  restoreTemplate: (id: string) => send<Template>('POST', `/templates/${id}/restore`),

  groups: (query: Query, signal?: AbortSignal) =>
    get<Paginated<GroupListItem>>('/groups', query, signal),
  group: (id: string, signal?: AbortSignal) => get<GroupDetail>(`/groups/${id}`, undefined, signal),
  createGroup: (body: unknown) => send<{ id: string }>('POST', '/groups', body),
  updateGroup: (id: string, body: unknown) => send<{ id: string }>('PATCH', `/groups/${id}`, body),
  changeGroupStatus: (id: string, status: GroupStatus) =>
    send<{ id: string }>('POST', `/groups/${id}/status`, { status }),
  updateGroupMonth: (id: string, month: number, body: unknown) =>
    send<{ id: string }>('PATCH', `/groups/${id}/months/${month}`, body),
  groupTickets: (id: string, query: Query, signal?: AbortSignal) =>
    get<Paginated<TicketSeat>>(`/groups/${id}/tickets`, query, signal),
  ticket: (groupId: string, ticketId: string, signal?: AbortSignal) =>
    get<TicketDetail>(`/groups/${groupId}/tickets/${ticketId}`, undefined, signal),
  assignTicket: (groupId: string, ticketNumber: number, memberId: string) =>
    send<{ id: string }>('PUT', `/groups/${groupId}/tickets/${ticketNumber}`, { memberId }),
  replaceMember: (groupId: string, ticketNumber: number, body: unknown) =>
    send<{ id: string }>('POST', `/groups/${groupId}/tickets/${ticketNumber}/replace`, body),
  monthCollection: (groupId: string, month: number, query: Query, signal?: AbortSignal) =>
    get<MonthCollection>(`/groups/${groupId}/months/${month}/collection`, query, signal),
  recordPayout: (groupId: string, body: unknown) =>
    send<{ id: string }>('POST', `/groups/${groupId}/payouts`, body),

  members: (query: Query, signal?: AbortSignal) =>
    get<Paginated<MemberListItem>>('/members', query, signal),
  member: (id: string, signal?: AbortSignal) =>
    get<MemberDetail>(`/members/${id}`, undefined, signal),
  createMember: (body: unknown) => send<Member>('POST', '/members', body),
  updateMember: (id: string, body: unknown) => send<Member>('PATCH', `/members/${id}`, body),

  paymentModes: (query: Query, signal?: AbortSignal) =>
    get<Paginated<PaymentMode>>('/payment-modes', query, signal),
  createPaymentMode: (body: unknown) => send<PaymentMode>('POST', '/payment-modes', body),
  updatePaymentMode: (id: string, body: unknown) =>
    send<PaymentMode>('PATCH', `/payment-modes/${id}`, body),

  payments: (query: Query, signal?: AbortSignal) =>
    get<Paginated<Payment>>('/payments', query, signal),
  recordPayment: (body: unknown) => send<{ id: string }>('POST', '/payments', body),
  reversePayment: (id: string, reason: string) =>
    send<{ id: string }>('POST', `/payments/${id}/reverse`, { reason }),
};
