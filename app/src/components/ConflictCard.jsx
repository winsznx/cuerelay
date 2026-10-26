import { AlertOctagon } from 'lucide-react';

const CONFLICT_LABELS = {
  FIXED_CUE_BLOCKED: 'Fixed cue blocked',
  DEPENDENCY_VIOLATION: 'Dependency violation',
  TIME_WINDOW_VIOLATION: 'Exceeds allowed end time',
  RESOURCE_OVERLAP: 'Resource overlap',
};

export function ConflictCard({ conflict }) {
  return (
    <div className="flex items-start gap-3 rounded-control border border-danger-soft bg-danger-soft/70 px-4 py-3">
      <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <div>
        <p className="text-sm font-medium text-danger">{CONFLICT_LABELS[conflict.code] ?? conflict.code}</p>
        <p className="mt-0.5 text-sm text-ink/80">{conflict.message}</p>
      </div>
    </div>
  );
}
