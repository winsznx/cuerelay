/**
 * A client-side, dependency-free port of the CueRelay scheduling engine (same
 * algorithm as packages/scheduling-engine, PRD §6.4), used only by the public
 * /demo page. It runs entirely in the browser against the fictional Rowan
 * Wedding fixture: no entity reads/writes, no outbound messages.
 */
export function rowanWeddingFixture() {
  return {
    hardStopMinute: 1260,
    cues: [
      { id: 'cue_ceremony', title: 'Ceremony', startMinute: 990, durationMinutes: 30, mode: 'FLEXIBLE' },
      { id: 'cue_photos', title: 'Group photographs', startMinute: 1030, durationMinutes: 30, mode: 'FLEXIBLE' },
      { id: 'cue_intro', title: 'Reception introduction', startMinute: 1080, durationMinutes: 15, mode: 'FLEXIBLE' },
      { id: 'cue_dinner', title: 'Dinner', startMinute: 1110, durationMinutes: 60, mode: 'FLEXIBLE' },
      { id: 'cue_toasts', title: 'Toasts', startMinute: 1180, durationMinutes: 20, mode: 'FLEXIBLE' },
      { id: 'cue_dance', title: 'First dance', startMinute: 1210, durationMinutes: 10, mode: 'FLEXIBLE', latestEndMinute: 1245 },
    ],
    dependencies: [
      { id: 'dep_1', predecessorCueId: 'cue_ceremony', successorCueId: 'cue_photos', type: 'FINISH_TO_START', offsetMinutes: 10 },
      { id: 'dep_2', predecessorCueId: 'cue_photos', successorCueId: 'cue_intro', type: 'FINISH_TO_START', offsetMinutes: 20 },
      { id: 'dep_3', predecessorCueId: 'cue_intro', successorCueId: 'cue_dinner', type: 'FINISH_TO_START', offsetMinutes: 15 },
      { id: 'dep_4', predecessorCueId: 'cue_dinner', successorCueId: 'cue_toasts', type: 'FINISH_TO_START', offsetMinutes: 10 },
      { id: 'dep_5', predecessorCueId: 'cue_toasts', successorCueId: 'cue_dance', type: 'FINISH_TO_START', offsetMinutes: 10 },
    ],
  };
}

function requiredBoundary(edge, predecessor) {
  return edge.type === 'FINISH_TO_START'
    ? predecessor.startMinute + predecessor.durationMinutes + edge.offsetMinutes
    : predecessor.startMinute + edge.offsetMinutes;
}

function topologicalOrder(cues, dependencies) {
  const inDegree = new Map(cues.map((c) => [c.id, 0]));
  const adjacency = new Map(cues.map((c) => [c.id, []]));
  for (const edge of dependencies) {
    adjacency.get(edge.predecessorCueId).push(edge.successorCueId);
    inDegree.set(edge.successorCueId, (inDegree.get(edge.successorCueId) ?? 0) + 1);
  }
  const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }
  return order;
}

export function previewDemoChange(snapshot, editedCueId, patch) {
  const cues = snapshot.cues.map((c) => ({ ...c }));
  const byId = new Map(cues.map((c) => [c.id, c]));
  const published = new Map(snapshot.cues.map((c) => [c.id, c.startMinute]));
  const incoming = new Map();
  for (const edge of snapshot.dependencies) {
    const list = incoming.get(edge.successorCueId) ?? [];
    list.push(edge);
    incoming.set(edge.successorCueId, list);
  }

  const edited = byId.get(editedCueId);
  if (patch.startMinute !== undefined) edited.startMinute = patch.startMinute;
  if (patch.durationMinutes !== undefined) edited.durationMinutes = patch.durationMinutes;

  const explanations = [editedCueId];
  const conflicts = [];

  for (const cueId of topologicalOrder(cues, snapshot.dependencies)) {
    if (cueId === editedCueId) continue;
    const cue = byId.get(cueId);
    const edges = incoming.get(cueId) ?? [];
    if (edges.length === 0) continue;

    let required = -Infinity;
    for (const edge of edges) {
      const boundary = requiredBoundary(edge, byId.get(edge.predecessorCueId));
      if (boundary > required) required = boundary;
    }
    const publishedStart = published.get(cueId);
    const proposed = Math.max(publishedStart, required);
    cue.startMinute = proposed;
    if (proposed !== publishedStart) explanations.push(cueId);
  }

  for (const cue of cues) {
    const allowedEnd = cue.latestEndMinute ?? snapshot.hardStopMinute;
    const proposedEnd = cue.startMinute + cue.durationMinutes;
    if (proposedEnd > allowedEnd) {
      conflicts.push({ cueId: cue.id, proposedEnd, allowedEnd });
    }
  }

  return { cues, affectedCueIds: explanations, conflicts, canPublish: conflicts.length === 0 };
}
