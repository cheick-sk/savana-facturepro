import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'end', className }: DropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-1 outline-none focus:ring-2 focus:ring-primary-500/50 rounded-lg">
          {trigger}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          className={twMerge(
            clsx(
              'min-w-[180px] bg-white dark:bg-gray-800 rounded-xl shadow-lg',
              'border border-gray-100 dark:border-gray-700 p-1',
              'animate-scale-in z-50'
            ),
            className
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function DropdownItem({ children, icon, destructive, disabled, onSelect }: DropdownItemProps) {
  return (
    <DropdownMenu.Item
      className={twMerge(
        clsx(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none',
          'transition-colors',
          destructive
            ? 'text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20'
            : 'text-gray-700 dark:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )
      )}
      disabled={disabled}
      onSelect={onSelect}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </DropdownMenu.Item>
  );
}

export function DropdownSeparator() {
  return <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-gray-700 my-1" />;
}
