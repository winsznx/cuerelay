export type CueMode = "FIXED" | "FLEXIBLE";
export type DependencyType = "FINISH_TO_START" | "START_TO_START";

export const EVENT_SPAN_MIN = 0;
export const EVENT_SPAN_MAX = 2879;

export interface Cue {
  id: string;
  title: string;
  /** Minutes since event-day local midnight. May exceed 1439 to represent next-day times. */
  startMinute: number;
  durationMinutes: number;
  mode: CueMode;
  /** Cue-specific latest permissible end minute. Falls back to event hardStopMinute when absent. */
  latestEndMinute?: number;
  exclusiveResourceId?: string;
  location?: string;
  notes?: string;
  shareWithAllVendors?: boolean;
  sortOrder?: number;
  archived?: boolean;
}

export interface CueDependency {
  id: string;
  predecessorCueId: string;
  successorCueId: string;
  type: DependencyType;
  offsetMinutes: number;
}

export interface PublishedSnapshot {
  cues: Cue[];
  dependencies: CueDependency[];
  hardStopMinute: number;
}

export interface CuePatch {
  startMinute?: number;
  durationMinutes?: number;
}

export type ConflictCode =
  | "FIXED_CUE_BLOCKED"
  | "DEPENDENCY_VIOLATION"
  | "TIME_WINDOW_VIOLATION"
  | "RESOURCE_OVERLAP";

export interface Conflict {
  code: ConflictCode;
  cueId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CueExplanation {
  cueId: string;
  previousStartMinute: number;
  proposedStartMinute: number;
  deltaMinutes: number;
  kind: "MANUAL_CHANGE" | "CAUSAL_SHIFT";
  /** Present only for CAUSAL_SHIFT: the predecessor cue + dependency that actually bound this cue's new start. */
  bindingPredecessorCueId?: string;
  bindingDependencyId?: string;
  message: string;
}

/** One manual, coordinator-initiated edit to a single cue. A preview may batch several of these. */
export interface CueEdit {
  cueId: string;
  patch: CuePatch;
}

export interface PreviewResult {
  canPublish: boolean;
  editedCueIds: string[];
  proposedCues: Cue[];
  affectedCueIds: string[];
  explanations: CueExplanation[];
  conflicts: Conflict[];
}

export class ScheduleValidationError extends Error {
  code: string;
  details?: Record<string, unknown>;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
