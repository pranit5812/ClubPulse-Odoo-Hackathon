import React from 'react';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const RiskAlert = ({
  severity = 'WARNING',
  category = 'OPERATIONAL',
  title,
  explanation,
  sourceRecord,
  actionText,
  onAction,
  actionLink
}) => {
  const isCritical = severity === 'CRITICAL' || severity === 'HIGH';
  const isWarning = severity === 'WARNING' || severity === 'MEDIUM';

  const containerStyles = isCritical
    ? 'bg-[#FDF2F4] border-[#FACED5]'
    : isWarning
    ? 'bg-[#FEF7ED] border-[#FCE3BF]'
    : 'bg-[#EEEDFE] border-[#D4D1FD]';

  const iconStyles = isCritical
    ? 'text-[#D9485F]'
    : isWarning
    ? 'text-[#D98A18]'
    : 'text-[#625BF6]';

  const Icon = isCritical ? AlertCircle : isWarning ? AlertTriangle : Info;

  return (
    <div className={`p-4 rounded-xl border ${containerStyles} transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconStyles}`} />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant={isCritical ? 'critical' : isWarning ? 'warning' : 'accent'} dot>
                {severity}
              </StatusBadge>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#687086]">
                {category}
              </span>
              {sourceRecord && (
                <span className="text-[11px] font-mono bg-white/70 px-1.5 py-0.5 rounded border border-[#E7E9F1] text-[#171A2B]">
                  {sourceRecord.title || sourceRecord.id}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[#171A2B]">{title}</h4>
            <p className="text-xs text-[#687086] leading-relaxed">{explanation}</p>
          </div>
        </div>

        {(actionText || actionLink) && (
          <div className="sm:self-center shrink-0">
            {actionLink ? (
              <a
                href={actionLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E7E9F1] hover:border-[#D3D7E8] text-xs font-semibold text-[#171A2B] shadow-2xs transition-all hover:bg-[#F7F8FC]"
              >
                <span>{actionText || 'Take Action'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#625BF6]" />
              </a>
            ) : (
              <button
                onClick={onAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E7E9F1] hover:border-[#D3D7E8] text-xs font-semibold text-[#171A2B] shadow-2xs transition-all hover:bg-[#F7F8FC]"
              >
                <span>{actionText || 'Take Action'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#625BF6]" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAlert;
