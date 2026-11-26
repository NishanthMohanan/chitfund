import { zodResolver } from '@hookform/resolvers/zod';
import { phoneSchema } from '@chitfund/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { applyFieldErrors, errorMessage, nationalPhone, useChange } from '../../lib/form-helpers';
import { type Member, chitApi } from '../../lib/chit-api';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { InlineAlert } from '../../ui/InlineAlert';
import { Input } from '../../ui/Input';
import { PhoneInput } from '../../ui/PhoneInput';
import { Textarea } from '../../ui/Textarea';
import { useToast } from '../../ui/toast-context';

const formSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  phone: phoneSchema,
  address: z.string().max(500),
  idProofType: z.string().max(60),
  idProofNumber: z.string().max(60),
  nomineeName: z.string().max(120),
  nomineePhone: z.union([phoneSchema, z.literal('')]),
  notes: z.string().max(1000),
});
type MemberForm = z.input<typeof formSchema>;

function defaultsFor(member?: Member): MemberForm {
  return {
    name: member?.name ?? '',
    phone: nationalPhone(member?.phone ?? null),
    address: member?.address ?? '',
    idProofType: member?.idProofType ?? '',
    idProofNumber: member?.idProofNumber ?? '',
    nomineeName: member?.nomineeName ?? '',
    nomineePhone: nationalPhone(member?.nomineePhone ?? null),
    notes: member?.notes ?? '',
  };
}

/** Add a member, or edit one when `member` is given. */
export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member;
  onSaved?: (member: Member) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useForm<MemberForm>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: defaultsFor(member),
  });
  const save = useChange(
    (values: MemberForm) => {
      const body = formSchema.parse(values);
      return member ? chitApi.updateMember(member.id, body) : chitApi.createMember(body);
    },
    (saved) => {
      toast({ tone: 'success', title: member ? t('members.updated') : t('members.added') });
      onOpenChange(false);
      onSaved?.(saved);
    },
  );
  const errors = form.formState.errors;
  const message = errorMessage(save.error);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? t('members.editTitle') : t('members.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            pending={save.isPending}
            pendingLabel={t('actions.saving')}
            requiresNetwork
            onClick={form.handleSubmit((values) =>
              save.mutate(values, { onError: (error) => applyFieldErrors(form, error) }),
            )}
          >
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
        {message && <InlineAlert tone="danger">{message}</InlineAlert>}
        <Input label={t('form.name')} error={errors.name?.message} {...form.register('name')} />
        <PhoneInput
          label={t('form.phoneLabel')}
          hint={t('form.phoneHint')}
          error={errors.phone?.message}
          {...form.register('phone')}
        />
        <Textarea label={t('form.address')} optional rows={2} {...form.register('address')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('form.idProofType')} optional {...form.register('idProofType')} />
          <Input label={t('form.idProofNumber')} optional {...form.register('idProofNumber')} />
          <Input label={t('form.nomineeName')} optional {...form.register('nomineeName')} />
          <PhoneInput
            label={t('form.nomineePhone')}
            optional
            error={errors.nomineePhone?.message}
            {...form.register('nomineePhone')}
          />
        </div>
        <Textarea label={t('form.notes')} optional rows={2} {...form.register('notes')} />
      </form>
    </Dialog>
  );
}
