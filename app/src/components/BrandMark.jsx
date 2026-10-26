export function BrandMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-brand font-mono-time text-xs font-semibold text-white">
        CR
      </span>
      <span className="font-display text-lg tracking-tight text-ink">CueRelay</span>
    </span>
  );
}
