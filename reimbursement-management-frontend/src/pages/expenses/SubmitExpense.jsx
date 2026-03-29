import React from 'react';
import ExpenseForm from '../../components/forms/ExpenseForm';

const SubmitExpense = () => {
  return (
    <div className="max-w-3xl mx-auto py-6">
      
      {/* Declarative Page Wrapper isolated from Native Form Structure */}
      <header className="mb-8 pl-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          Submit New Expense
        </h1>
        <p className="text-slate-500 mt-2">
           Fill out the form below or auto-extract your receipt using our OCR tools.
        </p>
      </header>

      {/* Render modular functional Form System */}
      <ExpenseForm />

    </div>
  );
};

export default SubmitExpense;
