import type { Base44Client } from "npm:@base44/sdk";
import { validateGraph } from "./schedulingEngine/graph.ts";
import { ScheduleValidationError, type Cue, type CueDependency, type PublishedSnapshot } from "./schedulingEngine/types.ts";

/**
 * Resolves the baseline a proposal is computed against, per FR-022: the currently
 * published revision's immutable snapshot, or — before any revision has ever been
 * published — the live working-draft Cue/CueDependency rows as the approved baseline.
 *
 * A revision snapshot is immutable once published, but the rundown isn't frozen —
 * a coordinator can still add brand-new cues and dependencies at any time (FR-010).
 * Those live only as Cue/CueDependency rows until the next publish, so this layers
 * any such new rows (not yet present in the snapshot, by id) on top of the published
 * baseline at their current values, the same way the snapshot's own cues serve as
 * the floor for cues that already existed.
 */
export async function loadPublishedSnapshot(
  base44: Base44Client,
  eventId: string,
  currentPublishedRevisionId: string | null,
): Promise<PublishedSnapshot> {
  const svc = base44.asServiceRole;

  if (!currentPublishedRevisionId) {
    const event = await svc.entities.Event.get(eventId);
    const [cues, dependencies] = await Promise.all([
      svc.entities.Cue.filter({ eventId, archived: false }) as Promise<Cue[]>,
      svc.entities.CueDependency.filter({ eventId }) as Promise<CueDependency[]>,
    ]);
    return {
      cues: cues.map(stripStorageFields) as Cue[],
      dependencies: dependencies.map(stripStorageFields) as CueDependency[],
      hardStopMinute: event.hardStopMinute as number,
    };
  }

  const revision = await svc.entities.Revision.get(currentPublishedRevisionId);
  const snapshot = JSON.parse(revision.fullSnapshotJson as string) as PublishedSnapshot;
  const snapshotCueIds = new Set(snapshot.cues.map((c) => c.id));
  const snapshotDependencyIds = new Set(snapshot.dependencies.map((d) => d.id));

  const [liveCues, liveDependencies] = await Promise.all([
    svc.entities.Cue.filter({ eventId, archived: false }) as Promise<Cue[]>,
    svc.entities.CueDependency.filter({ eventId }) as Promise<CueDependency[]>,
  ]);

  const newCues = liveCues.filter((c) => !snapshotCueIds.has(c.id)).map(stripStorageFields) as Cue[];
  if (newCues.length === 0) return snapshot;

  const mergedCueIds = new Set([...snapshotCueIds, ...newCues.map((c) => c.id)]);
  const newDependencies = liveDependencies
    .filter((d) => !snapshotDependencyIds.has(d.id) && mergedCueIds.has(d.predecessorCueId) && mergedCueIds.has(d.successorCueId))
    .map(stripStorageFields) as CueDependency[];

  const merged: PublishedSnapshot = {
    cues: [...snapshot.cues, ...newCues],
    dependencies: [...snapshot.dependencies, ...newDependencies],
    hardStopMinute: snapshot.hardStopMinute,
  };

  try {
    validateGraph(merged.cues, merged.dependencies);
  } catch (err) {
    if (err instanceof ScheduleValidationError) {
      throw new ScheduleValidationError(err.code, `A newly added cue or dependency is invalid: ${err.message}`, err.details);
    }
    throw err;
  }

  return merged;
}

function stripStorageFields<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  const { created_date: _createdDate, updated_date: _updatedDate, created_by: _createdBy, created_by_id: _createdById, ...rest } = record;
  return rest;
}
