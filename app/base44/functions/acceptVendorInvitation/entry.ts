import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";

interface AcceptVendorInvitationBody {
  vendorParticipantId?: string;
}

/**
 * A vendor claims their own invitation by signing in and matching the invited
 * email, per FR-041: an unauthenticated email string alone never grants access.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to accept this invitation.");

  const { vendorParticipantId } = (await req.json().catch(() => ({}))) as AcceptVendorInvitationBody;
  if (!vendorParticipantId) return apiError("VALIDATION_ERROR", "vendorParticipantId is required.");

  const svc = base44.asServiceRole;
  const participant = await svc.entities.VendorParticipant.get(vendorParticipantId).catch(() => null);
  if (!participant) return apiError("NOT_FOUND", "Invitation not found.");

  if (participant.userId && participant.userId !== user.id) {
    return apiError("FORBIDDEN", "This invitation has already been accepted by a different account.");
  }
  if ((participant.email as string).toLowerCase() !== user.email.toLowerCase()) {
    return apiError("FORBIDDEN", "This invitation was sent to a different email address.");
  }

  const updated = await svc.entities.VendorParticipant.update(vendorParticipantId, {
    userId: user.id,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  });

  return apiOk({ vendorParticipant: updated });
}
