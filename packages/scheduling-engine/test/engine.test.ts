import { describe, expect, it } from "vitest";
import { previewChange } from "../src/engine.js";
import { ScheduleValidationError, type PublishedSnapshot } from "../src/types.js";
import { rowanWeddingSnapshot } from "../src/fixtures/rowanWedding.js";

function snapshot(overrides: Partial<PublishedSnapshot> = {}): PublishedSnapshot {
  return {
    hardStopMinute: 1440,
    cues: [],
    dependencies: [],
    ...overrides,
  };
}

describe("T01 independent cue unaffected", () => {
  it("leaves a cue with no dependency on the edited cue untouched", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B (independent)", startMinute: 200, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 150 } }]);
    const b = result.proposedCues.find((c) => c.id === "b")!;
    expect(b.startMinute).toBe(200);
    expect(result.affectedCueIds).not.toContain("b");
  });
});

describe("T02 finish-to-start propagation", () => {
  it("moves a successor by the exact amount required", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 115, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 }],
    });
    // A moves +20 (100 -> 120); required boundary for B = 120+10+5 = 135, was 115, so B moves to 135 (+20).
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 120 } }]);
    const b = result.proposedCues.find((c) => c.id === "b")!;
    expect(b.startMinute).toBe(135);
    expect(result.canPublish).toBe(true);
  });
});

describe("T03 start-to-start offset", () => {
  it("respects the configured non-negative offset", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 30, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 105, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "START_TO_START", offsetMinutes: 5 }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 120 } }]);
    const b = result.proposedCues.find((c) => c.id === "b")!;
    expect(b.startMinute).toBe(125); // 120 + 5
  });
});

describe("T04 multiple predecessors choose max boundary", () => {
  it("binds to whichever predecessor requires the later start", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 100, durationMinutes: 50, mode: "FLEXIBLE" },
        { id: "c", title: "C", startMinute: 200, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [
        { id: "e1", predecessorCueId: "a", successorCueId: "c", type: "FINISH_TO_START", offsetMinutes: 0 }, // requires >= 110
        { id: "e2", predecessorCueId: "b", successorCueId: "c", type: "FINISH_TO_START", offsetMinutes: 0 }, // requires >= 150
      ],
    });
    const unchanged = previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }]); // no-op edit on A
    const c = unchanged.proposedCues.find((cue) => cue.id === "c")!;
    // B's boundary (150) exceeds A's (110) and C's published start (200), so C stays at 200.
    expect(c.startMinute).toBe(200);

    const moved = previewChange(snap, [{ cueId: "b", patch: { startMinute: 180 } }]); // B now ends at 230 -> requires C >= 230
    const cMoved = moved.proposedCues.find((cue) => cue.id === "c")!;
    expect(cMoved.startMinute).toBe(230);
    const explanation = moved.explanations.find((e) => e.cueId === "c")!;
    expect(explanation.bindingPredecessorCueId).toBe("b");
  });
});

describe("T05 fixed cue blocks incompatible move", () => {
  it("keeps a fixed cue at its published time and reports a conflict", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B (fixed)", startMinute: 115, durationMinutes: 10, mode: "FIXED" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 150 } }]);
    const b = result.proposedCues.find((c) => c.id === "b")!;
    expect(b.startMinute).toBe(115); // unchanged
    expect(result.canPublish).toBe(false);
    expect(result.conflicts.some((c) => c.code === "FIXED_CUE_BLOCKED" && c.cueId === "b")).toBe(true);
  });
});

describe("T06/T07 hard stop boundary", () => {
  it("blocks publish when a cue would end after its allowed end", () => {
    const snap = snapshot({
      hardStopMinute: 200,
      cues: [{ id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 195 } }]); // ends at 205 > 200
    expect(result.canPublish).toBe(false);
    expect(result.conflicts.some((c) => c.code === "TIME_WINDOW_VIOLATION")).toBe(true);
  });

  it("allows a cue that ends exactly at the allowed end", () => {
    const snap = snapshot({
      hardStopMinute: 200,
      cues: [{ id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 190 } }]); // ends at exactly 200
    expect(result.canPublish).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe("T08 cycle rejection", () => {
  it("rejects a dependency cycle with a meaningful error", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 120, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [
        { id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 0 },
        { id: "e2", predecessorCueId: "b", successorCueId: "a", type: "FINISH_TO_START", offsetMinutes: 0 },
      ],
    });
    expect(() => previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }])).toThrow(ScheduleValidationError);
    try {
      previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }]);
    } catch (err) {
      expect((err as ScheduleValidationError).code).toBe("DEPENDENCY_CYCLE");
      expect((err as ScheduleValidationError).details?.cueIds).toEqual(expect.arrayContaining(["a", "b"]));
    }
  });
});

describe("T09 self and cross-event dependency rejection", () => {
  it("rejects a self-dependency", () => {
    const snap = snapshot({
      cues: [{ id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" }],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "a", type: "FINISH_TO_START", offsetMinutes: 0 }],
    });
    expect(() => previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }])).toThrowError(
      expect.objectContaining({ code: "DEPENDENCY_CYCLE" }),
    );
  });

  it("rejects a dependency referencing a cue outside the event", () => {
    const snap = snapshot({
      cues: [{ id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" }],
      dependencies: [
        { id: "e1", predecessorCueId: "a", successorCueId: "cue_from_other_event", type: "FINISH_TO_START", offsetMinutes: 0 },
      ],
    });
    expect(() => previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }])).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });
});

describe("T10 non-negative duration and offset", () => {
  it("rejects a non-positive duration patch", () => {
    const snap = snapshot({
      cues: [{ id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" }],
    });
    expect(() => previewChange(snap, [{ cueId: "a", patch: { durationMinutes: 0 } }])).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });

  it("rejects a negative dependency offset", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 120, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: -5 }],
    });
    expect(() => previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }])).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });
});

describe("T11 earlier move does not drag successors earlier", () => {
  it("leaves a flexible successor at its published start when the predecessor moves earlier", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 150, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 50 } }]); // A moves earlier; required boundary for B drops to 65
    const b = result.proposedCues.find((c) => c.id === "b")!;
    expect(b.startMinute).toBe(150); // unchanged, not dragged earlier
  });
});

describe("T12 duration change propagation", () => {
  it("propagates a duration increase to a finish-to-start successor", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 115, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { durationMinutes: 40 } }]); // A now ends at 140; required B start = 145
    const b = result.proposedCues.find((c) => c.id === "b")!;
    expect(b.startMinute).toBe(145);
  });
});

describe("duration-only edit on a cue with no causal start shift", () => {
  it("still reports a manual-change explanation so assigned vendors are notified", () => {
    const snap = snapshot({
      cues: [{ id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" }],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { durationMinutes: 8 } }]);
    expect(result.affectedCueIds).toContain("a");
    expect(result.explanations.find((e) => e.cueId === "a")?.kind).toBe("MANUAL_CHANGE");
  });

  it("still reports a manual-change explanation for an edited cue whose dependency-bound start doesn't move", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 200, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 }],
    });
    // B's required boundary (100+10+5=115) is well below its published start (200), so it never moves,
    // but shortening B's own duration still changed its published content.
    const result = previewChange(snap, [{ cueId: "b", patch: { durationMinutes: 5 } }]);
    const explanation = result.explanations.find((e) => e.cueId === "b");
    expect(explanation?.kind).toBe("MANUAL_CHANGE");
    expect(explanation?.deltaMinutes).toBe(0);
  });
});

describe("T13/T14 resource overlap", () => {
  it("flags a conflict when two cues sharing an exclusive resource overlap", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 30, mode: "FLEXIBLE", exclusiveResourceId: "room-1" },
        { id: "b", title: "B", startMinute: 120, durationMinutes: 30, mode: "FLEXIBLE", exclusiveResourceId: "room-1" },
      ],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }]);
    expect(result.conflicts.some((c) => c.code === "RESOURCE_OVERLAP")).toBe(true);
  });

  it("does not flag unrelated parallel cues that merely overlap in time", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 30, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 120, durationMinutes: 30, mode: "FLEXIBLE" },
      ],
    });
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 100 } }]);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe("T17 published snapshot immutability", () => {
  it("never mutates the input snapshot", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 115, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [{ id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 }],
    });
    const before = JSON.parse(JSON.stringify(snap));
    previewChange(snap, [{ cueId: "a", patch: { startMinute: 200 } }]);
    expect(snap).toEqual(before);
  });
});

describe("T18 deterministic output", () => {
  it("produces identical output for identical canonical input", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "A", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "B", startMinute: 115, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "c", title: "C", startMinute: 130, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [
        { id: "e1", predecessorCueId: "a", successorCueId: "b", type: "FINISH_TO_START", offsetMinutes: 5 },
        { id: "e2", predecessorCueId: "b", successorCueId: "c", type: "FINISH_TO_START", offsetMinutes: 5 },
      ],
    });
    const first = previewChange(snap, [{ cueId: "a", patch: { startMinute: 120 } }]);
    const second = previewChange(snap, [{ cueId: "a", patch: { startMinute: 120 } }]);
    expect(first).toEqual(second);
  });
});

describe("T19 explanation names the actual binding predecessor", () => {
  it("attributes the shift to the predecessor that actually constrained it", () => {
    const snap = snapshot({
      cues: [
        { id: "a", title: "Ceremony", startMinute: 100, durationMinutes: 10, mode: "FLEXIBLE" },
        { id: "b", title: "Cocktail hour", startMinute: 100, durationMinutes: 5, mode: "FLEXIBLE" },
        { id: "c", title: "Reception", startMinute: 130, durationMinutes: 10, mode: "FLEXIBLE" },
      ],
      dependencies: [
        { id: "e1", predecessorCueId: "a", successorCueId: "c", type: "FINISH_TO_START", offsetMinutes: 0 },
        { id: "e2", predecessorCueId: "b", successorCueId: "c", type: "FINISH_TO_START", offsetMinutes: 0 },
      ],
    });
    // Ceremony ends 160, binds Reception; Cocktail hour ends 105, does not bind.
    const result = previewChange(snap, [{ cueId: "a", patch: { startMinute: 150 } }]);
    const explanation = result.explanations.find((e) => e.cueId === "c")!;
    expect(explanation.bindingPredecessorCueId).toBe("a");
  });
});

describe("T20 Rowan Wedding worked example", () => {
  it("matches the exact §6.6 delay scenario: five cues shift +35m and First dance exceeds its hard stop", () => {
    const result = previewChange(rowanWeddingSnapshot(), [{ cueId: "cue_ceremony", patch: { startMinute: 1025 } }]); // 5:05 PM

    const byId = Object.fromEntries(result.proposedCues.map((c) => [c.id, c]));
    expect(byId.cue_ceremony!.startMinute).toBe(1025);
    expect(byId.cue_photos!.startMinute).toBe(1065); // 5:45 PM
    expect(byId.cue_intro!.startMinute).toBe(1115); // 6:35 PM
    expect(byId.cue_dinner!.startMinute).toBe(1145); // 7:05 PM
    expect(byId.cue_toasts!.startMinute).toBe(1215); // 8:15 PM
    expect(byId.cue_dance!.startMinute).toBe(1245); // 8:45 PM, ends 1255 (8:55 PM)

    expect(result.canPublish).toBe(false);
    const conflict = result.conflicts.find((c) => c.cueId === "cue_dance" && c.code === "TIME_WINDOW_VIOLATION");
    expect(conflict).toBeDefined();
    expect(conflict?.details?.proposedEndMinute).toBe(1255);
    expect(conflict?.details?.allowedEndMinute).toBe(1245);
  });

  it("matches the §6.6 human-resolution scenario: shortened cues clear the conflict and First dance ends by 8:30 PM", () => {
    // Coordinator batches the ceremony move with the three approved duration reductions into one proposal,
    // still computed against the one true published (v1) baseline, per FR-022.
    const resolved = previewChange(rowanWeddingSnapshot(), [
      { cueId: "cue_ceremony", patch: { startMinute: 1025 } },
      { cueId: "cue_photos", patch: { durationMinutes: 20 } },
      { cueId: "cue_intro", patch: { durationMinutes: 10 } },
      { cueId: "cue_dinner", patch: { durationMinutes: 50 } },
    ]);

    const byId = Object.fromEntries(resolved.proposedCues.map((c) => [c.id, c]));
    expect(byId.cue_photos!.startMinute).toBe(1065);
    expect(byId.cue_intro!.startMinute).toBe(1105);
    expect(byId.cue_dinner!.startMinute).toBe(1130);
    expect(byId.cue_toasts!.startMinute).toBe(1190);
    expect(byId.cue_dance!.startMinute).toBe(1220);
    expect(byId.cue_dance!.startMinute + byId.cue_dance!.durationMinutes).toBe(1230); // 8:30 PM
    expect(resolved.canPublish).toBe(true);
  });
});
