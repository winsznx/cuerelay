import type { Base44Client } from "npm:@base44/sdk";

export async function affectedVendorParticipantIds(base44: Base44Client, eventId: string, affectedCueIds: string[]): Promise<string[]> {
  if (affectedCueIds.length === 0) return [];
  const assignments = (await base44.asServiceRole.entities.CueAssignment.filter({ eventId })) as Array<{
    cueId: string;
    vendorParticipantId: string;
  }>;
  const affected = new Set(affectedCueIds);
  return [...new Set(assignments.filter((a) => affected.has(a.cueId)).map((a) => a.vendorParticipantId))];
}
