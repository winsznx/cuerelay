# CueRelay

Plans change. Everyone stays in sync.

CueRelay is an event-run-of-show app for wedding and event coordinators. A coordinator
changes one cue's time, sees the exact downstream impact and any conflicts before
anything is shared, approves a revision, and publishes it — which notifies only the
vendors actually affected and tracks their acknowledgement.

**Live app:** https://cuerelay-41bbade8.base44.app
**Live demo (no sign-in, no data written):** https://cuerelay-41bbade8.base44.app/demo

## The core loop

Change a cue → preview the ripple → resolve conflicts → publish → notify affected
vendors → track acknowledgement.

The scheduling engine follows fixed rules and is independently tested: FINISH_TO_START /
START_TO_START dependencies, fixed vs. flexible cues, hard stops, exclusive-resource
overlap, and DAG cycle detection. Publishing is idempotent and protected against stale
proposals via an atomic compare-and-set on the event's published-revision pointer.

## Stack

- **Backend:** Base44 — entities, backend functions, auth, and a Workflow (entity-create
  trigger → real email via Base44's integration) for notification dispatch and a
  scheduled reminder sweep.
- **Frontend:** React + Vite + Tailwind, deployed as the Base44 app's site.
- **Scheduling engine:** a standalone, dependency-light TypeScript package
  (`packages/scheduling-engine`) with its own Vitest suite, shared between local tests
  and the backend functions.

## Repo layout

```
app/                        Base44 project (frontend + base44/ backend config)
  base44/entities/          Entity schemas (RLS-restricted; functions are the write API)
  base44/functions/         Backend functions
  base44/shared/            Code shared across functions, incl. the scheduling engine
  src/                      React app
packages/scheduling-engine/ Standalone scheduling engine + test suite
```

## Local development

```bash
cd app
npm install
base44 dev        # starts the local backend + frontend dev server
```

```bash
cd packages/scheduling-engine
npm install
npm test
```

## Deploying

```bash
cd app
base44 deploy --yes --build
```
