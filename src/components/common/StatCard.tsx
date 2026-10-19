import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  tone?: 'brand' | 'amber' | 'emerald' | 'rose' | 'purple';
}

const TONES = {
  brand: {
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    badge: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    badge: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    badge: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    badge: 'text-purple-700 bg-purple-50 border-purple-200',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  badge,
  tone = 'brand',
}) => {
  const t = TONES[tone];
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl ${t.bg} ${t.text} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</span>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${t.badge}`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
};
