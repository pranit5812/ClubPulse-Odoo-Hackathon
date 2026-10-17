import React from 'react';
import { FolderOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'There are no items matching your criteria at this moment.',
  actionText,
  onAction,
  actionLink
}) => {
  return (
    <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-[#E7E9F1] shadow-[0_1px_3px_rgba(23,26,43,0.02)] max-w-md mx-auto">
      <div className="w-12 h-12 rounded-xl bg-[#F3F4F8] text-[#687086] flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-[#171A2B]">{title}</h3>
      <p className="text-xs text-[#687086] mt-1 mb-5 max-w-xs mx-auto leading-relaxed">{description}</p>
      {(actionText || actionLink) && (
        <div>
          {actionLink ? (
            <a
              href={actionLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {actionText}
            </a>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
