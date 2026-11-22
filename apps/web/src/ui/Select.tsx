import { ChevronDown } from '@carbon/icons-react';
import { type Ref, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';
import { controlClasses } from './control-classes';
import { Field, type FieldProps } from './Field';
import { ICON_SIZE } from './icon';

export type SelectOption = { value: string; label: string };

export type SelectProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> & {
    options: readonly SelectOption[];
    ref?: Ref<HTMLSelectElement>;
  };

/** Native select: phones show their own accessible picker, which beats any custom menu. */
export function Select({
  label,
  hint,
  error,
  optional,
  id,
  options,
  className,
  ...props
}: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(control) => (
        <div className="relative">
          <select
            {...control}
            className={cn(controlClasses(Boolean(error)), 'appearance-none pr-10', className)}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={ICON_SIZE.inline}
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
        </div>
      )}
    </Field>
  );
}
