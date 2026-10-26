import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/api/functions';

export function EditAssignmentsDialog({ open, onOpenChange, eventId, vendor, cues, initialCueIds, onSaved }) {
  const [cueIds, setCueIds] = useState(initialCueIds ?? []);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setCueIds(initialCueIds ?? []);
  }, [open, initialCueIds]);

  function toggleCue(id) {
    setCueIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await api.updateVendorAssignments({ eventId, vendorParticipantId: vendor.id, cueIds });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Assigned cues — {vendor.displayName}</DialogTitle>
        <DialogDescription>Changes take effect in their call sheet the next time you publish.</DialogDescription>
        <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto rounded-control border border-cue-border p-2">
          {cues.length === 0 && <p className="px-1 py-2 text-sm text-muted">No cues on this event yet.</p>}
          {cues.map((cue) => (
            <label key={cue.id} className="flex items-center gap-2 px-1 py-1 text-sm text-ink">
              <Checkbox checked={cueIds.includes(cue.id)} onCheckedChange={() => toggleCue(cue.id)} />
              {cue.title}
            </label>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <Button className="mt-4 w-full" onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save assignments'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
