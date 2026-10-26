import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConflictCard } from '@/components/ConflictCard';
import { TimePill } from '@/components/TimePill';
import { rowanWeddingFixture, previewDemoChange } from '@/lib/demoEngine';
import { formatMinute } from '@/lib/time';

const FIXTURE = rowanWeddingFixture();

export function Demo() {
  const [delayMinutes, setDelayMinutes] = useState(0);

  const result = useMemo(
    () => previewDemoChange(FIXTURE, 'cue_ceremony', { startMinute: 990 + delayMinutes }),
    [delayMinutes],
  );

  const byId = Object.fromEntries(result.cues.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-6 py-6">
        <Link to="/"><BrandMark /></Link>
        <Link to="/app"><Button variant="secondary" size="sm">Create an event</Button></Link>
      </header>

      <div className="mx-auto max-w-2xl px-6 pb-20">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Demo data — no messages are sent</p>
        <h1 className="font-display text-3xl text-ink">The Rowan Wedding — Example Event</h1>
        <p className="mt-2 text-sm text-muted">
          Move the ceremony later and watch the real scheduling engine recompute every downstream cue, live in your browser.
        </p>

        <Card elevated className="mt-8 p-6">
          <label className="text-xs font-medium uppercase tracking-wide text-muted">
            Ceremony delay: {delayMinutes} minutes
          </label>
          <input
            type="range"
            min={0}
            max={45}
            step={5}
            value={delayMinutes}
            onChange={(e) => setDelayMinutes(Number(e.target.value))}
            className="mt-3 w-full accent-[rgb(70,100,255)]"
          />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>4:30 PM (original)</span>
            <span>5:15 PM</span>
          </div>
        </Card>

        <div className="mt-6 space-y-2">
          {FIXTURE.cues.map((original) => {
            const updated = byId[original.id];
            const changed = updated.startMinute !== original.startMinute;
            return (
              <Card key={original.id} className="flex items-center gap-3 p-4">
                <span className="min-w-[10rem] flex-1 text-sm font-medium text-ink">{original.title}</span>
                <TimePill minute={original.startMinute} strike={changed} />
                {changed && (
                  <>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                    <TimePill minute={updated.startMinute} tone={result.conflicts.some((c) => c.cueId === original.id) ? 'danger' : 'success'} />
                  </>
                )}
              </Card>
            );
          })}
        </div>

        {result.conflicts.length > 0 && (
          <div className="mt-6 space-y-2">
            {result.conflicts.map((c, i) => (
              <ConflictCard
                key={i}
                conflict={{
                  code: 'TIME_WINDOW_VIOLATION',
                  message: `${byId[c.cueId].title} would end at ${formatMinute(c.proposedEnd)}, after its allowed end of ${formatMinute(c.allowedEnd)}.`,
                }}
              />
            ))}
            <p className="text-sm text-ink/70">
              CueRelay never silently shortens the programme to fit — a human coordinator decides how to resolve this.
            </p>
          </div>
        )}

        {result.conflicts.length === 0 && delayMinutes > 0 && (
          <p className="mt-6 rounded-control bg-success-soft px-4 py-3 text-sm text-success">
            No conflicts — this revision is ready to publish and notify affected vendors.
          </p>
        )}
      </div>
    </div>
  );
}
