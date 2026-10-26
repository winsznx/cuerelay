import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseTimeToMinute } from '@/lib/time';
import { api } from '@/api/functions';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'UTC',
];

export function NewEventDialog({ open, onOpenChange, onCreated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    eventDateLocal: '',
    timezone: 'America/New_York',
    venueName: '',
    hardStopHour: '11',
    hardStopMinute: '00',
    hardStopPeriod: 'PM',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const hardStopMinute = parseTimeToMinute(form.hardStopHour, form.hardStopMinute, form.hardStopPeriod);
    if (!form.name.trim() || !form.eventDateLocal || hardStopMinute === null) {
      setError('Fill in the event name, date, and a valid venue end time.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { event } = await api.createEvent({
        name: form.name.trim(),
        eventDateLocal: form.eventDateLocal,
        timezone: form.timezone,
        venueName: form.venueName.trim(),
        hardStopMinute,
      });
      onOpenChange(false);
      onCreated?.();
      navigate(`/app/events/${event.id}/rundown`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New event</DialogTitle>
        <DialogDescription>Set the essentials — you'll build the rundown next.</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Event name</Label>
            <Input id="name" value={form.name} onChange={set('name')} placeholder="The Rowan Wedding" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Event date</Label>
              <Input id="date" type="date" value={form.eventDateLocal} onChange={set('eventDateLocal')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tz">Timezone</Label>
              <select
                id="tz"
                value={form.timezone}
                onChange={set('timezone')}
                className="flex h-10 w-full rounded-control border border-cue-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" value={form.venueName} onChange={set('venueName')} placeholder="Hollow Creek Barn" />
          </div>
          <div className="space-y-1.5">
            <Label>Venue end time (hard stop)</Label>
            <div className="flex gap-2">
              <Input className="w-16" value={form.hardStopHour} onChange={set('hardStopHour')} />
              <Input className="w-16" value={form.hardStopMinute} onChange={set('hardStopMinute')} />
              <select
                value={form.hardStopPeriod}
                onChange={set('hardStopPeriod')}
                className="flex h-10 rounded-control border border-cue-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create event'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
