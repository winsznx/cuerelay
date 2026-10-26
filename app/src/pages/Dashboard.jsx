import { useEffect, useState, useCallback } from 'react';
import { CalendarPlus, Sparkles } from 'lucide-react';
import { AppShell, TopBar } from '@/components/AppShell';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingRows } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { NewEventDialog } from '@/pages/NewEventDialog';
import { api } from '@/api/functions';

export function Dashboard() {
  const [state, setState] = useState({ status: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    api
      .listEvents()
      .then((data) => setState({ status: 'ready', ...data }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, []);

  useEffect(load, [load]);

  return (
    <AppShell>
      <TopBar>
        <h1 className="font-display text-xl text-ink">Your events</h1>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <CalendarPlus className="h-4 w-4" /> New event
          </Button>
        </div>
      </TopBar>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {state.status === 'loading' && <LoadingRows count={3} />}
        {state.status === 'error' && <ErrorState message={state.message} onRetry={load} />}
        {state.status === 'ready' && state.events.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="No events yet"
            description="Create your first event and build its rundown, or explore a fully worked example."
            action={
              <div className="flex gap-2">
                <Button onClick={() => setDialogOpen(true)}>Create your first event</Button>
                <a href="/demo">
                  <Button variant="secondary">Open sample scenario</Button>
                </a>
              </div>
            }
          />
        )}
        {state.status === 'ready' && state.events.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {state.events.map((event) => (
              <EventCard key={event.id} event={event} attention={state.attentionByEventId?.[event.id]} />
            ))}
          </div>
        )}
      </div>

      <NewEventDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </AppShell>
  );
}
