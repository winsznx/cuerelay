export function AppWindow({ title, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-card border border-cue-border bg-surface shadow-card ${className}`}>
      <div className="flex items-center gap-2 border-b border-cue-border bg-surface-raised px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
        {title && <span className="ml-2 font-mono-time text-xs text-muted">{title}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
