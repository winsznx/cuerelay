import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";

interface CreateEventBody {
  name?: string;
  eventDateLocal?: string;
  timezone?: string;
  venueName?: string;
  hardStopMinute?: number;
  notes?: string;
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to create an event.");

  const body = (await req.json().catch(() => ({}))) as CreateEventBody;
  if (!body.name?.trim()) return apiError("VALIDATION_ERROR", "Event name is required.");
  if (!body.eventDateLocal) return apiError("VALIDATION_ERROR", "Event date is required.");
  if (!body.timezone) return apiError("VALIDATION_ERROR", "Event timezone is required.");
  if (!Number.isInteger(body.hardStopMinute) || body.hardStopMinute! < 0 || body.hardStopMinute! > 2879) {
    return apiError("VALIDATION_ERROR", "hardStopMinute must be an integer between 0 and 2879.");
  }

  const svc = base44.asServiceRole;

  let organisation = (await svc.entities.Organisation.filter({ ownerUserId: user.id }, undefined, 1))[0];
  if (!organisation) {
    organisation = await svc.entities.Organisation.create({
      name: user.full_name ? `${user.full_name}'s organisation` : "My organisation",
      ownerUserId: user.id,
    });
  }

  const event = await svc.entities.Event.create({
    organisationId: organisation.id,
    ownerUserId: user.id,
    name: body.name.trim(),
    eventDateLocal: body.eventDateLocal,
    timezone: body.timezone,
    venueName: body.venueName ?? "",
    hardStopMinute: body.hardStopMinute,
    versionCounter: 0,
    status: "draft",
    notes: body.notes ?? "",
  });

  return apiOk({ event });
}
