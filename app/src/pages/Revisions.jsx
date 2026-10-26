import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { History } from 'lucide-react';
import { AppShell, TopBar } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingRows } from '@/components/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { api } from '@/api/functions';

export function Revisions() {
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
        <div className="p-6"><LoadingRows count={3} /></div>
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

  const { revisions, event, attention } = state;

  return (
    <AppShell>
      <TopBar>
        <h1 className="font-display text-xl text-ink">Revision history</h1>
      </TopBar>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {revisions.length === 0 ? (
          <EmptyState icon={History} title="Nothing published yet" description="Publish your first revision from the rundown to see it here." />
        ) : (
          <div className="space-y-3">
            {revisions.map((rev) => {
              const isCurrent = rev.id === event.currentPublishedRevisionId;
              const affectedCount = JSON.parse(rev.changedCueIdsJson || '[]').length;
              return (
                <Card key={rev.id} elevated={isCurrent} className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-time text-sm font-semibold text-brand">v{rev.number}</span>
                    {isCurrent && <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Current</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{rev.changeReason || 'No reason recorded'}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(rev.publishedAt).toLocaleString()} · {affectedCount} cue{affectedCount === 1 ? '' : 's'} changed
                  </p>
                  {isCurrent && attention && (
                    <p className="mt-2 text-xs text-muted">
                      {attention.pendingAcknowledgements} pending acknowledgement(s) · {attention.notificationFailures} notification failure(s)
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
