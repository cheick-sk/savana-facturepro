import * as SelectPrimitive from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Check, ChevronDown } from 'lucide-react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}

export function Select({ value, onValueChange, placeholder = 'Select...', children, className }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={twMerge(
          clsx(
            'inline-flex items-center justify-between gap-2 w-full px-4 py-2.5 text-sm',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
            'placeholder:text-gray-400 transition-all duration-200',
            className
          )
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 animate-scale-in z-50"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectItem({ value, children, disabled }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none',
        'text-gray-700 dark:text-gray-300',
        'focus:bg-gray-100 dark:focus:bg-gray-700',
        'data-[state=checked]:bg-primary-50 dark:data-[state=checked]:bg-primary-900/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <SelectPrimitive.ItemIndicator>
        <Check className="w-4 h-4 text-primary-500" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
