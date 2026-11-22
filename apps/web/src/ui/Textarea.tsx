import { type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { controlClasses } from './control-classes';
import { Field, type FieldProps } from './Field';

export type TextareaProps = FieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & { ref?: Ref<HTMLTextAreaElement> };

export function Textarea({
  label,
  hint,
  error,
  optional,
  id,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(control) => (
        <textarea
          {...control}
          rows={rows}
          className={cn(controlClasses(Boolean(error)), 'h-auto min-h-24 py-2', className)}
          {...props}
        />
      )}
    </Field>
  );
}
