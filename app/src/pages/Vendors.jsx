import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { AppShell, TopBar } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingRows } from '@/components/LoadingSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InviteVendorDialog } from '@/pages/InviteVendorDialog';
import { EditAssignmentsDialog } from '@/pages/EditAssignmentsDialog';
import { api } from '@/api/functions';

export function Vendors() {
  const { eventId } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

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

  const { vendors, cues, cueIdsByVendorId = {} } = state;

  return (
    <AppShell>
      <TopBar>
        <h1 className="font-display text-xl text-ink">Vendors</h1>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite vendor
        </Button>
      </TopBar>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {vendors.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No vendors invited yet"
            description="Invite a vendor and assign them to the cues they need to see."
            action={<Button onClick={() => setDialogOpen(true)}>Invite your first vendor</Button>}
          />
        ) : (
          <div className="space-y-3">
            {vendors.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{v.displayName}</p>
                    <p className="text-xs text-muted">{v.roleLabel || 'No role set'} · {v.email}</p>
                  </div>
                  <StatusPill status={v.status} />
                </div>
                <div className="mt-2 flex items-center gap-4">
                  {v.status !== 'accepted' && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/v/${eventId}?invite=${v.id}`)}
                      className="text-xs text-brand hover:underline"
                    >
                      Copy invite link
                    </button>
                  )}
                  <button onClick={() => setEditingVendor(v)} className="text-xs text-brand hover:underline">
                    Edit assigned cues ({(cueIdsByVendorId[v.id] ?? []).length})
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <InviteVendorDialog open={dialogOpen} onOpenChange={setDialogOpen} eventId={eventId} cues={cues} onCreated={load} />
      <EditAssignmentsDialog
        open={Boolean(editingVendor)}
        onOpenChange={(open) => !open && setEditingVendor(null)}
        eventId={eventId}
        vendor={editingVendor}
        cues={cues}
        initialCueIds={editingVendor ? cueIdsByVendorId[editingVendor.id] ?? [] : []}
        onSaved={load}
      />
    </AppShell>
  );
}

function StatusPill({ status }) {
  const style = status === 'accepted' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning';
  const label = status === 'accepted' ? 'Accepted' : 'Pending external setup';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}
