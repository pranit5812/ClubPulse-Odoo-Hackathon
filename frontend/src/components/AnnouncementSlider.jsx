import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Megaphone,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const AnnouncementSlider = ({ announcements = [] }) => {
  // Only display real announcements loaded from database that are published
  const officialAnnouncements = announcements.filter(
    (a) => a && a.title && a.is_published !== false
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const total = officialAnnouncements.length;

  // Auto-advance slides smoothly every 4.5 seconds
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 4500);

    return () => clearInterval(interval);
  }, [total, isPaused]);

  // Guard index in case announcements change
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  if (total === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 border border-[#E7E9F1] shadow-2xs flex items-center gap-3.5 text-xs text-[#687086]">
        <div className="w-10 h-10 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-[#171A2B]">No official bulletins posted yet</h4>
          <p className="text-[11px] text-[#687086] mt-0.5">
            Real announcements created by chapter Admins and Organizers will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'normal').toLowerCase();
    if (p === 'urgent' || p === 'critical') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D9485F] text-white shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>Urgent Notice</span>
        </span>
      );
    }
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D98A18] text-white shadow-xs">
          <span>Priority Bulletin</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#625BF6]/20 text-[#D4D1FD] border border-[#625BF6]/40">
        <Sparkles className="w-3 h-3 text-[#A5A0FD]" />
        <span>Official Broadcast</span>
      </span>
    );
  };

  return (
    <div
      className="relative rounded-2xl bg-[#17182B] text-white border border-[#2B2E4E] shadow-xl overflow-hidden group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#625BF6]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#D9485F]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Strip of the Announcement Card */}
      <div className="relative z-10 px-5 sm:px-6 pt-5 pb-3 border-b border-[#252844] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#625BF6] text-white flex items-center justify-center shadow-md shadow-[#625BF6]/40 shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-white">
                Official Leadership Bulletin
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16856B]/20 text-[#3CD4A0] border border-[#16856B]/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Leadership</span>
              </span>
            </div>
            <p className="text-[11px] text-[#A6ACBE]">
              Real-time directives published directly by verified Chapter Admin or Organizer
            </p>
          </div>
        </div>

        {/* Slide Counter & Manual Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#23253E] border border-[#2E3152] text-[#A6ACBE]">
            {currentIndex + 1} / {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-[#23253E] hover:bg-[#625BF6] text-white transition-colors border border-[#2E3152] cursor-pointer"
              title="Previous Announcement"
              aria-label="Previous Announcement"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-[#23253E] hover:bg-[#625BF6] text-white transition-colors border border-[#2E3152] cursor-pointer"
              title="Next Announcement"
              aria-label="Next Announcement"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Sliding Horizontal Track */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {officialAnnouncements.map((ann) => {
            const authorRole = ann.author_name?.includes('Admin')
              ? 'Chapter Admin'
              : ann.author_name?.includes('Organizer')
              ? 'Chapter Organizer'
              : 'Campus Executive';

            const createdDate = ann.created_at
              ? new Date(ann.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recently';

            return (
              <div
                key={ann.id}
                className="w-full shrink-0 p-5 sm:p-6 space-y-3 flex flex-col justify-between min-h-[160px]"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getPriorityBadge(ann.priority)}

                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#CBD0E1]">
                      <Shield className="w-3.5 h-3.5 text-[#16856B]" />
                      <span>{ann.author_name}</span>
                      <span className="text-[#687086]">({authorRole})</span>
                    </div>

                    <div className="inline-flex items-center gap-1 text-[11px] text-[#8B93A7]">
                      <Clock className="w-3 h-3" />
                      <span>{createdDate}</span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight line-clamp-1">
                    {ann.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#CBD0E1] leading-relaxed line-clamp-2 max-w-4xl">
                    {ann.content}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedAnnouncement(ann)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#847BFA] hover:text-white transition-colors group-hover:translate-x-0.5 duration-150 cursor-pointer"
                  >
                    <span>Read Full Bulletin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] text-[#8B93A7]">
                    Auto-slides • Hover to pause
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Strip: Dots & Continuous Progress Bar */}
      <div className="relative z-10 px-5 sm:px-6 py-2.5 bg-[#121324] border-t border-[#23253E] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {officialAnnouncements.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex
                  ? 'w-6 bg-[#625BF6]'
                  : 'w-2 bg-[#363A5D] hover:bg-[#687086]'
              }`}
              title={`Go to announcement ${idx + 1}`}
              aria-label={`Go to announcement ${idx + 1}`}
            />
          ))}
        </div>

        <div className="text-[10px] text-[#A6ACBE] font-mono">
          {currentIndex + 1} of {total} announcements
        </div>
      </div>

      {/* Auto-Slide Progress Bar */}
      <div className="h-1 bg-[#1A1C30] w-full overflow-hidden">
        <div
          key={currentIndex}
          className={`h-full bg-gradient-to-r from-[#625BF6] to-[#A5A0FD] ${
            !isPaused ? 'animate-[progress_4.5s_linear]' : 'w-full opacity-50'
          }`}
          style={{
            animationDuration: '4.5s',
            animationTimingFunction: 'linear'
          }}
        />
      </div>

      {/* Full Modal Viewer for Announcement */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/80 backdrop-blur-md">
          <div className="bg-white text-[#171A2B] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E9F1] animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E7E9F1]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {getPriorityBadge(selectedAnnouncement.priority)}
                  <span className="text-[11px] font-semibold text-[#687086]">
                    By {selectedAnnouncement.author_name}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#171A2B] tracking-tight">
                  {selectedAnnouncement.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-xl text-[#687086] hover:bg-[#F3F4F8] hover:text-[#171A2B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-[#4E5569] leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto pr-1">
              {selectedAnnouncement.content}
            </div>

            <div className="pt-3 border-t border-[#E7E9F1] flex items-center justify-between text-xs text-[#687086]">
              <span>
                Posted: {new Date(selectedAnnouncement.created_at).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-[#625BF6] text-white rounded-xl text-xs font-semibold hover:bg-[#5048E5] transition-colors shadow-xs cursor-pointer"
              >
                Close Bulletin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementSlider;
