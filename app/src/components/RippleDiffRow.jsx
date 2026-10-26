import { ArrowRight } from 'lucide-react';
import { TimePill } from '@/components/TimePill';
import { formatDelta } from '@/lib/time';

export function RippleDiffRow({ cue, explanation }) {
  const changed = explanation && explanation.deltaMinutes !== 0;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-cue-border bg-surface px-4 py-3">
      <span className="min-w-[10rem] flex-1 text-sm font-medium text-ink">{cue.title}</span>
      <TimePill minute={explanation?.previousStartMinute ?? cue.startMinute} strike={changed} tone="default" />
      {changed && (
        <>
          <ArrowRight className="h-3.5 w-3.5 text-muted" />
          <TimePill minute={explanation.proposedStartMinute} tone="success" />
          <span className="font-mono-time text-xs text-muted">{formatDelta(explanation.deltaMinutes)}</span>
        </>
      )}
      {explanation && (
        <p className="w-full text-xs text-muted">
          {explanation.kind === 'MANUAL_CHANGE' ? 'Manual change' : explanation.message}
        </p>
      )}
    </div>
  );
}
