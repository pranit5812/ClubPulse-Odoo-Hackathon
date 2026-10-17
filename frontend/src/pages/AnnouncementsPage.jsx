import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Bell, Plus, Sparkles, X, Megaphone, Clock } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';

export const AnnouncementsPage = () => {
  const { user, role } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetAudience, setTargetAudience] = useState('all');
  const [createLoading, setCreateLoading] = useState(false);

  const isOrganizer = ['organizer', 'admin'].includes(role);

  const fetchAnnouncements = async () => {
    try {
      const data = await api.get('/api/announcements');
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setCreateLoading(true);

    try {
      await api.post('/api/announcements', {
        title,
        content,
        priority,
        target_audience: targetAudience,
        is_published: true
      });
      setModalOpen(false);
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch (err) {
      alert(`Failed to publish: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Official Chapter Bulletins</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#171A2B]">
              Announcements & Notices
            </h1>
            <p className="text-xs sm:text-sm text-[#687086] mt-1">
              Important alerts, hackathon schedule updates, and exclusive member perks from executive leadership.
            </p>
          </div>

          {isOrganizer && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Announcement</span>
            </button>
          )}
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-36 animate-pulse border border-[#E7E9F1]"></div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-[#E7E9F1]">
            <EmptyState
              icon={Bell}
              title="No announcements posted yet"
              description="Official broadcasts from chapter officers will appear here."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const isUrgent = ann.priority === 'urgent';
              const isHigh = ann.priority === 'high';

              return (
                <div
                  key={ann.id}
                  className={`bg-white rounded-2xl p-6 border transition-all shadow-2xs space-y-3 ${
                    isUrgent
                      ? 'border-[#D9485F]/30 bg-[#D9485F]/5'
                      : isHigh
                      ? 'border-[#D98A18]/30 bg-[#D98A18]/5'
                      : 'border-[#E7E9F1]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={isUrgent ? 'critical' : isHigh ? 'warning' : 'accent'}>
                        {ann.priority.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                        Audience: {ann.target_audience.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#687086] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ann.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#171A2B]">{ann.title}</h3>

                  <p className="text-xs sm:text-sm text-[#687086] leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>

                  <div className="pt-2 border-t border-[#E7E9F1] flex items-center justify-between text-[11px] text-[#687086]">
                    <span>Published by <strong className="text-[#171A2B]">{ann.author_name}</strong></span>
                    <span className="font-mono text-[10px]">#{ann.id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E7E9F1]">
              <div className="flex justify-between items-center border-b border-[#E7E9F1] pb-3">
                <h3 className="font-bold text-sm text-[#171A2B]">Publish Chapter Bulletin</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[#687086] hover:text-[#171A2B] hover:bg-[#F7F8FC]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Announcement Headline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 🚨 HackPulse 2026 Venue Change to Hall A"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Target Audience
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    >
                      <option value="all">Everyone</option>
                      <option value="members_only">Members Only</option>
                      <option value="organizers">Organizers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Content *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide full context, instructions, and next steps..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  ></textarea>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 border border-[#E7E9F1] text-[#687086] rounded-xl font-semibold hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 py-2.5 bg-[#625BF6] text-white rounded-xl font-semibold hover:bg-[#5048E5] transition-colors"
                  >
                    {createLoading ? 'Publishing...' : 'Broadcast'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
