import type { PublishedSnapshot } from "../types.js";

/**
 * The Rowan Wedding — Example Event. Entirely fictional demo fixture per PRD §6.6 / §15.1.
 * Timezone America/New_York, event date 2026-11-07, venue end 9:00 PM (minute 1260),
 * music hard stop for First dance at 8:45 PM (minute 1245).
 */
export function rowanWeddingSnapshot(): PublishedSnapshot {
  return {
    hardStopMinute: 1260, // 9:00 PM
    cues: [
      {
        id: "cue_ceremony",
        title: "Ceremony",
        startMinute: 990, // 4:30 PM
        durationMinutes: 30,
        mode: "FLEXIBLE",
      },
      {
        id: "cue_photos",
        title: "Group photographs",
        startMinute: 1030, // 5:10 PM
        durationMinutes: 30,
        mode: "FLEXIBLE",
      },
      {
        id: "cue_intro",
        title: "Reception introduction",
        startMinute: 1080, // 6:00 PM
        durationMinutes: 15,
        mode: "FLEXIBLE",
      },
      {
        id: "cue_dinner",
        title: "Dinner",
        startMinute: 1110, // 6:30 PM
        durationMinutes: 60,
        mode: "FLEXIBLE",
      },
      {
        id: "cue_toasts",
        title: "Toasts",
        startMinute: 1180, // 7:40 PM
        durationMinutes: 20,
        mode: "FLEXIBLE",
      },
      {
        id: "cue_dance",
        title: "First dance",
        startMinute: 1210, // 8:10 PM
        durationMinutes: 10,
        mode: "FLEXIBLE",
        latestEndMinute: 1245, // 8:45 PM music cutoff
      },
    ],
    dependencies: [
      {
        id: "dep_ceremony_photos",
        predecessorCueId: "cue_ceremony",
        successorCueId: "cue_photos",
        type: "FINISH_TO_START",
        offsetMinutes: 10,
      },
      {
        id: "dep_photos_intro",
        predecessorCueId: "cue_photos",
        successorCueId: "cue_intro",
        type: "FINISH_TO_START",
        offsetMinutes: 20,
      },
      {
        id: "dep_intro_dinner",
        predecessorCueId: "cue_intro",
        successorCueId: "cue_dinner",
        type: "FINISH_TO_START",
        offsetMinutes: 15,
      },
      {
        id: "dep_dinner_toasts",
        predecessorCueId: "cue_dinner",
        successorCueId: "cue_toasts",
        type: "FINISH_TO_START",
        offsetMinutes: 10,
      },
      {
        id: "dep_toasts_dance",
        predecessorCueId: "cue_toasts",
        successorCueId: "cue_dance",
        type: "FINISH_TO_START",
        offsetMinutes: 10,
      },
    ],
  };
}
