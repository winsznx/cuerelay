import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-control border border-cue-border bg-surface px-3 text-sm text-ink transition-colors',
      'placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
