import { Checkmark } from '@carbon/icons-react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { useId } from 'react';
import { ICON_SIZE } from './icon';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
};

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  disabled,
  description,
}: CheckboxProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="flex min-h-11 items-start gap-3 py-2">
      <RadixCheckbox.Root
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        aria-describedby={descriptionId}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface text-on-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-60"
      >
        <RadixCheckbox.Indicator>
          <Checkmark size={ICON_SIZE.inline} aria-hidden />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <div className="flex flex-col">
        <label htmlFor={id} className="text-body text-text">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-body-sm text-text-secondary">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
