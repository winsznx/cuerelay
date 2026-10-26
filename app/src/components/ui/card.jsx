import { cn } from '@/lib/utils';

export function Card({ className, elevated = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-card border border-cue-border bg-surface',
        elevated && 'shadow-card',
        className,
      )}
      {...props}
    />
  );
}
