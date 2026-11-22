import * as RadixSwitch from '@radix-ui/react-switch';
import { useId } from 'react';

export type SwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
};

export function Switch({ label, checked, onCheckedChange, disabled, description }: SwitchProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
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
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={descriptionId}
        className="relative h-6 w-11 shrink-0 rounded-lg border border-border-strong bg-surface-muted transition-colors duration-150 ease-out data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-60"
      >
        <RadixSwitch.Thumb className="block h-4 w-4 translate-x-1 rounded-sm bg-text-secondary transition-transform duration-150 ease-out data-[state=checked]:translate-x-6 data-[state=checked]:bg-on-primary" />
      </RadixSwitch.Root>
    </div>
  );
}
