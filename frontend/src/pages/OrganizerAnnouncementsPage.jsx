import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  X,
  Users,
  AlertTriangle,
  Sparkles,
  Send
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const OrganizerAnnouncementsPage = () => {
  const { user, token } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [formState, setFormState] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    priority: 'normal',
    is_published: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
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
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/announcements', {
        title: formState.title,
        content: formState.content,
        target_audience: formState.target_audience,
        priority: formState.priority,
        is_published: formState.is_published
      });
      setCreateModalOpen(false);
      setFormState({
        title: '',
        content: '',
        target_audience: 'all',
        priority: 'normal',
        is_published: true
      });
      fetchAnnouncements();
    } catch (err) {
      alert(`Publishing failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormState({
      title: item.title,
      content: item.content,
      target_audience: item.target_audience,
      priority: item.priority,
      is_published: item.is_published
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/announcements/${editingItem.id}`, {
        title: formState.title,
        content: formState.content,
        target_audience: formState.target_audience,
        priority: formState.priority,
        is_published: formState.is_published
      });
      setEditModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete bulletin '${item.title}'?`)) return;
    try {
      await api.delete(`/api/announcements/${item.id}`);
      fetchAnnouncements();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchesAudience = audienceFilter === 'ALL' || a.target_audience === audienceFilter;
    return matchesSearch && matchesAudience;
  });

  return (
    <DashboardLayout pageTitle="Announcements & Bulletins">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Campus Communications & Dispatches</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Announcements & Notices Hub
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Draft, schedule, and broadcast official news bulletins with audience segmentation and audit history.
            </p>
          </div>

          <button
            onClick={() => {
              setFormState({
                title: '',
                content: '',
                target_audience: 'all',
                priority: 'normal',
                is_published: true
              });
              setCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E7E9F1] shadow-2xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#687086] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search announcements by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#687086] font-medium">Audience:</span>
            {['ALL', 'all', 'members_only', 'organizers'].map((aud) => (
              <button
                key={aud}
                onClick={() => setAudienceFilter(aud)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-colors ${
                  audienceFilter === aud
                    ? 'bg-[#171A2B] text-white'
                    : 'bg-[#F7F8FC] text-[#687086] hover:bg-[#E7E9F1]'
                }`}
              >
                {aud === 'all' ? 'All Students' : aud.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-6 bg-white rounded-2xl border border-[#E7E9F1]">
              <LoadingSkeleton lines={4} />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-[#E7E9F1]">
              <EmptyState
                icon={Megaphone}
                title="No bulletins found"
                description="Click 'Publish Announcement' to broadcast chapter updates to student members."
              />
            </div>
          ) : (
            filteredAnnouncements.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-[#E7E9F1] shadow-2xs hover:border-[#625BF6]/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.priority === 'urgent' ? 'critical' : item.priority === 'high' ? 'warning' : 'neutral'}>
                      {item.priority.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-bold text-[#625BF6] bg-[#625BF6]/10 px-2 py-0.5 rounded-full capitalize">
                      {item.target_audience.replace('_', ' ')}
                    </span>
                    <Badge variant={item.is_published ? 'positive' : 'neutral'}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <span className="text-[10px] text-[#687086]">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#171A2B]">{item.title}</h3>
                  <p className="text-xs text-[#687086] leading-relaxed whitespace-pre-line">{item.content}</p>

                  <div className="text-[11px] text-[#687086] flex items-center gap-2 pt-1">
                    <span>Published by <strong>{item.author_name || 'Executive Board'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 text-[#687086] hover:text-[#171A2B] hover:bg-[#F7F8FC] rounded-xl transition-colors"
                    title="Edit Bulletin"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-[#D9485F] hover:bg-[#D9485F]/10 rounded-xl transition-colors"
                    title="Delete Bulletin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create / Edit Modal */}
        {(createModalOpen || editModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#625BF6]" />
                  <span>{createModalOpen ? 'New Announcement' : 'Edit Announcement'}</span>
                </h3>
                <button
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditModalOpen(false);
                  }}
                  className="text-[#687086] hover:text-[#171A2B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createModalOpen ? handleCreate : handleUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Update for Workshop Track"
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Content & Details *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter dispatch content..."
                    value={formState.content}
                    onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Target Audience</label>
                    <select
                      value={formState.target_audience}
                      onChange={(e) => setFormState({ ...formState, target_audience: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      <option value="all">All Campus Community</option>
                      <option value="members_only">Active Members Only</option>
                      <option value="organizers">Organizers & Core Board</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Priority</label>
                    <select
                      value={formState.priority}
                      onChange={(e) => setFormState({ ...formState, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ann-publish"
                    checked={formState.is_published}
                    onChange={(e) => setFormState({ ...formState, is_published: e.target.checked })}
                    className="rounded text-[#625BF6]"
                  />
                  <label htmlFor="ann-publish" className="font-semibold text-[#171A2B] cursor-pointer">
                    Publish immediately to active bulletins feed
                  </label>
                </div>

                <div className="pt-3 border-t border-[#E7E9F1] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setEditModalOpen(false);
                    }}
                    className="px-4 py-2 border rounded-xl text-[#687086] hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Saving...' : createModalOpen ? 'Broadcast' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
