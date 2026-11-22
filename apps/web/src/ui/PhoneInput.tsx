import { type InputHTMLAttributes, type Ref } from 'react';
import { cn } from './cn';
import { Field, type FieldProps } from './Field';

export type PhoneInputProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & { ref?: Ref<HTMLInputElement> };

/** Indian mobile number entry. The server normalises whatever is typed to +91 E.164. */
export function PhoneInput({
  label,
  hint,
  error,
  optional,
  id,
  className,
  ...props
}: PhoneInputProps) {
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
          <span
            aria-hidden
            className="flex items-center border-r border-border bg-surface-muted px-3 font-mono text-body text-text-secondary tabular"
          >
            +91
          </span>
          <input
            {...control}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={16}
            className={cn(
              'min-w-0 flex-1 bg-transparent px-3 font-mono text-body text-text tabular outline-none placeholder:text-text-muted',
              className,
            )}
            {...props}
          />
        </div>
      )}
    </Field>
  );
}
