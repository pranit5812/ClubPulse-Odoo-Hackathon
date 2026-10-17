import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  badge,
  trend = null,
  onClick
}) => {
  const iconTints = {
    indigo: 'bg-[#EEEDFE] text-[#625BF6] border-[#D4D1FD]',
    teal: 'bg-[#E7F5F0] text-[#16856B] border-[#BCE4D7]',
    amber: 'bg-[#FEF7ED] text-[#D98A18] border-[#FCE3BF]',
    rose: 'bg-[#FDF2F4] text-[#D9485F] border-[#FACED5]',
    slate: 'bg-[#F3F4F8] text-[#687086] border-[#E7E9F1]'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-[#E7E9F1] shadow-[0_1px_3px_rgba(23,26,43,0.03)] hover:border-[#D3D7E8] hover:shadow-[0_4px_12px_rgba(23,26,43,0.05)] transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#687086]">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${iconTints[color] || iconTints.indigo}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold text-[#171A2B] tracking-tight">{value}</div>
        {badge}
      </div>

      <div className="flex items-center justify-between mt-1 text-xs text-[#687086]">
        {subtitle && <span>{subtitle}</span>}
        {trend && (
          <span
            className={`font-semibold text-xs flex items-center gap-0.5 ${
              trend.isPositive ? 'text-[#16856B]' : 'text-[#D9485F]'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
