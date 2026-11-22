import { WarningFilled } from '@carbon/icons-react';
import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ICON_SIZE } from './icon';

export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  id?: string;
};

export type FieldControlProps = {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
};

/**
 * Label, hint and error text for a form control. Errors are always written
 * out under the field with an icon, never shown by a red border alone.
 */
export function Field({
  label,
  hint,
  error,
  optional,
  id: providedId,
  children,
}: FieldProps & { children: (control: FieldControlProps) => ReactNode }) {
  const { t } = useTranslation();
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body-sm font-medium text-text">
        {label}
        {optional && (
          <span className="font-normal text-text-secondary"> ({t('form.optional')})</span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-body-sm text-text-secondary">
          {hint}
        </p>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-body-sm text-danger">
          <WarningFilled size={ICON_SIZE.inline} aria-hidden className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
