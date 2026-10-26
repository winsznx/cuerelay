import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppShell, TopBar } from '@/components/AppShell';
import { CueRow } from '@/components/CueRow';
import { VersionBadge } from '@/components/VersionBadge';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingRows } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { ChangeComposer } from '@/components/ChangeComposer';
import { NewCueDialog } from '@/pages/NewCueDialog';
import { api } from '@/api/functions';

export function Rundown() {
  const { eventId } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [pendingEdits, setPendingEdits] = useState({});
  const [editingCueId, setEditingCueId] = useState(null);
  const [newCueOpen, setNewCueOpen] = useState(false);

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    api
      .getCoordinatorEvent(eventId)
      .then((data) => setState({ status: 'ready', ...data }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [eventId]);

  useEffect(load, [load]);

  if (state.status === 'loading') {
    return (
      <AppShell>
        <TopBar>
          <div className="h-5 w-40 animate-pulse rounded bg-cue-border/60" />
        </TopBar>
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
  const isDraft = !event.currentPublishedRevisionId;
  const sortedCues = [...cues].sort((a, b) => a.startMinute - b.startMinute);

  return (
    <AppShell>
      <TopBar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-xl text-ink">{event.name}</h1>
            <VersionBadge number={currentRevision?.number} status={isDraft ? 'draft' : 'published'} />
          </div>
          <p className="text-xs text-muted">{event.eventDateLocal} · {event.timezone} · hard stop {Math.floor(event.hardStopMinute / 60)}:{String(event.hardStopMinute % 60).padStart(2, '0')}</p>
        </div>
        <Button size="sm" variant="secondary" className="ml-auto gap-1.5" onClick={() => setNewCueOpen(true)}>
          <Plus className="h-4 w-4" /> Add cue
        </Button>
      </TopBar>

      <div className="flex flex-col lg:flex-row">
        <div className="min-w-0 flex-1 px-4 py-6 md:px-8">
          {sortedCues.length === 0 ? (
            <EmptyState
              title="No cues yet"
              description="Add the first cue to start building this event's rundown."
              action={<Button onClick={() => setNewCueOpen(true)}>Add your first cue</Button>}
            />
          ) : (
            <div className="space-y-2">
              {sortedCues.map((cue) => (
                <div key={cue.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <CueRow cue={cue} selected={editingCueId === cue.id} onClick={() => {}} />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditingCueId(cue.id)}>
                    Move / edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full border-t border-cue-border bg-surface lg:w-[400px] lg:border-l lg:border-t-0">
          <ChangeComposer
            event={event}
            cues={sortedCues}
            currentRevision={currentRevision}
            pendingEdits={pendingEdits}
            setPendingEdits={setPendingEdits}
            editingCueId={editingCueId}
            setEditingCueId={setEditingCueId}
            onPublished={load}
          />
        </div>
      </div>

      <NewCueDialog
        open={newCueOpen}
        onOpenChange={setNewCueOpen}
        eventId={eventId}
        existingCues={cues}
        onCreated={load}
      />
    </AppShell>
  );
}
