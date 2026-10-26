import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand/90',
  secondary: 'bg-surface text-ink border border-cue-border hover:bg-surface-raised',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const SIZES = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-10 w-10',
};

const Button = forwardRef(({ className, variant = 'primary', size = 'default', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      'disabled:pointer-events-none disabled:opacity-50',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = 'Button';

export { Button };
