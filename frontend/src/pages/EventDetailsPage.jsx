import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  Coins,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit2,
  QrCode,
  Kanban,
  ShieldAlert,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Tag,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { api, formatINR } from '../api/client';

export const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal for cancel confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);


  // Status toggle state
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [evtData, readinessData, tasksData] = await Promise.all([
        api.get(`/api/events/${id}`),
        api.get(`/api/readiness/events/${id}`).catch(() => null),
        api.get(`/api/tasks?event_id=${id}`).catch(async () => {
          // Fallback to fetch all tasks and filter
          const allTasks = await api.get('/api/tasks').catch(() => []);
          return (allTasks || []).filter((t) => t.event_id === id);
        })
      ]);

      setEvent(evtData);
      setReadiness(readinessData);
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Failed to load event details:', err);
      setError('Event not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const handleTogglePublication = async () => {
    if (!event) return;
    try {
      setTogglingStatus(true);
      const updated = await api.patch(`/api/events/${id}`, {
        is_published: !event.is_published
      });
      setEvent(updated);
    } catch (err) {
      console.error('Failed to toggle publication:', err);
      alert('Could not update publication status: ' + err.message);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleCancelEvent = async () => {
    try {
      setCancelling(true);
      await api.delete(`/api/events/${id}`);
      navigate('/organizer/events');
    } catch (err) {
      console.error('Failed to cancel event:', err);
      alert('Failed to cancel event: ' + err.message);
      setCancelling(false);
      setCancelModalOpen(false);
    }
  };


  if (loading) {
    return (
      <DashboardLayout pageTitle="Event Details">
        <div className="p-12 text-center max-w-4xl mx-auto">
          <Loader2 className="w-8 h-8 animate-spin text-[#625BF6] mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#687086]">Loading event operational data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !event) {
    return (
      <DashboardLayout pageTitle="Event Not Found">
        <div className="p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#D9485F]/10 text-[#D9485F] flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#171A2B]">{error || 'Event Not Found'}</h2>
          <p className="text-xs text-[#687086] mt-1 mb-4">
            The event may have been cancelled or the link is invalid.
          </p>
          <Link
            to="/organizer/events"
            className="px-4 py-2 bg-[#625BF6] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Events</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const capacity = event.capacity || 1;
  const booked = event.booked_count || 0;
  const verifiedCheckins = event.checked_in_count || 0;
  const bookedPercent = Math.min(100, Math.round((booked / capacity) * 100));
  const checkinPercent = booked > 0 ? Math.min(100, Math.round((verifiedCheckins / booked) * 100)) : 0;
  const readinessScore = readiness?.overall_readiness_score ?? 85;

  return (
    <DashboardLayout
      pageTitle={event.title}
      breadcrumbs={[
        { label: 'Organizer', link: '/organizer/overview' },
        { label: 'Events & Tickets', link: '/organizer/events' },
        { label: event.title }
      ]}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E9F1]">
          <div>
            <Link
              to="/organizer/events"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687086] hover:text-[#625BF6] mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Events & Tickets</span>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#171A2B] tracking-tight">
                {event.title}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  event.is_published
                    ? 'bg-[#16856B]/10 text-[#16856B] border-[#16856B]/30'
                    : 'bg-[#E78020]/10 text-[#C46814] border-[#E78020]/30'
                }`}
              >
                {event.is_published
                  ? '● Published (Visible to Students, Admin & Treasurer)'
                  : '○ Unpublished (Hidden from Students, Admin & Treasurer)'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#687086] mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#625BF6]" />
                <span className="font-medium text-[#171A2B]">{event.venue}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#625BF6]" />
                <span>Starts: {event.event_date}</span>
              </div>
              {event.end_date && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#625BF6]" />
                  <span>Ends: {event.end_date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Organizer Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">

            <Link
              to="/organizer/scanner"
              className="px-3.5 py-2 bg-[#17182B] hover:bg-[#23253E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Launch QR scanner to verify attendee tickets at venue gate"
            >
              <QrCode className="w-3.5 h-3.5 text-[#625BF6]" />
              <span>Gate Scanner</span>
            </Link>

            <Link
              to={`/organizer/events/${id}/edit`}
              className="px-3.5 py-2 bg-white hover:bg-[#F7F8FC] text-[#171A2B] border border-[#E7E9F1] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#687086]" />
              <span>Edit Event</span>
            </Link>

            <button
              onClick={handleTogglePublication}
              disabled={togglingStatus}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                event.is_published
                  ? 'bg-white text-[#D9485F] border-[#D9485F]/30 hover:bg-[#D9485F]/5'
                  : 'bg-[#16856B] text-white border-[#16856B] hover:bg-[#13745E]'
              }`}
            >
              {event.is_published ? 'Unpublish' : 'Publish'}
            </button>

            <button
              onClick={() => setCancelModalOpen(true)}
              className="p-2 text-[#687086] hover:text-[#D9485F] hover:bg-[#D9485F]/10 rounded-xl transition-colors"
              title="Cancel Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>


        {/* Hero Banner (with Fallback) */}
        <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-[#E7E9F1] relative bg-linear-to-r from-[#17182B] to-[#2B2E4E]">
          <img
            src={
              event.banner_url ||
              'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
            }
            alt={event.title}
            className="w-full h-full object-cover opacity-85"
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17182B] via-transparent to-transparent flex items-end p-6">
            <div className="flex flex-wrap gap-1.5">
              {(event.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#17182B]/80 backdrop-blur-md text-white border border-white/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Operational Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Seating Capacity & Bookings */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#687086]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Capacity & Bookings
              </span>
              <Users className="w-4 h-4 text-[#625BF6]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#171A2B]">
                {booked}{' '}
                <span className="text-xs font-normal text-[#687086]">/ {capacity} seats</span>
              </div>
              <div className="text-[11px] text-[#687086] mt-0.5">
                {capacity - booked > 0 ? `${capacity - booked} seats remaining` : 'Seating at capacity'}
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#F0F2F7] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#625BF6] h-full rounded-full transition-all duration-500"
                style={{ width: `${bookedPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-[#687086]">
              <span>Atomic reservation</span>
              <span>{bookedPercent}% Filled</span>
            </div>
          </div>

          {/* Card 2: Verified Gate Check-ins */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#687086]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Verified Gate Check-ins
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#16856B]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#171A2B]">
                {verifiedCheckins}{' '}
                <span className="text-xs font-normal text-[#687086]">
                  / {booked} booked
                </span>
              </div>
              <div className="text-[11px] text-[#16856B] font-semibold mt-0.5">
                {checkinPercent}% Attendance Turnout
              </div>
            </div>
            <div className="w-full bg-[#F0F2F7] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#16856B] h-full rounded-full transition-all duration-500"
                style={{ width: `${checkinPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-[#687086]">
              <span>Cryptographic QR validation</span>
              <Link to="/organizer/scanner" className="text-[#625BF6] hover:underline">
                Open Scanner →
              </Link>
            </div>
          </div>

          {/* Card 3: Ticket Pricing */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#687086]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Ticket Pricing
              </span>
              <Ticket className="w-4 h-4 text-[#C27803]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#687086]">Member:</span>
                <span className="text-sm font-bold text-[#16856B]">
                  {formatINR(event.member_price_paise)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#687086]">Non-Member:</span>
                <span className="text-sm font-bold text-[#171A2B]">
                  {formatINR(event.non_member_price_paise)}
                </span>
              </div>
            </div>
            <div className="pt-1 border-t border-[#F0F2F7] flex justify-between text-[10px] font-semibold text-[#687086]">
              <span>Financial standard</span>
              <span>Integer paise stored</span>
            </div>
          </div>

          {/* Card 4: Budget & Volunteer Slots */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#687086]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Budget & Volunteers
              </span>
              <Coins className="w-4 h-4 text-[#625BF6]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#687086]">Event Budget:</span>
                <span className="text-sm font-bold text-[#171A2B]">
                  {formatINR(event.estimated_budget_paise || 0)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#687086]">Target Volunteers:</span>
                <span className="text-sm font-bold text-[#625BF6]">
                  {event.required_volunteer_count ?? 5} Slots
                </span>
              </div>
            </div>
            <div className="pt-1 border-t border-[#F0F2F7] flex justify-between text-[10px] font-semibold text-[#687086]">
              <span>Logistics status</span>
              <Link to="/organizer/budgets" className="text-[#625BF6] hover:underline">
                View Ledger →
              </Link>
            </div>
          </div>
        </div>

        {/* Section: Operational Readiness Engine & Unresolved Risks */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0F2F7]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#625BF6]" />
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                Event Readiness & Operational Audit
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#687086]">Audit Score:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  readinessScore >= 80
                    ? 'bg-[#16856B]/10 text-[#16856B]'
                    : readinessScore >= 60
                    ? 'bg-[#C27803]/10 text-[#C27803]'
                    : 'bg-[#D9485F]/10 text-[#D9485F]'
                }`}
              >
                {readinessScore} / 100
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                Ticketing & Seating
              </div>
              <div className="text-xs font-bold text-[#171A2B]">
                {booked >= capacity
                  ? 'Capacity Limit Reached'
                  : `${capacity - booked} tickets remaining on public feed`}
              </div>
              <p className="text-[11px] text-[#687086]">
                Real-time gate concurrency lock active to prevent oversubscription.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                Top Risk / Blocker
              </div>
              <div className="text-xs font-bold text-[#171A2B]">
                {readiness?.top_blocker || 'Volunteer staffing verification in progress'}
              </div>
              <p className="text-[11px] text-[#687086]">
                Target: {event.required_volunteer_count ?? 5} volunteers for gate, booth & tech support.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                Remediation Action
              </div>
              <div className="text-xs font-bold text-[#625BF6]">
                Assign volunteer squad in Task Board
              </div>
              <Link
                to="/organizer/tasks"
                className="text-[11px] text-[#625BF6] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Navigate to Kanban Task Board</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Section: Event Description & Schedule Details */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F7]">
            <Sparkles className="w-4 h-4 text-[#625BF6]" />
            <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
              Event Description & Logistical Brief
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#171A2B] leading-relaxed whitespace-pre-line">
            {event.description || 'No detailed briefing added for this event.'}
          </p>
        </div>

        {/* Section: Associated Sprint Tasks */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F7]">
            <div className="flex items-center gap-2">
              <Kanban className="w-4 h-4 text-[#625BF6]" />
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                Associated Operations Tasks ({tasks.length})
              </h2>
            </div>
            <Link
              to="/organizer/tasks"
              className="text-xs font-semibold text-[#625BF6] hover:underline flex items-center gap-1"
            >
              <span>Manage on Task Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#687086]">
              <p>No operational tasks specifically tagged for this event.</p>
              <Link
                to="/organizer/tasks"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#625BF6] hover:underline"
              >
                + Create Task in Task Board
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F2F7]">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#171A2B]">{task.title}</span>
                    <p className="text-[11px] text-[#687086]">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7F8FC] border border-[#E7E9F1] text-[#687086] capitalize">
                      {task.status?.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'urgent'
                          ? 'bg-[#D9485F]/10 text-[#D9485F]'
                          : task.priority === 'high'
                          ? 'bg-[#C27803]/10 text-[#C27803]'
                          : 'bg-[#625BF6]/10 text-[#625BF6]'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Confirmation Modal for Event Cancellation */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-[#D9485F]/10 text-[#D9485F] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171A2B]">Cancel Event: {event.title}?</h3>
                <p className="text-xs text-[#687086] mt-1 leading-relaxed">
                  This will remove the event from the calendar and revoke ticket reservations. This
                  action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#687086] hover:bg-[#F7F8FC] border border-[#E7E9F1]"
                >
                  Keep Event
                </button>
                <button
                  type="button"
                  onClick={handleCancelEvent}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#D9485F] hover:bg-[#C23C51] text-white flex items-center gap-1.5"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventDetailsPage;
