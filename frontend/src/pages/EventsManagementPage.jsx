import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Plus,
  Users,
  MapPin,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit2,
  Eye,
  SlidersHorizontal,
  Coins,
  Kanban,
  Box,
  Clock,
  QrCode,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Check,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  MoreVertical,
  LayoutGrid,
  List,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const EventsManagementPage = () => {
  const { token, role, user } = useAuth();
  const isOrganizer = role === 'organizer';
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [readinessSummaries, setReadinessSummaries] = useState([]);
  const [ticketSummaries, setTicketSummaries] = useState({});
  const [loading, setLoading] = useState(true);

  // Specific Event Registrations Analysis
  const [selectedSpecificEventId, setSelectedSpecificEventId] = useState('');
  const [activeRegEventModal, setActiveRegEventModal] = useState(null);
  const [regModalData, setRegModalData] = useState(null);
  const [loadingRegModal, setLoadingRegModal] = useState(false);
  const [regRosterFilter, setRegRosterFilter] = useState('all'); // all, member, non_member

  // Search & Filter controls
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // all, published, draft
  const [timeFilter, setTimeFilter] = useState('all'); // all, upcoming, past
  const [viewMode, setViewMode] = useState('grid'); // grid, table

  // Cancel Confirmation Modal
  const [cancelModalEvent, setCancelModalEvent] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Action status toast
  const [actionNotice, setActionNotice] = useState(null);
  const [pendingVolunteerCount, setPendingVolunteerCount] = useState(0);

  const fetchEventsAndSummaries = async () => {
    try {
      setLoading(true);
      const [evData, readyData, summaryData, volData] = await Promise.all([
        api.get('/api/events').catch(() => []),
        api.get('/api/readiness/events').catch(() => []),
        api.get('/api/tickets/events-summary').catch(() => []),
        api.get('/api/events/volunteer-applications').catch(() => [])
      ]);
      setEvents(evData || []);
      setReadinessSummaries(readyData || []);
      
      const pendingVols = (volData || []).filter((v) => v.status === 'pending').length;
      setPendingVolunteerCount(pendingVols);
      
      const map = {};
      (summaryData || []).forEach((s) => {
        map[s.event_id] = s;
      });
      setTicketSummaries(map);

      // Default selected specific event
      if (evData && evData.length > 0 && !selectedSpecificEventId) {
        setSelectedSpecificEventId(evData[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegistrationsModal = async (evt) => {
    setActiveRegEventModal(evt);
    setLoadingRegModal(true);
    try {
      const data = await api.get(`/api/tickets/event/${evt.id}/registrations`);
      setRegModalData(data);
    } catch (err) {
      console.error('Failed to load event registrations:', err);
      setRegModalData(null);
    } finally {
      setLoadingRegModal(false);
    }
  };

  useEffect(() => {
    fetchEventsAndSummaries();
  }, [token]);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Quick toggle publication status
  const handleTogglePublish = async (evt, e) => {
    e.stopPropagation();
    try {
      const updated = await api.patch(`/api/events/${evt.id}`, {
        is_published: !evt.is_published
      });
      setEvents((prev) =>
        prev.map((item) => (item.id === evt.id ? { ...item, is_published: updated.is_published } : item))
      );
      showNotice(
        updated.is_published
          ? `Event "${evt.title}" is now Published (visible to students, admin & treasurer).`
          : `Event "${evt.title}" is now Unpublished (hidden from students, admin & treasurer).`
      );
    } catch (err) {
      console.error('Failed to update publication status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  // Cancel event execution
  const handleConfirmCancel = async () => {
    if (!cancelModalEvent) return;
    try {
      setCancelling(true);
      await api.delete(`/api/events/${cancelModalEvent.id}`);
      setEvents((prev) => prev.filter((item) => item.id !== cancelModalEvent.id));
      showNotice(`Event "${cancelModalEvent.title}" has been cancelled.`);
      setCancelModalEvent(null);
    } catch (err) {
      console.error('Failed to cancel event:', err);
      alert('Failed to cancel event: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Unique tags for filter pill list
  const categoryPills = ['All', 'Hackathon', 'Workshop', 'AI', 'Coding', 'Tech', 'Gala', 'Design'];

  // Filtering logic
  const now = new Date();
  const filteredEvents = events.filter((evt) => {
    // Search filter
    const matchesSearch =
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      (evt.description || '').toLowerCase().includes(search.toLowerCase()) ||
      evt.venue.toLowerCase().includes(search.toLowerCase());

    // Category filter
    const matchesCategory =
      selectedCategory === 'All' ||
      (evt.tags && evt.tags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase())));

    // Status filter: Published vs Unpublished (Drafts)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && evt.is_published) ||
      (statusFilter === 'draft' && !evt.is_published);

    // Time filter (upcoming vs past)
    let matchesTime = true;
    if (timeFilter !== 'all' && evt.event_date) {
      const eventTime = new Date(evt.event_date).getTime();
      if (!isNaN(eventTime)) {
        if (timeFilter === 'upcoming') {
          matchesTime = eventTime >= now.getTime() - 24 * 3600 * 1000;
        } else if (timeFilter === 'past') {
          matchesTime = eventTime < now.getTime() - 24 * 3600 * 1000;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesTime;
  });

  return (
    <DashboardLayout
      pageTitle="Events & Tickets"
      breadcrumbs={[
        { label: 'Organizer', link: '/organizer/overview' },
        { label: 'Events & Tickets' }
      ]}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Notice alert */}
        {actionNotice && (
          <div className="p-3.5 bg-[#16856B]/10 border border-[#16856B]/30 rounded-xl flex items-center justify-between text-xs font-semibold text-[#16856B] animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-[#16856B] hover:opacity-75 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. PAGE HEADER: Title, Subtitle & Prominent "+ Add Event"         */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isOrganizer ? 'Events & Ticket Operations' : 'Event Registrations & Demographics'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#171A2B] tracking-tight">
              {isOrganizer ? 'Events & Tickets' : 'Event Registrations'}
            </h1>
            <p className="text-xs sm:text-sm text-[#687086] mt-1">
              {isOrganizer
                ? 'Create events, manage ticket availability, and monitor attendance.'
                : 'Monitor attendee registrations, ticket availability, and gate attendance.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <Link
              to="/organizer/volunteers"
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-all transform active:scale-98"
              title="Review & approve student volunteer requests"
            >
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span>Volunteer Registrations</span>
              {pendingVolunteerCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                  {pendingVolunteerCount}
                </span>
              )}
            </Link>

            <Link
              to="/organizer/tasks"
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-all transform active:scale-98"
              title="Volunteer & Sprint Task Coordination Board"
            >
              <Kanban className="w-4 h-4 text-indigo-700" />
              <span>Volunteer Tasks</span>
            </Link>

            {isOrganizer && (
              <Link
                to="/organizer/events/new"
                className="w-full sm:w-auto px-5 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold shadow-md shadow-[#625BF6]/25 flex items-center justify-center gap-2 transition-all transform active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </Link>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* Specific Event Registration Demographics: Members vs Non-Members */}
        {/* ============================================================== */}
        {events.length > 0 && (() => {
          const selectedEv = events.find((e) => e.id === selectedSpecificEventId) || events[0];
          const summary = ticketSummaries[selectedEv?.id] || {
            member_count: 0,
            non_member_count: 0,
            total_tickets: 0,
            total_revenue_paise: 0
          };
          const totalBooked = summary.total_tickets || selectedEv?.booked_count || 0;
          const memberCount = summary.member_count || 0;
          const nonMemberCount = summary.non_member_count || 0;
          const memberPercent = totalBooked > 0 ? Math.round((memberCount / totalBooked) * 100) : 0;
          const nonMemberPercent = totalBooked > 0 ? 100 - memberPercent : 0;

          return (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white to-[#F9FAFD] border border-[#E7E9F1] shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E9F1]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EEEDFE] text-[#625BF6] border border-[#D4D1FD] flex items-center justify-center font-bold shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#171A2B]">
                        Registration Demographics: Members vs Non-Members
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#625BF6]/10 text-[#625BF6] border border-[#625BF6]/20">
                        Live Analytics
                      </span>
                    </div>
                    <p className="text-xs text-[#687086] mt-0.5">
                      Select specific event to inspect attendee distribution, ticket tiers, and attendance verification.
                    </p>
                  </div>
                </div>

                {/* Specific Event Selector Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-[#687086]">Select Event:</span>
                  <select
                    value={selectedSpecificEventId}
                    onChange={(e) => setSelectedSpecificEventId(e.target.value)}
                    className="px-3 py-2 text-xs font-bold border border-[#E7E9F1] rounded-xl bg-white text-[#171A2B] shadow-2xs focus:ring-2 focus:ring-[#625BF6] outline-none max-w-[260px] truncate"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specific Event Snapshot Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Active Member Registrations */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Chapter Members</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      {memberPercent}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {memberCount} <span className="text-xs font-semibold text-emerald-700">passes</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium pt-1">
                    Rate: {formatINR(selectedEv.member_price_paise)} • Revenue: {formatINR(summary.member_revenue_paise || 0)}
                  </div>
                </div>

                {/* Non-Member Registrations */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-700" />
                      <span>Non-Members / Guests</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                      {nonMemberPercent}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    {nonMemberCount} <span className="text-xs font-semibold text-indigo-700">passes</span>
                  </div>
                  <div className="text-[11px] text-indigo-800 font-medium pt-1">
                    Rate: {formatINR(selectedEv.non_member_price_paise)} • Revenue: {formatINR(summary.non_member_revenue_paise || 0)}
                  </div>
                </div>

                {/* Total Capacity & Roster Button */}
                <div className="p-4 rounded-2xl bg-white border border-[#E7E9F1] flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#8B93A7] font-semibold uppercase">
                      <span>Total Booked</span>
                      <span>Capacity: {selectedEv.capacity}</span>
                    </div>
                    <div className="text-2xl font-black text-[#171A2B] mt-0.5">
                      {totalBooked} <span className="text-xs font-semibold text-[#687086]">/ {selectedEv.capacity} seats</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenRegistrationsModal(selectedEv)}
                    className="w-full py-2 px-3 rounded-xl bg-[#171A2B] hover:bg-[#252844] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Attendee Roster</span>
                  </button>
                </div>
              </div>

              {/* Split Bar */}
              {totalBooked > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#687086]">
                    <span className="text-emerald-700 font-bold">● {memberCount} Members ({memberPercent}%)</span>
                    <span className="text-indigo-700 font-bold">● {nonMemberCount} Non-Members ({nonMemberPercent}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-indigo-100 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${memberPercent}%` }}
                      title={`Members: ${memberCount}`}
                    />
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${nonMemberPercent}%` }}
                      title={`Non-Members: ${nonMemberCount}`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Filter & Search Toolbar */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] p-4 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#687086] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search events by title, description, or venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] focus:bg-white text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
              />
            </div>

            {/* Publication Status & Timeline Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Publication Status Selector */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-white text-[#171A2B] font-semibold focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
              >
                <option value="all">All Statuses ({events.length})</option>
                <option value="published">
                  Published ({events.filter((e) => e.is_published).length})
                </option>
                <option value="draft">
                  Unpublished / Drafts ({events.filter((e) => !e.is_published).length})
                </option>
              </select>

              {/* Time Period Tabs */}
              <div className="flex items-center bg-[#F7F8FC] border border-[#E7E9F1] p-0.5 rounded-xl text-xs">
                {['all', 'upcoming', 'past'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTimeFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                      timeFilter === tab
                        ? 'bg-white text-[#171A2B] shadow-2xs font-bold'
                        : 'text-[#687086] hover:text-[#171A2B]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="hidden sm:flex items-center bg-[#F7F8FC] border border-[#E7E9F1] p-0.5 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#625BF6] shadow-2xs'
                      : 'text-[#687086] hover:text-[#171A2B]'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-[#625BF6] shadow-2xs'
                      : 'text-[#687086] hover:text-[#171A2B]'
                  }`}
                  title="List / Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#687086] mr-1 shrink-0">
              Categories:
            </span>
            {categoryPills.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 text-xs ${
                  selectedCategory === cat
                    ? 'bg-[#625BF6] text-white shadow-2xs'
                    : 'bg-[#F7F8FC] text-[#687086] border border-[#E7E9F1] hover:bg-[#EEEDFE] hover:text-[#625BF6]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. EVENTS LISTING: Grid or Table with Organizer Controls         */}
        {/* ============================================================== */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl h-96 animate-pulse border border-[#E7E9F1]"
              />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-12 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EEEDFE] text-[#625BF6] flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#171A2B]">No events match your criteria</h3>
            <p className="text-xs text-[#687086] mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== 'All' || statusFilter !== 'all'
                ? 'Try adjusting your search filters or clear your search query.'
                : isOrganizer
                ? 'Get started by creating your chapter’s first event.'
                : 'No registered events found matching your criteria.'}
            </p>
            {isOrganizer && (
              <div className="mt-5">
                <Link
                  to="/organizer/events/new"
                  className="px-5 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#625BF6]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Event</span>
                </Link>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ============================================================ */
          /* CARDS GRID VIEW                                              */
          /* ============================================================ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const capacity = evt.capacity || 100;
              const booked = evt.booked_count || 0;
              const checkins = evt.checked_in_count || 0;
              const fillPercentage = Math.min(100, Math.round((booked / capacity) * 100));
              const isFull = booked >= capacity;

              const readySummary = readinessSummaries.find((r) => r.event_id === evt.id);
              const score = readySummary?.overall_readiness_score ?? 85;

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs hover:shadow-md hover:border-[#625BF6]/40 transition-all flex flex-col overflow-hidden group"
                >
                  {/* Banner Image with Fallback */}
                  <div className="h-44 w-full bg-[#17182B] relative overflow-hidden">
                    <img
                      src={
                        evt.banner_url ||
                        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    {/* Status Badges Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-md ${
                          evt.is_published
                            ? 'bg-[#16856B]/90 text-white border-[#16856B]'
                            : 'bg-[#17182B]/90 text-[#FFBA69] border-[#E78020]'
                        }`}
                      >
                        {evt.is_published
                          ? '● Published'
                          : '○ Unpublished (Draft)'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {isFull ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9485F] text-white">
                          Sold Out
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#17182B]/80 text-white backdrop-blur-xs border border-white/20">
                          {capacity - booked} Left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {(evt.tags || ['Event']).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold text-[#687086] bg-[#F7F8FC] border border-[#E7E9F1] px-2 py-0.5 rounded-md"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Title */}
                      <Link
                        to={`/organizer/events/${evt.id}`}
                        className="font-bold text-base text-[#171A2B] group-hover:text-[#625BF6] transition-colors line-clamp-1 block"
                      >
                        {evt.title}
                      </Link>

                      {/* Description */}
                      <p className="text-xs text-[#687086] line-clamp-2 leading-relaxed">
                        {evt.description || 'No description provided.'}
                      </p>

                      {/* Venue & Schedule */}
                      <div className="pt-1 text-xs text-[#687086] space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#625BF6] shrink-0" />
                          <span className="truncate">{evt.event_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#625BF6] shrink-0" />
                          <span className="truncate">{evt.venue}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Details: Capacity Bar & Prices */}
                    <div className="pt-3 border-t border-[#E7E9F1] space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-[#687086] mb-1">
                          <span className="font-semibold text-[#171A2B]">Capacity & Turnout</span>
                          <span>
                            {booked} / {capacity} ({fillPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#F0F2F7] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#625BF6] h-full rounded-full transition-all duration-300"
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[10px]">
                          <span className="text-[#16856B] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {checkins} verified check-ins
                          </span>
                          <span className="text-[#687086]">
                            Budget: {formatINR(evt.estimated_budget_paise || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Pricing Row */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0F2F7]">
                        <div>
                          <span className="text-[10px] text-[#687086] block">Member</span>
                          <span className="font-bold text-[#16856B]">
                            {formatINR(evt.member_price_paise)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#687086] block">Non-Member</span>
                          <span className="font-bold text-[#171A2B]">
                            {formatINR(evt.non_member_price_paise)}
                          </span>
                        </div>
                      </div>

                      {/* Registrations & Details & Organizer Controls */}
                      <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-[#F0F2F7]">
                        <button
                          type="button"
                          onClick={() => handleOpenRegistrationsModal(evt)}
                          className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="View Member vs Non-Member Registrations"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Registrations</span>
                        </button>

                        <Link
                          to={`/organizer/events/${evt.id}`}
                          className="py-1.5 px-2 bg-[#EEEDFE] hover:bg-[#625BF6] text-[#625BF6] hover:text-white rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </Link>

                        {/* Controls available ONLY to Organizer */}
                        {isOrganizer && (
                          <>
                            <Link
                              to={`/organizer/events/${evt.id}/edit`}
                              className="p-1.5 text-[#687086] hover:text-[#171A2B] hover:bg-[#F0F2F7] rounded-lg transition-colors"
                              title="Edit and Update Event"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => handleTogglePublish(evt, e)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                evt.is_published
                                  ? 'text-[#687086] border-[#E7E9F1] hover:bg-[#F0F2F7]'
                                  : 'text-[#16856B] bg-[#16856B]/10 border-[#16856B]/20 hover:bg-[#16856B]/20'
                              }`}
                              title={evt.is_published ? "Click to unpublish event from all sides" : "Click to publish event to all sides"}
                            >
                              {evt.is_published ? 'Unpublish' : 'Publish'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancelModalEvent(evt)}
                              className="p-1.5 text-[#687086] hover:text-[#D9485F] hover:bg-[#D9485F]/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* TABLE VIEW                                                   */
          /* ============================================================ */
          <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Event Details & Venue</th>
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Seating & Gate</th>
                    <th className="py-3.5 px-4">Pricing</th>
                    <th className="py-3.5 px-4">Budget</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">
                      {isOrganizer ? 'Organizer Controls' : 'Registrations & Details'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                  {filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      onClick={() => navigate(`/organizer/events/${evt.id}`)}
                      className="hover:bg-[#F7F8FC]/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#171A2B] group-hover:text-[#625BF6] transition-colors">
                          {evt.title}
                        </div>
                        <div className="text-[11px] text-[#687086] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#687086]" />
                          <span>{evt.venue}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#687086]">{evt.event_date}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{evt.booked_count || 0}</span>
                          <span className="text-[#687086] font-normal">/ {evt.capacity}</span>
                        </div>
                        <div className="text-[10px] text-[#16856B] font-semibold mt-0.5">
                          {evt.checked_in_count || 0} verified check-ins
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#16856B] font-bold">
                          {formatINR(evt.member_price_paise)}
                        </div>
                        <div className="text-[10px] text-[#687086]">
                          Guest: {formatINR(evt.non_member_price_paise)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#171A2B] font-semibold">
                        {formatINR(evt.estimated_budget_paise || 0)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            evt.is_published
                              ? 'bg-[#16856B]/10 text-[#16856B] border-[#16856B]/20'
                              : 'bg-[#E78020]/10 text-[#C46814] border-[#E78020]/30'
                          }`}
                        >
                          {evt.is_published
                            ? '● Published'
                            : '○ Unpublished'}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-4 text-right space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenRegistrationsModal(evt)}
                          className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="View Registrations"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Registrations</span>
                        </button>
                        <Link
                          to={`/organizer/events/${evt.id}`}
                          className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-[#EEEDFE] hover:bg-[#625BF6] text-[#625BF6] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </Link>

                        {/* Controls available ONLY to Organizer */}
                        {isOrganizer && (
                          <>
                            <Link
                              to={`/organizer/events/${evt.id}/edit`}
                              className="p-1.5 text-[#687086] hover:text-[#625BF6] hover:bg-[#F0F2F7] rounded-lg inline-block align-middle transition-colors"
                              title="Edit and Update Event"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => handleTogglePublish(evt, e)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold border align-middle transition-colors cursor-pointer ${
                                evt.is_published
                                  ? 'text-[#687086] border-[#E7E9F1] hover:bg-[#F0F2F7]'
                                  : 'text-[#16856B] bg-[#16856B]/10 border-[#16856B]/20 hover:bg-[#16856B]/20'
                              }`}
                              title={evt.is_published ? "Click to unpublish event from all sides" : "Click to publish event to all sides"}
                            >
                              {evt.is_published ? 'Unpublish' : 'Publish'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancelModalEvent(evt)}
                              className="p-1.5 text-[#687086] hover:text-[#D9485F] hover:bg-[#D9485F]/10 rounded-lg inline-block align-middle transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal (Organizer only) */}
        {isOrganizer && cancelModalEvent && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-[#D9485F]/10 text-[#D9485F] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171A2B]">
                  Delete Event: {cancelModalEvent.title}?
                </h3>
                <p className="text-xs text-[#687086] mt-1 leading-relaxed">
                  This action will permanently delete this event from the system and revoke
                  ticket slots. This cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalEvent(null)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#687086] hover:bg-[#F7F8FC] border border-[#E7E9F1]"
                >
                  Keep Event
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#D9485F] hover:bg-[#C23C51] text-white flex items-center gap-1.5"
                >
                  {cancelling ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Event</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Specific Event Registration Roster Modal */}
        {activeRegEventModal && (
          <div className="fixed inset-0 z-50 bg-[#17182B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E7E9F1] overflow-hidden animate-in fade-in">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-[#E7E9F1] flex items-start justify-between gap-4 bg-gradient-to-r from-white to-[#F7F8FC]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#625BF6]/10 text-[#625BF6] uppercase">
                      Attendee Roster
                    </span>
                    <span className="text-xs text-[#8B93A7]">•</span>
                    <span className="text-xs font-semibold text-[#8B93A7]">
                      {activeRegEventModal.event_date}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#171A2B]">
                    {activeRegEventModal.title}
                  </h3>
                  <div className="text-xs text-[#687086] flex items-center gap-2">
                    <span>Venue: {activeRegEventModal.venue}</span>
                    <span>•</span>
                    <span>Capacity: {activeRegEventModal.capacity}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveRegEventModal(null);
                    setRegModalData(null);
                  }}
                  className="p-2 rounded-xl text-[#8B93A7] hover:text-[#171A2B] hover:bg-[#F0F2F7] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {loadingRegModal ? (
                  <div className="p-8">
                    <LoadingSkeleton lines={5} />
                  </div>
                ) : !regModalData ? (
                  <div className="py-12 text-center text-xs text-[#687086]">
                    Failed to load registration data.
                  </div>
                ) : (
                  <>
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#F7F8FC] border border-[#E7E9F1]">
                        <span className="text-[10px] font-semibold text-[#8B93A7] uppercase">
                          Total Passes
                        </span>
                        <div className="text-xl font-black text-[#171A2B] mt-0.5">
                          {regModalData.total_tickets}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] font-semibold text-emerald-800 uppercase flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                          <span>Members</span>
                        </span>
                        <div className="text-xl font-black text-emerald-950 mt-0.5">
                          {regModalData.member_count}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium">
                          {formatINR(regModalData.member_revenue_paise || 0)}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
                        <span className="text-[10px] font-semibold text-indigo-800 uppercase flex items-center gap-1">
                          <Users className="w-3 h-3 text-indigo-700" />
                          <span>Non-Members</span>
                        </span>
                        <div className="text-xl font-black text-indigo-950 mt-0.5">
                          {regModalData.non_member_count}
                        </div>
                        <div className="text-[10px] text-indigo-700 font-medium">
                          {formatINR(regModalData.non_member_revenue_paise || 0)}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-[#E7E9F1]">
                        <span className="text-[10px] font-semibold text-[#8B93A7] uppercase">
                          Total Revenue
                        </span>
                        <div className="text-xl font-black text-[#16856B] mt-0.5">
                          {formatINR(regModalData.total_revenue_paise || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-1 bg-[#F7F8FC] p-1 rounded-xl border border-[#E7E9F1] text-xs">
                        {[
                          { key: 'all', label: `All (${regModalData.registrations?.length || 0})` },
                          { key: 'member', label: `Members Only (${regModalData.member_count || 0})` },
                          { key: 'non_member', label: `Non-Members (${regModalData.non_member_count || 0})` }
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setRegRosterFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                              regRosterFilter === tab.key
                                ? 'bg-[#171A2B] text-white shadow-2xs'
                                : 'text-[#687086] hover:text-[#171A2B]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Registrations Table */}
                    <div className="border border-[#E7E9F1] rounded-2xl overflow-hidden shadow-2xs">
                      {(() => {
                        const list = (regModalData.registrations || []).filter((r) => {
                          if (regRosterFilter === 'member') return r.is_member;
                          if (regRosterFilter === 'non_member') return !r.is_member;
                          return true;
                        });

                        if (list.length === 0) {
                          return (
                            <div className="py-12 text-center text-xs text-[#8B93A7]">
                              No attendee registrations found under this filter.
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                                <tr>
                                  <th className="py-3 px-4">Attendee</th>
                                  <th className="py-3 px-4">Registration Type</th>
                                  <th className="py-3 px-4">Role Track</th>
                                  <th className="py-3 px-4">Qty</th>
                                  <th className="py-3 px-4">Amount</th>
                                  <th className="py-3 px-4">Check-in</th>
                                  <th className="py-3 px-4">Booked At</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                                {list.map((r) => (
                                  <tr key={r.id} className="hover:bg-[#F7F8FC]/50">
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-[#171A2B]">{r.user_name}</div>
                                      <div className="text-[11px] text-[#687086]">{r.user_email}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          r.is_member
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                        }`}
                                      >
                                        {r.is_member ? '★ Active Member' : 'Public Guest'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 capitalize text-[#687086]">
                                      {r.role_track || 'Participant'}
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold">
                                      {r.quantity}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-[#16856B]">
                                      {formatINR(r.total_amount_paise || 0)}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          r.checked_in
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {r.checked_in ? 'Verified In' : 'Pending Entry'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-[#8B93A7] text-[11px]">
                                      {r.created_at ? r.created_at.slice(0, 10) : 'Recent'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#E7E9F1] bg-[#F7F8FC] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRegEventModal(null);
                    setRegModalData(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#171A2B] text-white hover:bg-[#252844] transition-colors"
                >
                  Close Roster
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventsManagementPage;
