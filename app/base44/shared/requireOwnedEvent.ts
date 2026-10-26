import type { Base44Client } from "npm:@base44/sdk";
import { apiError } from "./apiError.ts";

/**
 * Loads an event and verifies the authenticated caller owns it, per PRD §3.2:
 * never trust a client-supplied eventId/ownerUserId — always re-check server-side.
 */
export async function requireOwnedEvent(
  base44: Base44Client,
  userId: string,
  eventId: string,
): Promise<{ event: Record<string, unknown> } | { error: Response }> {
  if (!eventId) return { error: apiError("VALIDATION_ERROR", "eventId is required.") };

  const event = await base44.asServiceRole.entities.Event.get(eventId).catch(() => null);
  if (!event) return { error: apiError("NOT_FOUND", "Event not found.") };
  if (event.ownerUserId !== userId) {
    return { error: apiError("FORBIDDEN", "You do not have access to this event.") };
  }
  return { event };
}
