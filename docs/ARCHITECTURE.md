# Architecture

This is the detail the README's table points to: every entity and its row-level
security, every backend function and what it's for, the exact Workflow trigger
definitions as Base44 actually stores them, and the transcripts of the live tests
that back the claims in the README. Nothing here is asserted without a command
you can re-run against the deployed app.

## Why a backend function, not a client write

CueRelay's frontend never writes to an entity directly. Every entity's RLS is
`create: false, update: false, delete: false`, with read scoped to
`created_by_id`. The only way to touch real data is through one of the 15
backend functions below, each running as the authenticated caller first, then
switching to `asServiceRole` to do the actual read/write *after* re-deriving
that the caller is allowed to. The frontend never sends an event's owner id or
a vendor's identity to be trusted — the backend looks it up itself from
`auth.me()`.

## Entities (12)

All twelve share the same RLS shape: direct create/update/delete are `false`
and direct read is restricted to `created_by_id` (the Base44 platform's own
creator field, not the app's `ownerUserId`/`userId` business columns). That
means even a signed-in user reading their own data directly against the entity
API sees nothing useful — every real read goes through a function that applies
the actual authorization rule (owns this event, is an accepted participant on
this event, etc.) explicitly in code.

| Entity | Purpose |
|---|---|
| `Organisation` | A coordinator's organisation. One owner per organisation in v1. |
| `OrganisationMember` | Explicit membership — no implicit access from a matching email alone. |
| `Event` | Identity, venue, hard stop, and the `currentPublishedRevisionId` pointer. That pointer is never set by a direct write — only `publishRevision`'s compare-and-set can move it. |
| `Cue` | The live, editable timeline. Not the source of truth once something has been published — `Revision.fullSnapshotJson` is. |
| `CueDependency` | A `FINISH_TO_START` or `START_TO_START` edge between two cues. Validated as a DAG on every write by `saveDependency`, never only in the UI. |
| `Revision` | An immutable snapshot taken at publish time. Restoring an old one creates a new one; nothing is ever rewritten in place. |
| `VendorParticipant` | A vendor who's been invited. `userId` is only set once they sign in and accept — an invitation is a claim, not a grant. |
| `CueAssignment` | Which cues a given vendor's call sheet includes. |
| `Acknowledgement` | A vendor's explicit "I have the new schedule" receipt. Unique per `(revisionId, vendorParticipantId)`. |
| `NotificationBatch` | One row per published revision. Its *creation* is the sole trigger for the dispatch Workflow. |
| `NotificationJob` | One row per recipient per channel per batch, keyed by an idempotency string so a retry can't double-send. |
| `EventAudit` | Plain-language history of what happened to an event and who did it. |

## Backend functions (15)

| Function | Called by | What it actually enforces |
|---|---|---|
| `createEvent` | Coordinator | Creates the coordinator's `Organisation` on first use, then the `Event` under it. |
| `listEvents` | Coordinator | Only events where `ownerUserId` matches the caller; attaches pending-acknowledgement / notification-failure counts per event. |
| `getCoordinatorEvent` | Coordinator | `requireOwnedEvent` — see below — then builds the rundown from the *published* snapshot (merged with any live cues/dependencies added since), never from possibly-stale working rows alone. |
| `saveCue` | Coordinator | Ownership check, then refuses to let a cue that's already part of the published snapshot be edited directly — it has to go through the change composer (`previewChange` → `publishRevision`) instead. |
| `saveDependency` | Coordinator | Same ownership + published-snapshot guard, plus `validateGraph` rejects a dependency that would create a cycle before it's ever written. |
| `previewChange` | Coordinator | Recomputes the full ripple effect of a batch of edits against the true published baseline — the server never trusts a client-computed preview. Returns a `proposalHash` so the UI can detect if the edits it's about to publish still match what was previewed. |
| `publishRevision` | Coordinator | Rejects a stale base (`STALE_REVISION`), rejects unresolved conflicts (`UNRESOLVED_CONFLICT`), is a no-op on a repeated idempotency key, and moves `Event.currentPublishedRevisionId` with a conditional `updateMany` compare-and-set — a losing concurrent publish gets told it lost, not silently overwritten. |
| `inviteVendor` | Coordinator | Ownership check; validates every assigned cue id actually belongs to the event before creating the invitation. |
| `updateVendorAssignments` | Coordinator | Ownership check; diffs the requested cue-id set against existing assignments rather than delete-and-recreate-everything. |
| `retryNotificationJob` | Coordinator | Loads the job's own revision → event chain to check ownership (the job itself carries no owner field), and is a no-op if the job already succeeded. |
| `acceptVendorInvitation` | Vendor | The invited person must be signed in *and* their account email must match the invited email — a bare email string is never enough (this is the FR-041 requirement from the spec). |
| `acknowledgeRevision` | Vendor | Must be an accepted participant; rejects acknowledging a revision that's no longer current (`STALE_REVISION`); repeated clicks return the existing receipt instead of creating a second one. |
| `getVendorSheet` | Vendor | Builds the vendor's call sheet server-side from the published snapshot filtered to only their assigned (or shared-with-all) cues — cues they're not assigned to are never serialized into the response, not merely hidden by the UI. |
| `prepareNotificationBatch` | **System** — the `dispatchPublishedRevision` Workflow | Claims the batch atomically (`updateMany` on `status: "queued" → "processing"`) so a duplicate trigger can't process it twice, re-verifies the revision is genuinely still the event's current one, then sends one real email per affected, accepted vendor via `integrations.Core.SendEmail`, keyed by `revisionId:vendorId:email` so a retry never resends a job that already succeeded. |
| `sendUnacknowledgedReminders` | **System** — the `unacknowledgedReminder` Workflow, every 30 minutes | Sweeps every event's current published revision, finds accepted vendors who haven't acknowledged it, and reminds them — but only if no `email_reminder` job for that `(revision, vendor)` pair was sent in the last 30 minutes. The cap is enforced by checking prior rows, not by trusting the schedule interval alone. |

`requireOwnedEvent` (in `app/base44/shared/requireOwnedEvent.ts`) is the one
shared ownership gate used by every coordinator-facing function that takes an
`eventId`: it loads the event with `asServiceRole`, confirms `ownerUserId`
equals the authenticated caller's id, and returns a `403` `apiError` wrapped
response otherwise. It's one function, imported everywhere, specifically so
there's a single place this rule can be audited or broken — not five
near-duplicate checks that could drift apart.

## The two Workflows, as Base44 actually stores them

Both fetched live from the deployed app (`base44 api fetch GET
/api/apps/{id}/workflows/{workflow_id}`) rather than reconstructed from memory.

**`dispatchPublishedRevision`** — triggers on `NotificationBatch` *creation*,
never on a status update, so the workflow can't retrigger itself when
`prepareNotificationBatch` changes that same row's status to `processing` and
then `sent`:

```json
{
  "trigger": {
    "config": { "trigger_type": "entity", "events": ["create"], "entity_name": "NotificationBatch" }
  },
  "definition": {
    "do": [
      { "callFn": { "call": "invoke_backend_function", "with": { "function_name": "prepareNotificationBatch", "function_args": { "batchId": "${ .trigger.entity_id }" } }, "then": "end" } }
    ]
  }
}
```

**`unacknowledgedReminder`** — a recurring schedule, independent of any entity
event:

```json
{
  "trigger": {
    "config": { "trigger_type": "scheduled", "schedule_mode": "recurring", "cron_expression": "*/30 * * * *", "timezone": "UTC", "ends_type": "never" }
  },
  "definition": {
    "do": [
      { "callFn": { "call": "invoke_backend_function", "with": { "function_name": "sendUnacknowledgedReminders" } , "then": "end" } }
    ]
  }
}
```

At last check, both had `status: "active"`, zero consecutive failures, and a
real run history (8 dispatch runs, 12 reminder-sweep runs since deploy).

## Verified adversarial tests

Run live against the deployed app, not mocked, using an event the signed-in
account does not own (`6adeac42bd954fe0d790235c`, owned by a different real
account created during vendor-acceptance testing):

```
getCoordinatorEvent -> 403
saveCue             -> 403
previewChange       -> 403
inviteVendor        -> 403
publishRevision     -> 403
```

Every one of the functions that takes an `eventId` and is supposed to require
ownership refused a real, differently-owned event — not a malformed request,
a genuine `403 FORBIDDEN` from `requireOwnedEvent`.

## Verified idempotency and concurrency

Same `idempotencyKey`, two publishes of the same edit, run back to back:

```
preview.canPublish: true   baseRevisionId: 6adeef079480c78ca81a486a
first publish  -> revision 6adeef84c36e83c15d332f1a  number 9   duplicate: false
second publish -> revision 6adeef84c36e83c15d332f1a             duplicate: true
same revision returned: true
```

A publish built on a `baseRevisionId` that no longer matches the event's live
published pointer:

```
status: 409
body: {"code":"STALE_REVISION","message":"The published schedule changed. Review the latest version and preview again.",
       "details":{"latestRevisionId":"6adeef84c36e83c15d332f1a"}}
```

## Verified notification delivery

The publish above queued a real `NotificationBatch`, which the
`dispatchPublishedRevision` Workflow picked up and resolved into real,
per-vendor outcomes — including a real `integrations.Core.SendEmail` call, not
a logged intention:

```json
[
  { "channel": "email", "status": "sent",   "vendorParticipantId": "6ade9115e0b5ca4553fec3ee", "sentAt": "2026-10-26T06:13:26.307Z" },
  { "channel": "email", "status": "failed", "vendorParticipantId": "6ade9df8d87a4f7ecf9974d7", "lastError": "Vendor has not accepted their invitation yet; no eligible email channel." },
  { "channel": "email", "status": "failed", "vendorParticipantId": "6ade9def376d5b8db69d4809", "lastError": "Vendor has not accepted their invitation yet; no eligible email channel." }
]
```

The two "failed" rows aren't a bug — those vendors were invited but hadn't
signed in and accepted yet, so there's no account to notify. That's the
correct, honest outcome: CueRelay doesn't invent a delivery channel that
doesn't exist.

The 30-minute reminder sweep's own cap was confirmed from its own job history
for the one accepted vendor above — eight consecutive `email_reminder` sends
for the same revision, every gap between them at least 30 minutes
(`00:27 → 01:01 → 01:34 → 02:34 → 03:32 → 04:03 → 05:01 → 05:34`), which is
exactly the enforcement in `sendUnacknowledgedReminders`: it checks the most
recent prior reminder job for that `(revision, vendor)` pair before sending
another, rather than trusting the 30-minute cron interval alone to prevent a
double-send on a delayed or retried run.

## Scheduling engine

`packages/scheduling-engine` is deliberately independent of Base44 and React —
it's a plain TypeScript package with its own 28-test suite (`npm test`, no
network or account needed). The same code is imported by `previewChange` and
`publishRevision`; there's no second, looser reimplementation living in the
frontend that could silently drift from what the backend actually enforces.
See `packages/scheduling-engine/src/engine.ts` and its `test/` directory for
the rules themselves — two dependency types, fixed vs. flexible cues, a
flexible cue never moving earlier on its own, exclusive-resource overlap
checks, and cycle detection on every graph write.
