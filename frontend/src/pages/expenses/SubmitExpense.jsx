import React from 'react';
import { Link } from 'react-router-dom';
import ExpenseForm from '../../components/forms/ExpenseForm';
import PageHeader from '../../components/ui/PageHeader';

const SubmitExpense = () => {
  return (
    <div className="max-w-3xl mx-auto py-6">
      
      {/* Declarative Page Wrapper isolated from Native Form Structure */}
      <header className="mb-8 pl-1">
        <PageHeader
          title="Submit New Expense"
          description="Fill out the form below or auto-extract your receipt using our OCR tools."
          actions={(
            <Link
              to="/expenses/scan"
              className="inline-flex items-center justify-center rounded-lg border border-primary/25 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Open Receipt Scanner
            </Link>
          )}
        />
      </header>

      {/* Render modular functional Form System */}
      <ExpenseForm />

    </div>
  );
};

export default SubmitExpense;
