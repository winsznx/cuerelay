import { NavLink, useParams } from 'react-router-dom';
import { CalendarDays, LayoutGrid, LogOut, Printer, Users2, History, Clock3 } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const EVENT_NAV = [
  { to: (id) => `/app/events/${id}/rundown`, label: 'Rundown', icon: Clock3 },
  { to: (id) => `/app/events/${id}/vendors`, label: 'Vendors', icon: Users2 },
  { to: (id) => `/app/events/${id}/revisions`, label: 'Revisions', icon: History },
  { to: (id) => `/app/events/${id}/export`, label: 'Export', icon: Printer },
];

export function AppShell({ children }) {
  const { eventId } = useParams();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="hidden w-[232px] shrink-0 flex-col justify-between border-r border-cue-border bg-surface px-4 py-6 md:flex print:hidden">
          <div>
            <BrandMark className="mb-8 px-2" />
            <nav className="space-y-1">
              <NavLink
                to="/app"
                end
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <LayoutGrid className="h-4 w-4" />
                Events
              </NavLink>
              {eventId &&
                EVENT_NAV.map((item) => (
                  <NavLink key={item.label} to={item.to(eventId)} className={({ isActive }) => navLinkClass(isActive)}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>
          <div className="space-y-1">
            <p className="truncate px-2 text-xs text-muted">{user?.email}</p>
            <button onClick={signOut} className={navLinkClass(false)}>
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>

        {eventId && (
          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-cue-border bg-surface md:hidden print:hidden">
            {EVENT_NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to(eventId)}
                className={({ isActive }) =>
                  cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]', isActive ? 'text-brand' : 'text-muted')
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function navLinkClass(isActive) {
  return cn(
    'flex min-h-[40px] items-center gap-2.5 rounded-control px-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-soft text-brand' : 'text-ink/70 hover:bg-surface-raised hover:text-ink',
  );
}

export function TopBar({ children, className }) {
  return (
    <div className={cn('sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center gap-3 border-b border-cue-border bg-surface/95 px-4 py-3 backdrop-blur md:px-8', className)}>
      {children}
    </div>
  );
}

export { CalendarDays };
