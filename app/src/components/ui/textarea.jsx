import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex w-full rounded-control border border-cue-border bg-surface px-3 py-2 text-sm text-ink transition-colors',
      'placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
