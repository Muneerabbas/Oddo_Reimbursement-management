import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChartColumnBig,
  Clock3,
  Mail,
  MapPin,
  PhoneCall,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const featureCards = [
  {
    title: 'Smart Intake Forms',
    body: 'Employees submit requests quickly with receipt checks, field validation, and category controls.',
    icon: ReceiptText,
  },
  {
    title: 'Approval Chains',
    body: 'Define multi-level approvals by amount and role so every request follows policy automatically.',
    icon: ShieldCheck,
  },
  {
    title: 'Live Operations View',
    body: 'Track pending, approved, and rejected requests in one dashboard with clear audit context.',
    icon: ChartColumnBig,
  },
  {
    title: 'Role-Aware Access',
    body: 'Manager-like roles share approval workflows while admin and employee experiences stay focused.',
    icon: UsersRound,
  },
];

const quickStats = [
  { label: 'Avg Approval Time', value: '2.4 days' },
  { label: 'Policy Compliance', value: '98.7%' },
  { label: 'Processed Requests', value: '10k+' },
];

const workflow = [
  {
    title: 'Submit',
    detail: 'Employee uploads receipt and sends the claim with required metadata.',
    icon: ReceiptText,
  },
  {
    title: 'Review',
    detail: 'Manager-like roles validate policy, request edits, or approve in a single queue.',
    icon: Clock3,
  },
  {
    title: 'Settle',
    detail: 'Finance confirms payout and status updates are recorded instantly for everyone.',
    icon: CheckCircle2,
  },
];

const footerGroups = [
  {
    title: 'Platform',
    items: ['Dashboard', 'Approvals', 'Logs', 'Audit Trail'],
  },
  {
    title: 'Company',
    items: ['About', 'Security', 'Support', 'Docs'],
  },
  {
    title: 'Contact',
    items: ['help@odoofinance.io', '+1 (415) 555-0189', 'San Francisco, CA'],
  },
];

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-root relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#ecfeff_0%,_#f8fafc_38%,_#ffffff_78%)] text-slate-900">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="landing-orb landing-orb-a pointer-events-none absolute -left-24 top-24 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="landing-orb landing-orb-b pointer-events-none absolute right-0 top-16 h-64 w-64 rounded-full bg-blue-300/25 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
          <span className="landing-soft-glow inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">O</span>
          Odoo Reimbursements
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#workflow" className="hover:text-slate-900">Workflow</a>
          <a href="#contact" className="hover:text-slate-900">Contact</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth/login"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-white sm:px-4"
          >
            Login
          </Link>
          <Link
            to="/auth/signup"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark sm:px-4"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-14 pt-4 md:px-10 md:pb-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="landing-fade-up space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
              <Sparkles size={14} />
              Enterprise Expense Command Center
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
                Make expense operations feel effortless.
              </h1>
              <p className="landing-copy max-w-xl text-lg text-slate-600 md:text-xl">
                Give employees a simple submission flow, empower manager-like roles with clear queues, and keep finance fully in control from request to reimbursement.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/auth/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-primary-dark"
              >
                Launch Workspace
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Portal
              </Link>
            </div>

            <div className="grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((item) => (
                <article key={item.label} className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl font-bold text-slate-900">{item.value}</p>
                  <p className="landing-copy mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="landing-fade-up-delayed landing-glass rounded-3xl border border-cyan-100 bg-white/90 p-6 shadow-xl shadow-cyan-100/50 backdrop-blur md:p-7">
            <h2 className="text-xl font-bold text-slate-800">Live Queue Snapshot</h2>
            <p className="landing-copy mt-2 text-sm text-slate-600">
              Every request stays visible from submission to final payout with full status history.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-700">Request #OD-2418</p>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Pending</span>
                </div>
                <p className="landing-copy mt-2 text-sm text-slate-500">Marketing team meal reimbursement</p>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                  <BadgeCheck size={16} />
                  Submission validated in 18 seconds
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sky-700">
                  <UsersRound size={16} />
                  Waiting in manager-like approval queue
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                  <Clock3 size={16} />
                  Target payout in 48 hours
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section id="features" className="mt-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Built for finance precision</h2>
            <p className="landing-copy max-w-md text-sm text-slate-600">
              Reduce manual follow-up work while preserving governance, transparency, and policy confidence.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map(({ title, body, icon }) => (
              <article key={title} className="landing-glass rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                <span className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  {React.createElement(icon, { size: 20 })}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
                <p className="landing-copy mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="mt-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Three-step operating rhythm</h2>
            <p className="landing-copy max-w-md text-sm text-slate-600">
              Keep every request moving with clean handoffs across employees, reviewers, and finance.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <article key={step.title} className="landing-glass rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="inline-flex rounded-lg bg-cyan-50 p-2 text-cyan-700">
                    {React.createElement(step.icon, { size: 18 })}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
                <p className="landing-copy mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="landing-glass rounded-3xl border border-cyan-100 bg-[linear-gradient(130deg,_rgba(255,255,255,0.95)_0%,_rgba(236,254,255,0.9)_52%,_rgba(219,234,254,0.88)_100%)] p-8 shadow-xl shadow-cyan-100/60 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  <Building2 size={14} />
                  For Growing Finance Teams
                </p>
                <h3 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
                  Ready to modernize your reimbursement workflow?
                </h3>
                <p className="landing-copy mt-2 text-sm text-slate-600 md:text-base">
                  Start with a manager-like workflow model and scale to complex role setups as your organization grows.
                </p>
              </div>

              <Link
                to="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Create Account
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="relative mt-16 border-t border-slate-200/70 bg-white/80">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] md:px-10">
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-900">Odoo Reimbursements</p>
            <p className="landing-copy mt-3 max-w-sm text-sm text-slate-600">
              Expense management platform for teams that want speed, control, and reliable visibility.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">{group.title}</p>
              <ul className="landing-copy mt-3 space-y-2 text-sm text-slate-600">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 border-t border-slate-200/70 px-6 py-4 text-xs text-slate-500 md:flex-row md:items-center md:px-10">
          <p>Copyright {currentYear} Odoo Reimbursements. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Mail size={13} />help@odoofinance.io</span>
            <span className="inline-flex items-center gap-1.5"><PhoneCall size={13} />+1 (415) 555-0189</span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={13} />San Francisco</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
