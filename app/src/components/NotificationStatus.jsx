import { cn } from '@/lib/utils';

const STYLES = {
  pending: 'bg-surface-raised text-muted',
  sent: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  queued: 'bg-surface-raised text-muted',
  processing: 'bg-warning-soft text-warning',
  partial: 'bg-warning-soft text-warning',
};

const LABELS = {
  pending: 'Not sent',
  sent: 'Sent',
  failed: 'Failed',
  queued: 'Queued',
  processing: 'Sending…',
  partial: 'Partially sent',
};

export function NotificationStatus({ status, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[status] ?? STYLES.pending, className)}>
      {LABELS[status] ?? status}
    </span>
  );
}
