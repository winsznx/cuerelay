import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/api/functions';

export function InviteVendorDialog({ open, onOpenChange, eventId, cues, onCreated }) {
  const [displayName, setDisplayName] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [email, setEmail] = useState('');
  const [cueIds, setCueIds] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleCue(id) {
    setCueIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.inviteVendor({ eventId, displayName: displayName.trim(), roleLabel: roleLabel.trim(), email: email.trim(), cueIds });
      setDisplayName('');
      setRoleLabel('');
      setEmail('');
      setCueIds([]);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Invite a vendor</DialogTitle>
        <DialogDescription>They'll see only the cues you assign once they sign in and accept.</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Name</Label>
            <Input id="v-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-role">Role</Label>
              <Input id="v-role" value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="Photographer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-email">Email</Label>
              <Input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          {cues.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assigned cues</Label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-control border border-cue-border p-2">
                {cues.map((cue) => (
                  <label key={cue.id} className="flex items-center gap-2 px-1 py-1 text-sm text-ink">
                    <Checkbox checked={cueIds.includes(cue.id)} onCheckedChange={() => toggleCue(cue.id)} />
                    {cue.title}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Inviting…' : 'Send invitation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
