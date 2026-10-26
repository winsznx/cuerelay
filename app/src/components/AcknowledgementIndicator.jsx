import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AcknowledgementIndicator({ acknowledged, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', acknowledged ? 'text-success' : 'text-muted', className)}>
      {acknowledged ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {acknowledged ? 'Acknowledged' : 'Not yet acknowledged'}
    </span>
  );
}
