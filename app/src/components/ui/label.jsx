import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Label = forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('text-xs font-medium uppercase tracking-wide text-muted', className)} {...props} />
));
Label.displayName = 'Label';

export { Label };
