import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";

interface UpdateVendorAssignmentsBody {
  eventId?: string;
  vendorParticipantId?: string;
  cueIds?: string[];
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to edit vendor assignments.");

  const body = (await req.json().catch(() => ({}))) as UpdateVendorAssignmentsBody;
  const owned = await requireOwnedEvent(base44, user.id, body.eventId ?? "");
  if ("error" in owned) return owned.error;
  if (!body.vendorParticipantId) return apiError("VALIDATION_ERROR", "vendorParticipantId is required.");

  const svc = base44.asServiceRole;
  const eventId = body.eventId!;
  const nextCueIds = new Set(body.cueIds ?? []);

  const vendor = await svc.entities.VendorParticipant.get(body.vendorParticipantId).catch(() => null);
  if (!vendor || vendor.eventId !== eventId) return apiError("NOT_FOUND", "Vendor not found on this event.");

  if (nextCueIds.size > 0) {
    const cues = await svc.entities.Cue.filter({ eventId });
    const validCueIds = new Set(cues.map((c) => c.id));
    const invalid = [...nextCueIds].filter((id) => !validCueIds.has(id));
    if (invalid.length > 0) return apiError("VALIDATION_ERROR", "One or more cues do not belong to this event.", { invalid });
  }

  const existing = await svc.entities.CueAssignment.filter({ eventId, vendorParticipantId: body.vendorParticipantId });
  const existingCueIds = new Set(existing.map((a) => a.cueId as string));

  const toRemove = existing.filter((a) => !nextCueIds.has(a.cueId as string));
  const toAdd = [...nextCueIds].filter((id) => !existingCueIds.has(id));

  await Promise.all([
    ...toRemove.map((a) => svc.entities.CueAssignment.delete(a.id as string)),
    ...toAdd.map((cueId) => svc.entities.CueAssignment.create({ eventId, cueId, vendorParticipantId: body.vendorParticipantId })),
  ]);

  return apiOk({ cueIds: [...nextCueIds] });
}
