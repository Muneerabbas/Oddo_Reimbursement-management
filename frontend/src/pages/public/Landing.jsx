import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  ChartColumnBig,
  Clock3,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const featureCards = [
  {
    title: 'Smart Intake',
    body: 'Employees submit expenses in under a minute with guided fields and clean validation.',
    icon: ReceiptText,
  },
  {
    title: 'Rule-Based Approvals',
    body: 'Route requests by amount, team, and policy with transparent multi-step approval flows.',
    icon: ShieldCheck,
  },
  {
    title: 'Live Visibility',
    body: 'Track pending, approved, and rejected reimbursements in one operational dashboard.',
    icon: ChartColumnBig,
  },
];

const quickStats = [
  { label: 'Avg approval time', value: '2.4 days' },
  { label: 'Policy compliance', value: '98.7%' },
  { label: 'Expense records', value: '10k+' },
];

const Landing = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-root relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_#dbeafe_0%,_#f8fafc_36%,_#ffffff_72%)] text-slate-900">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="landing-soft-glow inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">O</span>
          Odoo Reimbursements
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/auth/login"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-white"
          >
            Login
          </Link>
          <Link
            to="/auth/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-6 md:px-10 md:pb-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="landing-fade-up space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <Sparkles size={14} />
              Enterprise Expense Control
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
                Reimbursements that move as fast as your teams.
              </h1>
              <p className="landing-copy max-w-xl text-lg text-slate-600">
                Cut manual follow-ups, standardize policy checks, and give finance teams a calm, auditable workflow from submission to payout.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/auth/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-primary-dark"
              >
                Start Free Setup
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Portal
              </Link>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {quickStats.map((item) => (
                <article key={item.label} className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl font-bold text-slate-900">{item.value}</p>
                  <p className="landing-copy mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="landing-fade-up-delayed rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-sky-100/50 backdrop-blur md:p-7">
            <h2 className="text-xl font-bold text-slate-800">Workflow Snapshot</h2>
            <p className="landing-copy mt-2 text-sm text-slate-600">
              From employee submission to manager approval and finance release, every handoff is timestamped.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-700">Expense #OD-2418</p>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Pending</span>
                </div>
                <p className="landing-copy mt-2 text-sm text-slate-500">Marketing team meal reimbursement</p>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                  <BadgeCheck size={16} />
                  Submitted with receipt and tax details
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sky-700">
                  <UsersRound size={16} />
                  Awaiting manager decision
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-violet-700">
                  <Clock3 size={16} />
                  Target payout in 48 hours
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Built for finance clarity</h2>
            <p className="landing-copy hidden max-w-md text-sm text-slate-600 md:block">
              Reduce operational drag while preserving approvals, controls, and audit confidence.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map(({ title, body, icon }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                <span className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                  {React.createElement(icon, { size: 20 })}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
                <p className="landing-copy mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
