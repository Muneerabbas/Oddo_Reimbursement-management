import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ScanLine } from 'lucide-react';
import ExpenseForm from '../../components/forms/ExpenseForm';

const SubmitExpense = () => {
  return (
    <div className="mx-auto max-w-5xl py-6">
      <header className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,_#f8fafc_0%,_#ffffff_50%,_#ecfeff_100%)] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Expense Workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Submit New Expense
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Capture amount, category, and receipt in one flow. Use AI scan for faster entry and
              review low-confidence fields before submission.
            </p>
          </div>

          <Link
            to="/expenses/scan"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ScanLine size={16} />
            Open Receipt Scanner
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <ExpenseForm />
    </div>
  );
};

export default SubmitExpense;
