import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";
import { EVENT_SPAN_MAX, EVENT_SPAN_MIN } from "../../shared/schedulingEngine/types.ts";

interface SaveCueBody {
  eventId?: string;
  cueId?: string; // present => update, absent => create
  title?: string;
  startMinute?: number;
  durationMinutes?: number;
  mode?: "FIXED" | "FLEXIBLE";
  latestEndMinute?: number;
  exclusiveResourceId?: string;
  location?: string;
  notes?: string;
  shareWithAllVendors?: boolean;
  sortOrder?: number;
  archived?: boolean;
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to edit the rundown.");

  const body = (await req.json().catch(() => ({}))) as SaveCueBody;
  const owned = await requireOwnedEvent(base44, user.id, body.eventId ?? "");
  if ("error" in owned) return owned.error;
  const event = owned.event as { currentPublishedRevisionId?: string | null };

  if (!body.title?.trim()) return apiError("VALIDATION_ERROR", "Cue title is required.");
  if (!Number.isInteger(body.startMinute) || body.startMinute! < EVENT_SPAN_MIN || body.startMinute! > EVENT_SPAN_MAX) {
    return apiError("VALIDATION_ERROR", `startMinute must be an integer between ${EVENT_SPAN_MIN} and ${EVENT_SPAN_MAX}.`);
  }
  if (!Number.isInteger(body.durationMinutes) || body.durationMinutes! <= 0) {
    return apiError("VALIDATION_ERROR", "durationMinutes must be a positive integer.");
  }

  const svc = base44.asServiceRole;
  const fields = {
    eventId: body.eventId,
    title: body.title.trim(),
    startMinute: body.startMinute,
    durationMinutes: body.durationMinutes,
    mode: body.mode ?? "FLEXIBLE",
    latestEndMinute: body.latestEndMinute,
    exclusiveResourceId: body.exclusiveResourceId,
    location: body.location ?? "",
    notes: body.notes ?? "",
    shareWithAllVendors: body.shareWithAllVendors ?? false,
    sortOrder: body.sortOrder ?? 0,
    archived: body.archived ?? false,
  };

  if (body.cueId) {
    const existing = await svc.entities.Cue.get(body.cueId).catch(() => null);
    if (!existing || existing.eventId !== body.eventId) {
      return apiError("NOT_FOUND", "Cue not found on this event.");
    }
    if (event.currentPublishedRevisionId) {
      const revision = await svc.entities.Revision.get(event.currentPublishedRevisionId);
      const snapshot = JSON.parse(revision.fullSnapshotJson as string) as { cues: Array<{ id: string }> };
      if (snapshot.cues.some((c) => c.id === body.cueId)) {
        return apiError(
          "VALIDATION_ERROR",
          "This cue is part of the published schedule. Use “Move / edit” in the change composer to retime it instead.",
        );
      }
    }
    const cue = await svc.entities.Cue.update(body.cueId, fields);
    return apiOk({ cue });
  }

  const cue = await svc.entities.Cue.create(fields);
  return apiOk({ cue }, 201);
}
