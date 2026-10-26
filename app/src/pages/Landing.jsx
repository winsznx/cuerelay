import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Radio, ShieldCheck, Users2 } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TimePill } from '@/components/TimePill';

const STEPS = [
  { icon: Radio, title: 'Change a cue', body: 'Move the ceremony, extend dinner, anything shifts in minutes.' },
  { icon: ShieldCheck, title: 'Review the ripple', body: 'Every downstream cue and conflict surfaces before anything is shared.' },
  { icon: Users2, title: 'Publish & notify', body: 'Only affected vendors get the updated, role-specific call sheet.' },
];

const LIMITATIONS = [
  'No guest RSVPs, seating charts, or venue marketplace — this is a change-coordination tool, not a planning suite.',
  'A sent email is not proof it was read. Acknowledgement is a separate, explicit action from the vendor.',
  'Only FINISH_TO_START and START_TO_START dependencies with non-negative offsets are supported in v1.',
];

export function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* 1. Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm text-ink/70 md:flex">
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#vendor-sheet" className="hover:text-ink">Vendor view</a>
          <Link to="/demo" className="hover:text-ink">Try demo</Link>
        </nav>
        <Link to="/app">
          <Button variant="secondary" size="sm">Sign in</Button>
        </Link>
      </header>

      {/* 2. Hero + above-fold ripple preview */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-12 text-center md:pt-20">
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-ink md:text-6xl">
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

        <Card elevated className="mx-auto mt-14 max-w-xl p-6 text-left">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">Ceremony delayed 35 minutes</p>
          <div className="space-y-2.5">
            <Row label="Ceremony" from={990} to={1025} />
            <Row label="Group photographs" from={1030} to={1065} />
            <Row label="First dance" from={1210} to={1245} conflict="Exceeds 8:45 PM music cutoff" />
          </div>
        </Card>
      </section>

      {/* 3. Three-step visual story */}
      <section id="how-it-works" className="border-t border-cue-border bg-surface-raised px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-10 text-center font-display text-2xl text-ink">How it works</p>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title} elevated className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-mono-time text-xs text-white">{i + 1}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-soft text-brand">
                    <step.icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <p className="font-display text-lg text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Example private vendor call sheet */}
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

      {/* 5. Limitations */}
      <section className="border-y border-cue-border bg-surface-raised px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-wide text-muted">What this version doesn't do</p>
          <ul className="space-y-2.5">
            {LIMITATIONS.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-ink/70">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="px-6 py-10 text-center text-xs text-muted">
        <BrandMark className="justify-center opacity-70" />
        <p className="mt-3">Built for the Base44 Challenge.</p>
      </footer>
    </div>
  );
}

function Row({ label, from, to, conflict }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 shrink-0 truncate text-ink/80">{label}</span>
      <TimePill minute={from} strike />
      <ArrowRight className="h-3.5 w-3.5 text-muted" />
      <TimePill minute={to} tone={conflict ? 'danger' : 'success'} />
      {conflict && <span className="truncate text-xs text-danger">{conflict}</span>}
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
