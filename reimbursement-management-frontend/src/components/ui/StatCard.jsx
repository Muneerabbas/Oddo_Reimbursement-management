import React from 'react';

const StatCard = ({ title, value, icon, valueColorClass = 'text-slate-900', trend, description }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className={`text-3xl font-bold ${valueColorClass}`}>
            {value}
          </h3>
        </div>
        
        {/* Render Icon with light background wrapper if passed */}
        {icon && (
          <div className="p-3 bg-slate-50 rounded-lg text-slate-400">
            {icon}
          </div>
        )}
      </div>

      {/* Optional supplementary text/trend data */}
      {(trend || description) && (
        <div className="mt-4 flex items-center text-sm">
          {trend && (
             <span className={`font-medium ${trend.isUp ? 'text-emerald-600' : 'text-red-600'} flex items-center gap-1`}>
                {trend.isUp ? '↑' : '↓'} {trend.value}
             </span>
          )}
          {description && (
            <span className={`text-slate-500 ${trend ? 'ml-2' : ''}`}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
