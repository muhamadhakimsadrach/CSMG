import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
