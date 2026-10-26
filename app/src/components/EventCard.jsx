import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { VersionBadge } from '@/components/VersionBadge';

export function EventCard({ event, attention }) {
  const hasIssues = (attention?.pendingAcknowledgements ?? 0) > 0 || (attention?.notificationFailures ?? 0) > 0;
  return (
    <Link to={`/app/events/${event.id}/rundown`}>
      <Card elevated className="p-5 transition-shadow hover:shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-ink">{event.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {event.eventDateLocal} · {event.venueName || 'No venue set'}
            </p>
          </div>
          <VersionBadge number={event.versionCounter} status={event.currentPublishedRevisionId ? 'published' : 'draft'} />
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {event.timezone}
          </span>
          {hasIssues && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {attention.pendingAcknowledgements} pending · {attention.notificationFailures} failed
            </span>
          )}
          {!hasIssues && attention && (
            <span className="flex items-center gap-1 text-success">
              <Users className="h-3.5 w-3.5" />
              All clear
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
