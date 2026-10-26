import { Lock, MapPin } from 'lucide-react';
import { TimePill } from '@/components/TimePill';
import { formatDuration } from '@/lib/time';
import { cn } from '@/lib/utils';

export function CueRow({ cue, onClick, selected }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full min-h-[44px] items-center gap-3 rounded-control border px-4 py-3 text-left transition-colors',
        selected ? 'border-brand bg-brand-soft/60' : 'border-cue-border bg-surface hover:bg-surface-raised',
      )}
    >
      <TimePill minute={cue.startMinute} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-ink">{cue.title}</p>
          {cue.mode === 'FIXED' && <Lock className="h-3 w-3 shrink-0 text-muted" aria-label="Fixed time" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="font-mono-time">{formatDuration(cue.durationMinutes)}</span>
          {cue.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {cue.location}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
