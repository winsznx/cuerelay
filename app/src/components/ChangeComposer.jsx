import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConflictCard } from '@/components/ConflictCard';
import { RippleDiffRow } from '@/components/RippleDiffRow';
import { minuteToHourMinutePeriod, parseTimeToMinute } from '@/lib/time';
import { api } from '@/api/functions';

/**
 * The central "Preview impact → approve → publish" workspace (PRD §10.4).
 * `pendingEdits` is a map of cueId -> {startMinute?, durationMinutes?}, built up
 * one cue at a time before a single previewChange/publishRevision call.
 */
export function ChangeComposer({ event, cues, currentRevision, pendingEdits, setPendingEdits, editingCueId, setEditingCueId, onPublished }) {
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [changeReason, setChangeReason] = useState('');

  const editingCue = cues.find((c) => c.id === editingCueId);
  const editCount = Object.keys(pendingEdits).length;

  function addEdit(cueId, patch) {
    setPendingEdits((prev) => ({ ...prev, [cueId]: patch }));
    setEditingCueId(null);
    setPreview(null);
  }

  function removeEdit(cueId) {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[cueId];
      return next;
    });
    setPreview(null);
  }

  async function runPreview() {
    setPreviewing(true);
    setPreviewError(null);
    try {
      const result = await api.previewChange({
        eventId: event.id,
        baseRevisionId: currentRevision?.id ?? null,
        edits: Object.entries(pendingEdits).map(([cueId, patch]) => ({ cueId, patch })),
      });
      setPreview(result);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setPublishError(null);
    try {
      await api.publishRevision({
        eventId: event.id,
        baseRevisionId: currentRevision?.id ?? null,
        edits: Object.entries(pendingEdits).map(([cueId, patch]) => ({ cueId, patch })),
        idempotencyKey: crypto.randomUUID(),
        confirmed: true,
        changeReason,
      });
      setPendingEdits({});
      setPreview(null);
      setChangeReason('');
      onPublished();
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  if (editingCue) {
    return <EditCueForm cue={editingCue} onCancel={() => setEditingCueId(null)} onSubmit={(patch) => addEdit(editingCue.id, patch)} />;
  }

  if (editCount === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-muted" />
        <p className="text-sm text-muted">Select "Move / edit" on a cue to start a proposal.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Draft — not yet shared</p>
      <p className="mb-4 text-sm text-ink">
        {editCount} cue{editCount > 1 ? 's' : ''} queued for this proposal.
      </p>

      <div className="mb-4 space-y-2">
        {Object.entries(pendingEdits).map(([cueId, patch]) => {
          const cue = cues.find((c) => c.id === cueId);
          return (
            <div key={cueId} className="flex items-center justify-between rounded-control border border-cue-border bg-surface-raised px-3 py-2 text-sm">
              <span>{cue?.title ?? cueId}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono-time text-xs text-muted">{summarizePatch(patch)}</span>
                <button onClick={() => removeEdit(cueId)} className="text-muted hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={runPreview} disabled={previewing} className="gap-2">
        {previewing && <Loader2 className="h-4 w-4 animate-spin" />}
        Preview impact
      </Button>
      {previewError && <p className="mt-2 text-sm text-danger">{previewError}</p>}

      {preview && (
        <div className="mt-5 flex-1 space-y-4 overflow-y-auto">
          <p className="text-sm text-ink/80">
            {preview.affectedCueIds.length} cue{preview.affectedCueIds.length === 1 ? '' : 's'} affected
            {preview.affectedParticipantIds.length > 0 && ` · ${preview.affectedParticipantIds.length} vendor(s) affected`}
            {preview.conflicts.length > 0 && ` · ${preview.conflicts.length} conflict${preview.conflicts.length > 1 ? 's' : ''}`}
          </p>

          {preview.conflicts.length > 0 && (
            <div className="space-y-2">
              {preview.conflicts.map((c, i) => (
                <ConflictCard key={i} conflict={c} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            {preview.explanations.map((exp) => (
              <RippleDiffRow key={exp.cueId} cue={cues.find((c) => c.id === exp.cueId) ?? { id: exp.cueId, title: exp.cueId }} explanation={exp} />
            ))}
          </div>

          {preview.canPublish ? (
            <div className="space-y-3 border-t border-cue-border pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Change reason</Label>
                <Textarea id="reason" rows={2} value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Ceremony delayed 35 minutes" />
              </div>
              <Button onClick={publish} disabled={publishing} className="w-full gap-2">
                {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish {currentRevision ? `v${currentRevision.number + 1}` : 'v1'} and notify {preview.affectedParticipantIds.length} affected vendor(s)?
              </Button>
              {publishError && <p className="text-sm text-danger">{publishError}</p>}
            </div>
          ) : (
            <p className="border-t border-cue-border pt-4 text-sm font-medium text-danger">Resolve conflicts before publishing.</p>
          )}
        </div>
      )}
    </div>
  );
}

function summarizePatch(patch) {
  const parts = [];
  if (patch.startMinute !== undefined) parts.push('time');
  if (patch.durationMinutes !== undefined) parts.push(`${patch.durationMinutes}m duration`);
  return parts.join(', ');
}

function EditCueForm({ cue, onCancel, onSubmit }) {
  const current = minuteToHourMinutePeriod(cue.startMinute);
  const [hour, setHour] = useState(String(current.hour));
  const [minute, setMinute] = useState(String(current.minute).padStart(2, '0'));
  const [period, setPeriod] = useState(current.period);
  const [duration, setDuration] = useState(String(cue.durationMinutes));

  function submit(e) {
    e.preventDefault();
    const startMinute = parseTimeToMinute(hour, minute, period);
    const durationMinutes = Number(duration);
    if (startMinute === null || !Number.isInteger(durationMinutes) || durationMinutes <= 0) return;
    const patch = {};
    // Only pin an explicit start time if the coordinator actually changed it here — otherwise
    // this cue stays eligible for automatic propagation from its dependencies (PRD §6.2).
    if (startMinute !== cue.startMinute) patch.startMinute = startMinute;
    if (durationMinutes !== cue.durationMinutes) patch.durationMinutes = durationMinutes;
    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }
    onSubmit(patch);
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col p-5">
      <p className="mb-4 font-display text-lg text-ink">Move {cue.title}</p>
      <div className="space-y-1.5">
        <Label>New start time</Label>
        <div className="flex gap-2">
          <Input className="w-16" value={hour} onChange={(e) => setHour(e.target.value)} />
          <Input className="w-16" value={minute} onChange={(e) => setMinute(e.target.value)} />
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="flex h-10 rounded-control border border-cue-border bg-surface px-3 text-sm">
            <option>AM</option>
            <option>PM</option>
          </select>
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>Duration (minutes)</Label>
        <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <div className="mt-6 flex gap-2">
        <Button type="submit">Add to proposal</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
