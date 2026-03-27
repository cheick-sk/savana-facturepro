import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  const initials = fallback
    ? fallback
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <AvatarPrimitive.Root
      className={twMerge(
        clsx(
          'relative inline-flex items-center justify-center rounded-full overflow-hidden',
          'bg-gradient-to-br from-primary-400 to-primary-600',
          sizes[size],
          className
        )
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt || fallback || 'Avatar'}
          className="h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback className="font-medium text-white">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  className?: string;
}

export function AvatarGroup({ children, max = 3, className }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className={twMerge('flex -space-x-2', className)}>
      {visibleChildren}
      {remainingCount > 0 && (
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
