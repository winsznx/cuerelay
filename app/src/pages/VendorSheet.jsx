import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Printer } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { LoadingRows } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatMinute, formatDuration } from '@/lib/time';
import { api, ApiError } from '@/api/functions';

export function VendorSheet() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get('invite');
  const [state, setState] = useState({ status: 'loading' });
  const [acking, setAcking] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      if (inviteId) {
        await api.acceptVendorInvitation({ vendorParticipantId: inviteId });
      }
      const data = await api.getVendorSheet(eventId);
      setState({ status: 'ready', ...data });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORBIDDEN') {
        setState({ status: 'forbidden', message: err.message });
      } else {
        setState({ status: 'error', message: err.message });
      }
    }
  }, [eventId, inviteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function acknowledge() {
    setAcking(true);
    try {
      await api.acknowledgeRevision({ eventId, revisionId: state.revision.id });
      setState((prev) => ({ ...prev, acknowledged: true, acknowledgedAt: new Date().toISOString() }));
    } catch {
      // acknowledgement failure is surfaced via the button staying available to retry
    } finally {
      setAcking(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas px-4 py-8">
        <LoadingRows count={5} />
      </div>
    );
  }

  if (state.status === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <BrandMark className="mb-8" />
        <EmptyState title="You're not on this event yet" description="Ask your coordinator to invite you, then use the link they send." />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-canvas px-4 py-8">
        <ErrorState message={state.message} onRetry={load} />
      </div>
    );
  }

  if (!state.published) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <BrandMark className="mb-8" />
        <EmptyState title="No schedule published yet" description={`${state.event.name} doesn't have a published schedule yet. Check back soon.`} />
      </div>
    );
  }

  const sortedCues = [...state.cues].sort((a, b) => a.startMinute - b.startMinute);

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <header className="border-b border-cue-border bg-surface px-5 py-5 print:hidden">
        <BrandMark />
      </header>

      <div className="mx-auto max-w-lg px-5 py-6">
        <h1 className="font-display text-2xl text-ink">{state.event.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {state.event.eventDateLocal} · {state.event.venueName}
        </p>
        <p className="mt-1 font-mono-time text-xs text-brand">
          v{state.revision.number} · Updated {new Date(state.revision.publishedAt).toLocaleString()}
        </p>
        {state.revision.changeReason && (
          <Card className="mt-4 bg-brand-soft/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-brand">What's changed</p>
            <p className="mt-1 text-sm text-ink">{state.revision.changeReason}</p>
          </Card>
        )}

        <div className="mt-6 space-y-2">
          {sortedCues.map((cue) => (
            <Card key={cue.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono-time text-sm font-semibold text-ink">{formatMinute(cue.startMinute)}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{cue.title}</p>
                  {cue.location && <p className="text-xs text-muted">{cue.location}</p>}
                </div>
                <span className="font-mono-time text-xs text-muted">{formatDuration(cue.durationMinutes)}</span>
              </div>
            </Card>
          ))}
        </div>

        <Button variant="secondary" className="mt-6 w-full gap-2 print:hidden" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print this sheet
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-cue-border bg-surface p-4 print:hidden">
        <div className="mx-auto max-w-lg">
          {state.acknowledged ? (
            <div className="flex items-center justify-center gap-2 rounded-control bg-success-soft py-3 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Acknowledged {new Date(state.acknowledgedAt).toLocaleTimeString()}
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={acknowledge} disabled={acking}>
              {acking ? 'Confirming…' : 'I have the latest schedule'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
