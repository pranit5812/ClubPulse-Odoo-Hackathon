import React from 'react';

export const LoadingSkeleton = ({ count = 3, type = 'card' }) => {
  if (type === 'table') {
    return (
      <div className="bg-white rounded-xl border border-[#E7E9F1] overflow-hidden p-4 space-y-3">
        <div className="h-6 bg-[#F3F4F8] rounded-md animate-pulse w-1/4 mb-4"></div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-4 bg-[#F3F4F8] rounded animate-pulse w-1/3"></div>
            <div className="h-4 bg-[#F3F4F8] rounded animate-pulse w-1/4"></div>
            <div className="h-4 bg-[#F3F4F8] rounded animate-pulse w-1/6"></div>
            <div className="h-4 bg-[#F3F4F8] rounded animate-pulse w-1/5 ml-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-[#E7E9F1] p-5 space-y-3 animate-pulse"
        >
          <div className="h-32 bg-[#F3F4F8] rounded-lg"></div>
          <div className="h-4 bg-[#F3F4F8] rounded w-3/4"></div>
          <div className="h-3 bg-[#F3F4F8] rounded w-1/2"></div>
          <div className="pt-2 border-t border-[#E7E9F1] flex justify-between">
            <div className="h-4 bg-[#F3F4F8] rounded w-1/4"></div>
            <div className="h-4 bg-[#F3F4F8] rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
