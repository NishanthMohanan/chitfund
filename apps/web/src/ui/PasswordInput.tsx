import { View, ViewOff } from '@carbon/icons-react';
import { type InputHTMLAttributes, type Ref, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';
import { Field, type FieldProps } from './Field';
import { ICON_SIZE } from './icon';

export type PasswordInputProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & { ref?: Ref<HTMLInputElement> };

export function PasswordInput({
  label,
  hint,
  error,
  optional,
  id,
  className,
  ...props
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? ViewOff : View;

  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(control) => (
        <div
          className={cn(
            'flex h-11 w-full items-stretch overflow-hidden rounded-sm border bg-surface',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
            error ? 'border-danger' : 'border-border-strong hover:border-text-secondary',
          )}
        >
          <input
            {...control}
            type={visible ? 'text' : 'password'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={cn(
              'min-w-0 flex-1 bg-transparent px-3 text-body text-text outline-none placeholder:text-text-muted',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-pressed={visible}
            aria-label={visible ? t('actions.hidePassword') : t('actions.showPassword')}
            className="flex w-11 shrink-0 items-center justify-center text-text-secondary hover:text-text"
          >
            <ToggleIcon size={ICON_SIZE.standalone} aria-hidden />
          </button>
        </div>
      )}
    </Field>
  );
}
