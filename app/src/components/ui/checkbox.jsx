import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      'h-5 w-5 shrink-0 rounded-[4px] border flex items-center justify-center transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-brand border-brand text-white' : 'bg-surface border-cue-border',
      className,
    )}
    {...props}
  >
    {checked && <Check className="h-3.5 w-3.5" />}
  </button>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
