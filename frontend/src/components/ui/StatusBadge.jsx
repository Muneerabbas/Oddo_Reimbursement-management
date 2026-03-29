import React from 'react';

const StatusBadge = ({ status }) => {
  // Map internal database statuses to accessible Tailwind UI strings
  const getBadgeStyling = (currentStatus) => {
    switch (currentStatus) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyling(status)}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
