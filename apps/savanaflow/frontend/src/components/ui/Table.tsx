import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className={twMerge('w-full text-sm text-left', className)}>
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={twMerge('text-xs uppercase bg-gray-50 dark:bg-gray-800', className)}>
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={twMerge(className)}>{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      className={twMerge(
        clsx(
          'border-b border-gray-100 dark:border-gray-800 transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          onClick && 'cursor-pointer',
          className
        )
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}

export function TableHead({ children, className, colSpan }: TableHeadProps) {
  return (
    <th colSpan={colSpan} className={twMerge('px-4 py-3 font-semibold text-gray-700 dark:text-gray-300', className)}>
      {children}
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}

export function TableCell({ children, className, colSpan }: TableCellProps) {
  return (
    <td colSpan={colSpan} className={twMerge('px-4 py-3 text-gray-600 dark:text-gray-400', className)}>
      {children}
    </td>
  );
}
