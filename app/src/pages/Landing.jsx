import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Lock, Radio, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TimePill } from '@/components/TimePill';
import { AppWindow } from '@/components/AppWindow';

const WHY = [
  { icon: ShieldCheck, title: 'Calculated, not guessed', body: 'The same fixed rules run every time. Nothing invents a new time for your ceremony on its own.' },
  { icon: Lock, title: 'Server-scoped, not UI-hidden', body: "A vendor's call sheet is built server-side from their actual assignments. Nothing they shouldn't see ever reaches their browser." },
  { icon: Radio, title: 'Honest status, always', body: 'A sent email is never shown as "delivered." An email is never shown as "acknowledged." Those are three different, separately tracked facts.' },
];

const FAQS = [
  { q: 'Does CueRelay decide which tradeoffs to accept?', a: "No. It calculates the ripple and flags conflicts, but a human coordinator always approves the resolution before anything publishes. CueRelay never silently shortens a segment to make the numbers fit." },
  { q: 'What happens if a vendor never responds?', a: "Their call sheet stays available and their notification status stays visible as sent-but-unacknowledged — CueRelay never fabricates an acknowledgement, and a scheduled reminder nudges them at most once per 30 minutes." },
  { q: 'Can two coordinators publish at the same time safely?', a: "Publishing uses an atomic compare-and-set on the event's published-revision pointer, so a stale proposal is rejected rather than silently overwriting a newer one. Multi-editor collaboration on the same event is out of scope for v1." },
  { q: 'What dependency types are supported?', a: 'FINISH_TO_START and START_TO_START, with non-negative offsets. More complex staffing optimisation is intentionally out of scope for v1.' },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* 1. Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm text-ink/70 md:flex">
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#why" className="hover:text-ink">Why CueRelay</a>
          <a href="#vendor-sheet" className="hover:text-ink">Vendor view</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link to="/demo" className="hover:text-ink">Try demo</Link>
        </nav>
        <Link to="/app">
          <Button variant="secondary" size="sm">Sign in</Button>
        </Link>
      </header>

      {/* 2. Hero + above-fold product window */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-12 text-center md:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cue-border bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> A fixed, repeatable scheduling engine · Base44
        </span>
        <h1 className="mt-5 font-display text-4xl leading-[1.1] tracking-tight text-ink md:text-6xl">
          Plans change.
          <br />
          Everyone stays in sync.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted md:text-lg">
          When an event runs late, know what else moves and send vendors the right schedule.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/demo">
            <Button size="lg" className="gap-2">
              Try the live demo <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="secondary" size="lg">Create an event</Button>
          </Link>
        </div>

        <AppWindow title="The Rowan Wedding — Rundown" className="mx-auto mt-14 max-w-3xl text-left">
          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-1.5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Rundown</p>
              {[
                { t: 'Ceremony', m: 990, hl: false },
                { t: 'Group photographs', m: 1030, hl: false },
                { t: 'Dinner', m: 1110, hl: false },
                { t: 'First dance', m: 1210, hl: true },
              ].map((row) => (
                <div key={row.t} className={`flex items-center gap-2 rounded-control px-2.5 py-2 text-sm ${row.hl ? 'bg-danger-soft' : 'bg-surface-raised'}`}>
                  <TimePill minute={row.m} />
                  <span className={row.hl ? 'text-danger' : 'text-ink/80'}>{row.t}</span>
                </div>
              ))}
            </div>
            <div className="rounded-control bg-brand-soft/60 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand">Ceremony delayed 35 min</p>
              <div className="space-y-2">
                <Row label="Ceremony" from={990} to={1025} />
                <Row label="Group photographs" from={1030} to={1065} />
                <Row label="First dance" from={1210} to={1245} conflict />
              </div>
              <p className="mt-3 text-xs text-danger">Exceeds 8:45 PM music cutoff</p>
            </div>
          </div>
        </AppWindow>
      </section>

      {/* 3. How it works — numbered steps + large panel */}
      <section id="how-it-works" className="border-t border-cue-border bg-surface-raised px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-wide text-brand">How it works</p>
            <p className="font-display text-2xl text-ink">From one changed cue to a resolved, published schedule.</p>
            {[
              { n: 1, t: 'Change a cue', d: 'Move the ceremony, extend dinner — anything shifts in minutes, not a rewrite.' },
              { n: 2, t: 'Review the ripple', d: 'Every downstream cue and conflict surfaces before anything is shared. Nothing publishes silently.' },
              { n: 3, t: 'Publish & notify', d: 'Only affected vendors get the updated, role-specific call sheet — and you see who has and hasn’t confirmed it.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono-time text-xs text-white">{step.n}</span>
                <div>
                  <p className="font-medium text-ink">{step.t}</p>
                  <p className="mt-0.5 text-sm text-muted">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
          <AppWindow title="publishRevision → v2">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-control bg-success-soft px-3 py-2 text-success">
                <span>6 cues affected · 1 vendor affected</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="rounded-control border border-cue-border p-3">
                <p className="text-xs text-muted">Change reason</p>
                <p className="mt-1 text-ink">Ceremony delayed 35 minutes; photos and dinner shortened to clear the music cutoff.</p>
              </div>
              <Button className="w-full" size="sm">Publish v2 and notify 1 affected vendor</Button>
            </div>
          </AppWindow>
        </div>
      </section>

      {/* 4. Why CueRelay */}
      <section id="why" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-10 text-center font-display text-2xl text-ink">What makes an ending actually hold up</p>
          <div className="grid gap-4 md:grid-cols-3">
            {WHY.map((item) => (
              <Card key={item.title} elevated className="p-6">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-brand-soft text-brand">
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <p className="font-display text-lg text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Feature grid with embedded mockups */}
      <section className="border-y border-cue-border bg-surface-raised px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Platform</p>
          <p className="mb-10 text-center font-display text-2xl text-ink">Everything the change loop needs.</p>
          <div className="grid gap-5 md:grid-cols-2">
            <Card elevated className="p-6">
              <p className="font-display text-lg text-ink">Conflict-aware rundown editor</p>
              <p className="mt-1 text-sm text-muted">Fixed vs. flexible cues, hard stops, and exclusive-resource overlap — all checked before you can publish.</p>
              <AppWindow className="mt-4">
                <div className="flex items-center justify-between rounded-control bg-danger-soft px-3 py-2 text-xs text-danger">
                  <span>First dance is fixed and cannot move</span>
                  <Lock className="h-3.5 w-3.5" />
                </div>
              </AppWindow>
            </Card>
            <Card elevated className="p-6">
              <p className="font-display text-lg text-ink">Revision history, never rewritten</p>
              <p className="mt-1 text-sm text-muted">Every publish is an immutable, versioned snapshot. Restoring an old one creates a new version — history is never edited in place.</p>
              <AppWindow className="mt-4">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between rounded-control bg-success-soft px-3 py-1.5 text-success"><span>v3 · current</span><span>2 acknowledged</span></div>
                  <div className="flex justify-between rounded-control bg-surface-raised px-3 py-1.5 text-muted"><span>v2</span><span>published</span></div>
                  <div className="flex justify-between rounded-control bg-surface-raised px-3 py-1.5 text-muted"><span>v1</span><span>published</span></div>
                </div>
              </AppWindow>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. Example private vendor call sheet */}
      <section id="vendor-sheet" className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand">Role-specific, not one giant PDF</p>
            <p className="font-display text-2xl text-ink">Each vendor sees only what's theirs.</p>
            <p className="mt-3 text-sm text-muted">
              A photographer doesn't need the caterer's prep schedule. CueRelay builds each call sheet server-side from
              that vendor's actual assignments — never the full internal rundown, never another vendor's contact details.
            </p>
          </div>
          <Card elevated className="mx-auto w-full max-w-xs overflow-hidden">
            <div className="border-b border-cue-border bg-ink px-4 py-3 text-white">
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">The Rowan Wedding</p>
              <p className="font-mono-time text-xs opacity-90">v5 · Updated 2:14 PM</p>
            </div>
            <div className="space-y-2 p-4">
              <VendorSheetRow time="5:05 PM" title="Ceremony" />
              <VendorSheetRow time="5:45 PM" title="Group photographs" />
              <VendorSheetRow time="8:45 PM" title="First dance" />
            </div>
            <div className="border-t border-cue-border p-4">
              <div className="flex items-center justify-center gap-2 rounded-control bg-success-soft py-2.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> I have the latest schedule
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="border-t border-cue-border bg-surface-raised px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Questions</p>
          <p className="mb-8 text-center font-display text-2xl text-ink">Good questions. Honest answers.</p>
          <div className="space-y-2">
            {FAQS.map((item) => (
              <FaqItem key={item.q} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="px-6 py-20 text-center">
        <p className="font-display text-3xl text-ink">A changed plan. Everyone still on the same page.</p>
        <div className="mt-6">
          <Link to="/demo">
            <Button size="lg" className="gap-2">
              Try the live demo <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-cue-border px-6 py-12">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          <div>
            <BrandMark />
            <p className="mt-3 text-xs text-muted">Built for the Base44 Challenge.</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li><a href="#how-it-works" className="hover:text-ink">How it works</a></li>
              <li><Link to="/demo" className="hover:text-ink">Live demo</Link></li>
              <li><Link to="/app" className="hover:text-ink">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Honest limits</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li>No guest RSVPs or seating charts</li>
              <li>A sent email isn't a read receipt</li>
              <li>FINISH_TO_START / START_TO_START only</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Row({ label, from, to, conflict }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 truncate text-ink/80">{label}</span>
      <TimePill minute={from} strike />
      <ArrowRight className="h-3 w-3 text-muted" />
      <TimePill minute={to} tone={conflict ? 'danger' : 'success'} />
    </div>
  );
}

function VendorSheetRow({ time, title }) {
  return (
    <div className="flex items-center gap-3 rounded-control bg-surface-raised px-3 py-2">
      <span className="font-mono-time text-xs font-medium text-ink">{time}</span>
      <span className="text-xs text-ink/80">{title}</span>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <span className="text-sm font-medium text-ink">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="border-t border-cue-border px-4 py-3.5 text-sm text-muted">{a}</p>}
    </Card>
  );
}
