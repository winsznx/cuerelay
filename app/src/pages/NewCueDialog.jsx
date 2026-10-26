import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseTimeToMinute } from '@/lib/time';
import { api } from '@/api/functions';

export function NewCueDialog({ open, onOpenChange, eventId, existingCues, onCreated }) {
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState('5');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('PM');
  const [duration, setDuration] = useState('30');
  const [predecessorId, setPredecessorId] = useState('');
  const [offset, setOffset] = useState('10');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const startMinute = parseTimeToMinute(hour, minute, period);
    const durationMinutes = Number(duration);
    if (!title.trim() || startMinute === null || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      setError('Fill in a title, valid time, and a positive duration.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { cue } = await api.saveCue({ eventId, title: title.trim(), startMinute, durationMinutes, mode: 'FLEXIBLE' });
      if (predecessorId) {
        await api.saveDependency({
          eventId,
          predecessorCueId: predecessorId,
          successorCueId: cue.id,
          type: 'FINISH_TO_START',
          offsetMinutes: Number(offset) || 0,
        });
      }
      setTitle('');
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
        <DialogTitle>Add a cue</DialogTitle>
        <DialogDescription>Give it a title, an initial time, and — if it should follow another cue — a dependency.</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cue-title">Title</Label>
            <Input id="cue-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Toasts" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <div className="flex gap-2">
                <Input className="w-14" value={hour} onChange={(e) => setHour(e.target.value)} />
                <Input className="w-14" value={minute} onChange={(e) => setMinute(e.target.value)} />
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="flex h-10 rounded-control border border-cue-border bg-surface px-2 text-sm">
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cue-duration">Duration (min)</Label>
              <Input id="cue-duration" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          {existingCues.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="predecessor">Follows (optional)</Label>
              <div className="flex gap-2">
                <select
                  id="predecessor"
                  value={predecessorId}
                  onChange={(e) => setPredecessorId(e.target.value)}
                  className="flex h-10 flex-1 rounded-control border border-cue-border bg-surface px-3 text-sm"
                >
                  <option value="">No dependency</option>
                  {existingCues.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                {predecessorId && (
                  <Input className="w-24" value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="offset" />
                )}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add cue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
