import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";

interface InviteVendorBody {
  eventId?: string;
  displayName?: string;
  roleLabel?: string;
  email?: string;
  cueIds?: string[];
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to invite a vendor.");

  const body = (await req.json().catch(() => ({}))) as InviteVendorBody;
  const owned = await requireOwnedEvent(base44, user.id, body.eventId ?? "");
  if ("error" in owned) return owned.error;

  if (!body.displayName?.trim()) return apiError("VALIDATION_ERROR", "Vendor display name is required.");
  if (!body.email?.trim()) return apiError("VALIDATION_ERROR", "Vendor email is required.");

  const svc = base44.asServiceRole;
  const eventId = body.eventId!;
  const cueIds = body.cueIds ?? [];

  if (cueIds.length > 0) {
    const cues = await svc.entities.Cue.filter({ eventId });
    const validCueIds = new Set(cues.map((c) => c.id));
    const invalid = cueIds.filter((id) => !validCueIds.has(id));
    if (invalid.length > 0) return apiError("VALIDATION_ERROR", "One or more cues do not belong to this event.", { invalid });
  }

  const participant = await svc.entities.VendorParticipant.create({
    eventId,
    displayName: body.displayName.trim(),
    roleLabel: body.roleLabel ?? "",
    email: body.email.trim().toLowerCase(),
    status: "invited",
    invitedAt: new Date().toISOString(),
  });

  if (cueIds.length > 0) {
    await Promise.all(
      cueIds.map((cueId) => svc.entities.CueAssignment.create({ eventId, cueId, vendorParticipantId: participant.id })),
    );
  }

  await svc.entities.EventAudit.create({
    eventId,
    actorUserId: user.id,
    action: "vendor_invited",
    targetId: participant.id,
    timestamp: new Date().toISOString(),
    summary: `Invited ${body.displayName.trim()} (${body.email.trim()})`,
  });

  return apiOk({ vendorParticipant: participant }, 201);
}
