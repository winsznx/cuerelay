import { cn } from '@/lib/utils';
import { formatMinute } from '@/lib/time';

export function TimePill({ minute, strike = false, tone = 'default', className }) {
  const toneClass = {
    default: 'bg-surface-raised text-ink border-cue-border',
    success: 'bg-success-soft text-success border-transparent',
    danger: 'bg-danger-soft text-danger border-transparent',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 font-mono-time text-xs font-medium tabular-nums',
        toneClass,
        strike && 'line-through opacity-60',
        className,
      )}
    >
      {formatMinute(minute)}
    </span>
  );
}
