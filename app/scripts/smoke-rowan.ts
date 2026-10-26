const event = await base44.functions.invoke("createEvent", {
  name: "The Rowan Wedding — Example Event",
  eventDateLocal: "2026-11-07",
  timezone: "America/New_York",
  venueName: "Hollow Creek Barn",
  hardStopMinute: 1260,
  notes: "Fictional demo scenario per PRD §15.1.",
});
console.log("createEvent:", JSON.stringify(event.data, null, 2));
const eventId = event.data.event.id;

const cueSpecs = [
  { title: "Ceremony", startMinute: 990, durationMinutes: 30 },
  { title: "Group photographs", startMinute: 1030, durationMinutes: 30 },
  { title: "Reception introduction", startMinute: 1080, durationMinutes: 15 },
  { title: "Dinner", startMinute: 1110, durationMinutes: 60 },
  { title: "Toasts", startMinute: 1180, durationMinutes: 20 },
  { title: "First dance", startMinute: 1210, durationMinutes: 10, latestEndMinute: 1245 },
];

const cueIds: Record<string, string> = {};
for (const spec of cueSpecs) {
  const res = await base44.functions.invoke("saveCue", { eventId, mode: "FLEXIBLE", ...spec });
  if (!res.data.ok && res.data.ok !== undefined) console.log("saveCue failed:", JSON.stringify(res.data));
  cueIds[spec.title] = res.data.cue.id;
}
console.log("cueIds:", cueIds);

const depSpecs = [
  { pred: "Ceremony", succ: "Group photographs", offsetMinutes: 10 },
  { pred: "Group photographs", succ: "Reception introduction", offsetMinutes: 20 },
  { pred: "Reception introduction", succ: "Dinner", offsetMinutes: 15 },
  { pred: "Dinner", succ: "Toasts", offsetMinutes: 10 },
  { pred: "Toasts", succ: "First dance", offsetMinutes: 10 },
];
for (const d of depSpecs) {
  const res = await base44.functions.invoke("saveDependency", {
    eventId,
    predecessorCueId: cueIds[d.pred],
    successorCueId: cueIds[d.succ],
    type: "FINISH_TO_START",
    offsetMinutes: d.offsetMinutes,
  });
  if (!res.data.dependency) console.log("saveDependency failed:", JSON.stringify(res.data));
}
console.log("dependencies saved");

const preview = await base44.functions.invoke("previewChange", {
  eventId,
  baseRevisionId: null,
  edits: [{ cueId: cueIds["Ceremony"], patch: { startMinute: 1025 } }],
});
console.log("previewChange (delay):", JSON.stringify(preview.data, null, 2));

try {
  const publishBlocked = await base44.functions.invoke("publishRevision", {
    eventId,
    baseRevisionId: null,
    edits: [{ cueId: cueIds["Ceremony"], patch: { startMinute: 1025 } }],
    idempotencyKey: "smoke-test-blocked-1",
    confirmed: true,
    changeReason: "Ceremony delayed 35 minutes",
  });
  console.log("publishRevision (should be blocked):", JSON.stringify(publishBlocked.data, null, 2));
} catch (err: any) {
  console.log("publishRevision (expected block):", err.status, JSON.stringify(err.data));
}

const publishOk = await base44.functions.invoke("publishRevision", {
  eventId,
  baseRevisionId: null,
  edits: [
    { cueId: cueIds["Ceremony"], patch: { startMinute: 1025 } },
    { cueId: cueIds["Group photographs"], patch: { durationMinutes: 20 } },
    { cueId: cueIds["Reception introduction"], patch: { durationMinutes: 10 } },
    { cueId: cueIds["Dinner"], patch: { durationMinutes: 50 } },
  ],
  idempotencyKey: "smoke-test-resolved-1",
  confirmed: true,
  changeReason: "Ceremony delayed 35 minutes; photos/intro/dinner shortened to clear the music cutoff",
});
console.log("publishRevision (should succeed as v1):", JSON.stringify(publishOk.data, null, 2));

const coordinatorView = await base44.functions.invoke("getCoordinatorEvent", { eventId });
console.log("getCoordinatorEvent:", JSON.stringify(coordinatorView.data, null, 2));
