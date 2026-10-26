import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-danger-soft bg-danger-soft/60 p-5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Something went wrong</p>
        <p className="mt-0.5 text-sm text-muted">{message || 'Please try again.'}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
