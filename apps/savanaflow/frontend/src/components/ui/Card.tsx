import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: 'primary' | 'secondary' | 'none';
}

export function Card({ children, className, hover = false, gradient = 'none' }: CardProps) {
  const gradientClasses = {
    primary: 'bg-gradient-to-br from-primary-500/5 to-primary-500/10 dark:from-primary-500/10 dark:to-primary-500/20',
    secondary: 'bg-gradient-to-br from-secondary-500/5 to-secondary-500/10 dark:from-secondary-500/10 dark:to-secondary-500/20',
    none: 'bg-white dark:bg-gray-800',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl border border-gray-100 dark:border-gray-700 shadow-card',
          gradientClasses[gradient],
          hover && 'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1',
          className
        )
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={twMerge('px-6 py-4 border-b border-gray-100 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={twMerge('p-6', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={twMerge('px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-xl', className)}>
      {children}
    </div>
  );
}
