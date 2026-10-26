import { cn } from '@/lib/utils';

export function VersionBadge({ number, status = 'published', className }) {
  const label = status === 'draft' ? 'Working draft' : `v${number}`;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono-time text-xs font-medium',
        status === 'draft' ? 'bg-warning-soft text-warning' : 'bg-brand-soft text-brand',
        className,
      )}
    >
      {label}
    </span>
  );
}
