import { cn } from '@/lib/utils';

export function LoadingSkeleton({ className }) {
  return <div className={cn('animate-pulse rounded-control bg-cue-border/60', className)} />;
}

export function LoadingRows({ count = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
