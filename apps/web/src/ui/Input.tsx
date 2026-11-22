import { type InputHTMLAttributes, type Ref } from 'react';
import { cn } from './cn';
import { controlClasses } from './control-classes';
import { Field, type FieldProps } from './Field';

export type InputProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { ref?: Ref<HTMLInputElement> };

export function Input({ label, hint, error, optional, id, className, ...props }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(control) => (
        <input {...control} className={cn(controlClasses(Boolean(error)), className)} {...props} />
      )}
    </Field>
  );
}
