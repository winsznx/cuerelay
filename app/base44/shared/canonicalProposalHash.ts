import type { CueEdit } from "./schedulingEngine/types.ts";

/**
 * Opaque, deterministic token over the inputs that produced a proposal — lets the
 * UI detect "this exact proposal" without re-displaying the full snapshot. It is
 * NOT a trust boundary: publishRevision always re-runs the engine itself against
 * the current baseline rather than trusting any client-supplied snapshot or hash
 * (PRD §8.3: "computes the hash over canonical server-owned proposal content").
 */
export function canonicalProposalHash(baseRevisionId: string | null, edits: CueEdit[]): string {
  const canonical = JSON.stringify({
    baseRevisionId,
    edits: edits
      .slice()
      .sort((a, b) => a.cueId.localeCompare(b.cueId))
      .map((e) => ({ cueId: e.cueId, patch: e.patch })),
  });

  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = (Math.imul(31, hash) + canonical.charCodeAt(i)) | 0;
  }
  return `h${(hash >>> 0).toString(36)}`;
}
