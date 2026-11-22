import { zodResolver } from '@hookform/resolvers/zod';
import { Role, passwordSchema, phoneSchema } from '@chitfund/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { ROLE_HOME } from '../../app/navigation';
import { ApiError, NetworkError, apiRequest } from '../../lib/api';
import { Button } from '../../ui/Button';
import { InlineAlert } from '../../ui/InlineAlert';
import { PasswordInput } from '../../ui/PasswordInput';
import { PhoneInput } from '../../ui/PhoneInput';

const signInFormSchema = z.object({ phone: phoneSchema, password: passwordSchema });
type SignInForm = z.input<typeof signInFormSchema>;

const signInResponseSchema = z.object({
  user: z.object({ role: z.nativeEnum(Role) }),
});

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm<SignInForm>({
    resolver: zodResolver(signInFormSchema),
    mode: 'onBlur',
    defaultValues: { phone: '', password: '' },
  });

  const signIn = useMutation({
    mutationFn: (values: SignInForm) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: signInFormSchema.parse(values),
        schema: signInResponseSchema,
      }),
    onSuccess: ({ user }) => navigate(ROLE_HOME[user.role], { replace: true }),
  });

  const failure =
    signIn.error instanceof NetworkError
      ? t('auth.serverUnavailable')
      : signIn.error instanceof ApiError && signIn.error.status < 500
        ? t('auth.signInFailed')
        : signIn.error
          ? t('auth.serverUnavailable')
          : null;

  return (
    <div className="min-h-dvh bg-bg pt-safe">
      <main className="mx-auto flex w-full max-w-sm flex-col px-safe pb-12 pt-12 lg:pt-24">
        <div className="mb-8 flex items-center gap-2">
          <img src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-h3 font-semibold text-text">{t('app.name')}</span>
        </div>
        <h1 className="text-h2 font-semibold text-text">{t('auth.signInTitle')}</h1>
        <p className="mt-1 text-body-sm text-text-secondary">{t('auth.signInSubtitle')}</p>

        <form
          noValidate
          onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
          className="mt-6 flex flex-col gap-4"
        >
          {failure && <InlineAlert tone="danger">{failure}</InlineAlert>}
          <PhoneInput
            label={t('form.phoneLabel')}
            hint={t('form.phoneHint')}
            error={form.formState.errors.phone?.message}
            {...form.register('phone')}
          />
          <PasswordInput
            label={t('form.passwordLabel')}
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Button
            type="submit"
            fullWidth
            requiresNetwork
            pending={signIn.isPending}
            pendingLabel={t('auth.signingIn')}
          >
            {t('actions.signIn')}
          </Button>
        </form>
      </main>
    </div>
  );
}
