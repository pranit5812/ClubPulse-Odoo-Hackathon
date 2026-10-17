import React from 'react';

const variantStyles = {
  active: 'bg-[#E7F5F0] text-[#16856B] border-[#BCE4D7]',
  completed: 'bg-[#E7F5F0] text-[#16856B] border-[#BCE4D7]',
  done: 'bg-[#E7F5F0] text-[#16856B] border-[#BCE4D7]',
  paid: 'bg-[#E7F5F0] text-[#16856B] border-[#BCE4D7]',
  success: 'bg-[#E7F5F0] text-[#16856B] border-[#BCE4D7]',

  warning: 'bg-[#FEF7ED] text-[#D98A18] border-[#FCE3BF]',
  pending: 'bg-[#FEF7ED] text-[#D98A18] border-[#FCE3BF]',
  in_progress: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
  todo: 'bg-[#F3F4F8] text-[#687086] border-[#E7E9F1]',

  critical: 'bg-[#FDF2F4] text-[#D9485F] border-[#FACED5]',
  expired: 'bg-[#FDF2F4] text-[#D9485F] border-[#FACED5]',
  rejected: 'bg-[#FDF2F4] text-[#D9485F] border-[#FACED5]',
  error: 'bg-[#FDF2F4] text-[#D9485F] border-[#FACED5]',

  primary: 'bg-[#EEEDFE] text-[#625BF6] border-[#D4D1FD]',
  accent: 'bg-[#EEEDFE] text-[#625BF6] border-[#D4D1FD]',
  neutral: 'bg-[#F3F4F8] text-[#687086] border-[#E7E9F1]'
};

export const StatusBadge = ({ children, variant = 'neutral', className = '', dot = false }) => {
  const normVariant = variant ? variant.toLowerCase().replace('-', '_') : 'neutral';
  const style = variantStyles[normVariant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            normVariant === 'critical' || normVariant === 'error'
              ? 'bg-[#D9485F]'
              : normVariant === 'warning'
              ? 'bg-[#D98A18]'
              : normVariant === 'active' || normVariant === 'success'
              ? 'bg-[#16856B]'
              : 'bg-[#625BF6]'
          }`}
        />
      )}
      {children}
    </span>
  );
};

export const Badge = StatusBadge;
export default StatusBadge;
