import {
  type Paise,
  dividePaiseExactly,
  formatINR,
  multiplyPaise,
  paiseToString,
  parseRupeesToPaise,
  templateInputSchema,
} from '@chitfund/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { errorMessage, paiseToRupees, useChange } from '../../lib/form-helpers';
import { type TemplateDetail, chitApi } from '../../lib/chit-api';
import { Amount } from '../../ui/Amount';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { InlineAlert } from '../../ui/InlineAlert';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { useToast } from '../../ui/toast-context';
import { QueryBoundary } from '../common/shared';

const DEFAULT_MEMBERS = 20;

type PlanState = {
  name: string;
  chitValue: string;
  memberCount: string;
  installment: string;
  /** Payout for months 2..N, as typed rupees. Month 1 is always commission. */
  payouts: string[];
};

type Errors = Partial<Record<'name' | 'chitValue' | 'memberCount' | 'installment', string>> & {
  payouts: Record<number, string>;
};

function initialState(plan?: TemplateDetail): PlanState {
  if (!plan) {
    return {
      name: '',
      chitValue: '',
      memberCount: String(DEFAULT_MEMBERS),
      installment: '',
      payouts: Array.from({ length: DEFAULT_MEMBERS }, () => ''),
    };
  }
  return {
    name: plan.name,
    chitValue: paiseToRupees(plan.chitValue),
    memberCount: String(plan.memberCount),
    installment: paiseToRupees(plan.monthlyInstallment),
    payouts: plan.months
      .filter((month) => month.monthNumber > 1)
      .sort((a, b) => a.monthNumber - b.monthNumber)
      .map((month) => paiseToRupees(month.payoutAmount)),
  };
}

const rupees = (value: string) => parseRupeesToPaise(value);
const toRupees = (paise: Paise) => paiseToRupees(paiseToString(paise));

function parseMembers(value: string): number | null {
  const count = Number.parseInt(value, 10);
  return Number.isInteger(count) && count >= 2 && count <= 200 ? count : null;
}

/**
 * Chit value is always members × installment. Whichever side was typed last
 * drives the other; a chit value that does not split into whole paise leaves
 * the installment alone and is flagged on submit.
 */
function fromInstallment(state: PlanState): PlanState {
  const count = parseMembers(state.memberCount);
  const installment = rupees(state.installment);
  if (count === null || installment === null) return state;
  return { ...state, chitValue: toRupees(multiplyPaise(installment, count)) };
}

function fromChitValue(state: PlanState): PlanState {
  const count = parseMembers(state.memberCount);
  const chitValue = rupees(state.chitValue);
  if (count === null || chitValue === null) return state;
  const installment = dividePaiseExactly(chitValue, count);
  return installment === null ? state : { ...state, installment: toRupees(installment) };
}

export function PlanFormPage() {
  const { planId } = useParams();
  const query = useQuery({
    queryKey: ['templates', planId],
    enabled: Boolean(planId),
    queryFn: ({ signal }) => chitApi.template(planId ?? '', signal),
  });
  if (!planId) {
    return <PlanForm />;
  }
  return <QueryBoundary query={query}>{(plan) => <PlanForm plan={plan} />}</QueryBoundary>;
}

function PlanForm({ plan }: { plan?: TemplateDetail }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState<PlanState>(() => initialState(plan));
  const [errors, setErrors] = useState<Errors>({ payouts: {} });

  const members = Number.parseInt(state.memberCount, 10);
  const validMembers = Number.isInteger(members) && members >= 2 && members <= 200;
  const installment = rupees(state.installment);
  const collection = validMembers && installment !== null ? installment * BigInt(members) : null;

  const setMembers = (value: string) => {
    const count = parseMembers(value);
    setState((current) => {
      const next: PlanState = {
        ...current,
        memberCount: value,
        payouts:
          count !== null
            ? Array.from({ length: count }, (_, index) => current.payouts[index] ?? '')
            : current.payouts,
      };
      // The installment is the fixed monthly figure, so it wins when both are set.
      return rupees(next.installment) !== null ? fromInstallment(next) : fromChitValue(next);
    });
  };

  const save = useChange(
    (body: unknown) =>
      plan ? chitApi.updateTemplate(plan.id, body) : chitApi.createTemplate(body),
    (saved) => {
      toast({ tone: 'success', title: plan ? t('plans.updated') : t('plans.created') });
      navigate(`/plans/${saved.id}`, { replace: true });
    },
  );
  const archive = useChange(
    (archived: boolean) =>
      archived ? chitApi.archiveTemplate(plan?.id ?? '') : chitApi.restoreTemplate(plan?.id ?? ''),
    (_result, archived) =>
      toast({
        tone: 'success',
        title: archived ? t('plans.archivedToast') : t('plans.restoredToast'),
      }),
  );

  const submit = () => {
    const next: Errors = { payouts: {} };
    if (state.name.trim().length < 2) next.name = t('plans.errors.name');
    if (!validMembers) next.memberCount = t('plans.errors.members');
    const chitValue = rupees(state.chitValue);
    if (chitValue === null || chitValue <= 0n) next.chitValue = t('plans.errors.amount');
    if (installment === null || installment <= 0n) next.installment = t('plans.errors.amount');
    if (!next.chitValue && !next.installment && collection !== null && chitValue !== collection) {
      next.chitValue = t('plans.errors.chitValueMismatch', {
        amount: formatINR(collection),
        members,
      });
    }
    state.payouts.forEach((value, index) => {
      if (rupees(value) === null) next.payouts[index] = t('plans.errors.amount');
    });
    const hasErrors =
      Boolean(next.name || next.memberCount || next.chitValue || next.installment) ||
      Object.keys(next.payouts).length > 0;
    if (hasErrors || chitValue === null || installment === null) {
      setErrors(next);
      return;
    }

    const body = {
      name: state.name.trim(),
      chitValue: chitValue.toString(),
      memberCount: members,
      durationMonths: members + 1,
      monthlyInstallment: installment.toString(),
      months: [
        { monthNumber: 1, payoutAmount: '0', isOrganizerMonth: true },
        ...state.payouts.map((value, index) => ({
          monthNumber: index + 2,
          payoutAmount: (rupees(value) ?? 0n).toString(),
          isOrganizerMonth: false,
        })),
      ],
    };
    // The shared schema holds the plan-shape rules the server enforces.
    const checked = templateInputSchema.safeParse(body);
    if (!checked.success) {
      for (const issue of checked.error.issues) {
        const [field, index] = issue.path;
        if (field === 'months' && typeof index === 'number' && index > 0) {
          next.payouts[index - 1] = issue.message;
        } else if (field === 'name') {
          next.name = issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setErrors({ payouts: {} });
    save.mutate(body);
  };

  const message = errorMessage(save.error) ?? errorMessage(archive.error);
  const fieldError = (key: keyof Omit<Errors, 'payouts'>) => errors[key];

  return (
    <>
      <PageHeader
        title={plan ? plan.name : t('plans.newTitle')}
        description={plan ? t('plans.editDescription') : t('plans.newDescription')}
        actions={
          plan && (
            <Button
              variant="secondary"
              pending={archive.isPending}
              requiresNetwork
              onClick={() => archive.mutate(!plan.archivedAt)}
            >
              {plan.archivedAt ? t('plans.restore') : t('plans.archive')}
            </Button>
          )
        }
      />
      <div className="flex max-w-4xl flex-col gap-6">
        {message && <InlineAlert tone="danger">{message}</InlineAlert>}
        {plan?.archivedAt && <InlineAlert tone="warning">{t('plans.archivedNotice')}</InlineAlert>}
        <Card title={t('plans.basics')}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={t('form.name')}
              value={state.name}
              error={fieldError('name')}
              onChange={(event) => setState({ ...state, name: event.target.value })}
            />
            <Input
              label={t('plans.chitValueRupees')}
              inputMode="decimal"
              value={state.chitValue}
              error={fieldError('chitValue')}
              hint={t('plans.chitValueHint')}
              onChange={(event) =>
                setState(fromChitValue({ ...state, chitValue: event.target.value }))
              }
            />
            <Input
              label={t('plans.memberCount')}
              inputMode="numeric"
              value={state.memberCount}
              error={fieldError('memberCount')}
              hint={validMembers ? t('plans.durationHint', { months: members + 1 }) : undefined}
              onChange={(event) => setMembers(event.target.value)}
            />
            <Input
              label={t('plans.installmentRupees')}
              inputMode="decimal"
              value={state.installment}
              error={fieldError('installment')}
              hint={
                collection !== null
                  ? t('plans.collectionHint', { amount: formatINR(collection) })
                  : undefined
              }
              onChange={(event) =>
                setState(fromInstallment({ ...state, installment: event.target.value }))
              }
            />
          </div>
        </Card>

        <Card flush title={t('plans.schedule')} description={t('plans.scheduleDescription')}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">{t('plans.schedule')}</caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th scope="col" className="h-10 px-4 text-left font-medium text-text-secondary">
                    {t('groups.month')}
                  </th>
                  <th scope="col" className="h-10 px-4 text-left font-medium text-text-secondary">
                    {t('plans.payoutRupees')}
                  </th>
                  <th scope="col" className="h-10 px-4 text-right font-medium text-text-secondary">
                    {t('plans.toPool')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 tabular">1</td>
                  <td className="px-4 py-3 text-text-secondary">{t('plans.commissionMonth')}</td>
                  <td className="px-4 py-3 text-right">
                    {collection !== null && (
                      <span className="text-text-secondary">
                        {t('plans.commissionAmount', { amount: formatINR(collection) })}
                      </span>
                    )}
                  </td>
                </tr>
                {state.payouts.map((value, index) => {
                  const payout = rupees(value);
                  const leftover =
                    collection !== null && payout !== null ? collection - payout : null;
                  return (
                    <tr key={index} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 align-top tabular">
                        <span className="inline-block pt-3">{index + 2}</span>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          label={t('plans.payoutForMonth', { month: index + 2 })}
                          className="max-w-48"
                          inputMode="decimal"
                          value={value}
                          error={errors.payouts[index]}
                          onChange={(event) =>
                            setState((current) => ({
                              ...current,
                              payouts: current.payouts.map((item, i) =>
                                i === index ? event.target.value : item,
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right align-top">
                        <span className="inline-block pt-9">
                          {leftover !== null && <Amount value={leftover < 0n ? 0n : leftover} />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/plans')}>
            {t('actions.cancel')}
          </Button>
          <Button
            pending={save.isPending}
            pendingLabel={t('actions.saving')}
            requiresNetwork
            onClick={submit}
          >
            {plan ? t('actions.saveChanges') : t('plans.create')}
          </Button>
        </div>
      </div>
    </>
  );
}
