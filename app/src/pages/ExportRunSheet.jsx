import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { AppShell, TopBar } from '@/components/AppShell';
import { ErrorState } from '@/components/ErrorState';
import { LoadingRows } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { formatMinute, formatDuration } from '@/lib/time';
import { api } from '@/api/functions';

export function ExportRunSheet() {
  const { eventId } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(() => {
    setState((p) => ({ ...p, status: 'loading' }));
    api
      .getCoordinatorEvent(eventId)
      .then((data) => setState({ status: 'ready', ...data }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [eventId]);

  useEffect(load, [load]);

  if (state.status === 'loading') {
    return (
      <AppShell>
        <TopBar><div className="h-5 w-40 animate-pulse rounded bg-cue-border/60" /></TopBar>
        <div className="p-6"><LoadingRows count={6} /></div>
      </AppShell>
    );
  }
  if (state.status === 'error') {
    return (
      <AppShell>
        <div className="p-6"><ErrorState message={state.message} onRetry={load} /></div>
      </AppShell>
    );
  }

  const { event, cues, currentRevision } = state;
  const sortedCues = [...cues].sort((a, b) => a.startMinute - b.startMinute);

  return (
    <AppShell>
      <TopBar className="print:hidden">
        <h1 className="font-display text-xl text-ink">Master run sheet</h1>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
      </TopBar>

      <div className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
        <div className="mb-8 border-b border-cue-border pb-6 print:border-black">
          <h2 className="font-display text-2xl text-ink">{event.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {event.eventDateLocal} · {event.timezone} · {event.venueName}
          </p>
          <p className="mt-1 font-mono-time text-xs text-muted">
            {currentRevision ? `Published v${currentRevision.number}` : 'Working draft — not yet published'}
            {currentRevision && ` · ${new Date(currentRevision.publishedAt).toLocaleString()}`}
          </p>
        </div>

        <div className="space-y-0 divide-y divide-cue-border print:divide-black">
          {sortedCues.map((cue) => (
            <div key={cue.id} className="flex items-start gap-4 py-3 break-inside-avoid">
              <span className="w-24 shrink-0 font-mono-time text-sm tabular-nums text-ink">{formatMinute(cue.startMinute)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{cue.title}</p>
                <p className="text-xs text-muted">
                  {formatDuration(cue.durationMinutes)}
                  {cue.location && ` · ${cue.location}`}
                  {cue.mode === 'FIXED' && ' · Fixed'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
