import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BadgeCheck, Building2, ShieldCheck, Sparkles } from 'lucide-react';

const AuthLayout = () => {
  const location = useLocation();
  const isSignup = location.pathname.includes('/auth/signup');

  return (
    <div className="auth-root relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0%,_#f8fafc_44%,_#ffffff_78%)] p-4 md:p-6">
      <div className="auth-orb auth-orb-a pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="auth-orb auth-orb-b pointer-events-none absolute right-0 top-12 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur md:min-h-[calc(100vh-3rem)]">
        <aside className="hidden w-[43%] flex-col justify-between border-r border-slate-200 bg-[linear-gradient(145deg,_#082f49_0%,_#0f172a_45%,_#1e3a8a_100%)] p-10 text-white lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900">
                <Building2 size={16} />
              </span>
              Odoo Reimbursements
            </Link>

            <h2 className="mt-10 text-3xl font-bold leading-tight">
              {isSignup ? 'Build your reimbursement workspace in minutes.' : 'Welcome back to your finance command center.'}
            </h2>
            <p className="auth-copy mt-4 text-sm leading-relaxed text-blue-100/90">
              Unified control for submissions, approvals, audit logs, and policy confidence.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3">
              <BadgeCheck size={18} className="mt-0.5 shrink-0 text-cyan-200" />
              <p className="auth-copy text-sm text-slate-100">Track approvals and reimbursements with clear role-based visibility.</p>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan-200" />
              <p className="auth-copy text-sm text-slate-100">Keep policy controls enforced from claim submission to payout completion.</p>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-cyan-200" />
              <p className="auth-copy text-sm text-slate-100">Reduce finance team overhead with fast, predictable workflows.</p>
            </div>
          </div>
        </aside>

        <main className="w-full overflow-y-auto p-6 sm:p-8 lg:w-[57%] lg:px-10 lg:py-9">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Secure Access</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isSignup ? 'Create your organization account' : 'Sign in to your account'}
            </h1>
            <p className="auth-copy mt-2 text-sm text-slate-600">
              {isSignup
                ? 'Set up your company profile and start managing reimbursements with confidence.'
                : 'Access your workspace to review requests, approvals, and reimbursement status.'}
            </p>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
