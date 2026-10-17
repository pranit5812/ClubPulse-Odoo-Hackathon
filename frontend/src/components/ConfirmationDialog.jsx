import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export const ConfirmationDialog = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E7E9F1]">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isDestructive
                  ? 'bg-[#FDF2F4] text-[#D9485F]'
                  : 'bg-[#EEEDFE] text-[#625BF6]'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#171A2B]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1 rounded-lg text-[#687086] hover:text-[#171A2B] hover:bg-[#F3F4F8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#687086] leading-relaxed">{message}</p>

        <div className="pt-3 border-t border-[#E7E9F1] flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-[#E7E9F1] text-[#171A2B] rounded-lg text-xs font-semibold hover:bg-[#F7F8FC] transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-[#D9485F] hover:bg-[#c43c51]'
                : 'bg-[#625BF6] hover:bg-[#5048E5]'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
