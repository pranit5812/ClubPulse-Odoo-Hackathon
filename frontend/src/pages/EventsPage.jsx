import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Sparkles, 
  ArrowRight,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Ticket
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { EventBookingModal } from '../components/EventBookingModal';
import { EmptyState } from '../components/EmptyState';
import { PassQRModal } from '../components/PassQRModal';

export const EventsPage = () => {
  const { user, isMember, role, loading: authLoading, refreshUser } = useAuth();
  const isStaff = ['organizer', 'admin', 'treasurer'].includes(role);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Volunteer state
  const [myVolunteerRequests, setMyVolunteerRequests] = useState([]);
  const [volunteeringEventId, setVolunteeringEventId] = useState(null);
  const [volunteerMsg, setVolunteerMsg] = useState('');
  const [volunteerError, setVolunteerError] = useState('');

  // Student tickets state to check enrollment
  const [myTickets, setMyTickets] = useState([]);
  const [activePassTicket, setActivePassTicket] = useState(null);

  const fetchEvents = async () => {
    try {
      const data = await api.get('/api/events');
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyVolunteerRequests = async () => {
    if (!user) return;
    try {
      const data = await api.get('/api/events/my-volunteer-applications');
      setMyVolunteerRequests(data || []);
    } catch (err) {
      console.error('Failed to load volunteer requests:', err);
    }
  };

  const fetchMyTickets = async () => {
    if (!user) return;
    try {
      const data = await api.get('/api/tickets/my-tickets');
      setMyTickets(data || []);
    } catch (err) {
      console.error('Failed to load my tickets:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchMyVolunteerRequests();
    fetchMyTickets();
  }, [user]);

  const handleOptToVolunteer = async (evt) => {
    if (!user) {
      return;
    }
    setVolunteeringEventId(evt.id);
    setVolunteerMsg('');
    setVolunteerError('');
    try {
      const res = await api.post(`/api/events/${evt.id}/opt-to-volunteer`);
      setVolunteerMsg(res.message || `Request to volunteer for ${evt.title} sent to Admin!`);
      await fetchMyVolunteerRequests();
      if (refreshUser) await refreshUser();
    } catch (err) {
      setVolunteerError(err.message || 'Could not submit volunteer application.');
    } finally {
      setVolunteeringEventId(null);
    }
  };

  const tagsList = ['All', 'Hackathon', 'Workshop', 'AI', 'Coding', 'Gala', 'Prizes'];

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || '').toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'All' || (e.tags && e.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  if (!authLoading && ['organizer', 'admin', 'treasurer'].includes(role)) {
    return <Navigate to="/organizer/events" replace />;
  }

  const pageContent = (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chapter Calendar & Passes 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171A2B]">
            Events & Tickets
          </h1>
          <p className="text-xs sm:text-sm text-[#687086] mt-1 max-w-xl">
            Register for hackathons, technical masterclasses, and networking banquets. 
            Active members automatically unlock 50% discount and exclusive pass access.
          </p>
        </div>

        {/* Search Box */}
        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search event, topic, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-white text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6] shadow-2xs"
          />
        </div>
      </div>

      {/* Non-member benefit banner */}
      {!isMember && !isStaff && (
        <div className="p-3.5 bg-gradient-to-r from-[#625BF6]/10 to-indigo-50 border border-[#625BF6]/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#171A2B] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#625BF6] shrink-0" />
            <span>
              <strong>Chapter Members</strong> get free access to exclusive member workshops and 50% discount on hackathons.
            </span>
          </div>
          <Link
            to="/membership"
            className="inline-flex items-center gap-1 font-bold text-[#625BF6] hover:text-[#5048E5] transition-colors shrink-0"
          >
            <span>Activate Membership</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* EVENTS CATALOG: Browse & Reserve Upcoming Events */}
      <div className="space-y-4">
      {/* Volunteer Application Feedback Alerts */}
      {volunteerMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{volunteerMsg}</span>
          </div>
          <button onClick={() => setVolunteerMsg('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {volunteerError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{volunteerError}</span>
          </div>
          <button onClick={() => setVolunteerError('')} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tagsList.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTag === tag
                  ? 'bg-[#625BF6] text-white shadow-2xs'
                  : 'bg-white text-[#687086] hover:text-[#171A2B] border border-[#E7E9F1]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-[#E7E9F1]" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-[#E7E9F1]">
            <EmptyState
              icon={Calendar}
              title="No events match your criteria"
              description="Try adjusting your search terms or filter category to discover upcoming gatherings."
              action={
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedTag('All');
                  }}
                  className="px-4 py-2 bg-[#625BF6] text-white rounded-xl text-xs font-semibold hover:bg-[#5048E5] transition-colors"
                >
                  Clear Filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => {
              const capacity = evt.capacity || 100;
              const booked = evt.booked_count || 0;
              const fillPercentage = Math.min(100, Math.round((booked / capacity) * 100));
              const isFull = booked >= capacity;

              const userTicket = myTickets.find((t) => t.event_id === evt.id && t.status !== 'cancelled');
              const isEnrolled = !!userTicket;

              const volReq = myVolunteerRequests.find((r) => r.event_id === evt.id);
              const isVolunteerApproved = volReq?.status === 'approved';
              const isVolunteerPending = volReq?.status === 'pending';

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs hover:shadow-md hover:border-[#625BF6]/40 transition-all flex flex-col overflow-hidden group"
                >
                  {/* Banner */}
                  <div className="h-44 w-full bg-[#F7F8FC] relative overflow-hidden">
                    <img
                      src={evt.banner_url || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80'}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {isEnrolled ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#16856B] text-white shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Enrolled
                        </span>
                      ) : isVolunteerApproved ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                          🤝 Approved Volunteer
                        </span>
                      ) : isVolunteerPending ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                          ⏳ Pending Approval
                        </span>
                      ) : evt.is_ended || evt.status === 'ended' ? (
                        <Badge variant="neutral">Concluded</Badge>
                      ) : isFull ? (
                        <Badge variant="critical">Sold Out</Badge>
                      ) : !evt.is_published ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-600 text-white shadow-xs">
                          🚀 Coming Soon
                        </span>
                      ) : (
                        <Badge variant="active">{capacity - booked} Seats Left</Badge>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {evt.tags?.map((t) => (
                          <span key={t} className="text-[10px] font-semibold text-[#687086] bg-[#F7F8FC] border border-[#E7E9F1] px-2 py-0.5 rounded-md">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <h3 className="font-bold text-base text-[#171A2B] group-hover:text-[#625BF6] transition-colors line-clamp-1">
                        {evt.title}
                      </h3>

                      <p className="text-xs text-[#687086] line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="pt-2 text-xs text-[#687086] space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#625BF6]" />
                          <span>{evt.event_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#625BF6]" />
                          <span>{evt.venue}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capacity & Price Bottom */}
                    <div className="pt-3 border-t border-[#E7E9F1] space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-[#687086] mb-1">
                          <span>Capacity status</span>
                          <span>{booked} / {capacity} ({fillPercentage}%)</span>
                        </div>
                        <div className="w-full bg-[#F7F8FC] border border-[#E7E9F1] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fillPercentage >= 90 ? 'bg-[#D98A18]' : 'bg-[#16856B]'
                            }`}
                            style={{ width: `${fillPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-medium text-[#687086]">
                            {isMember ? 'Ticket Price (Member)' : 'Ticket Price (Non-Member)'}
                          </div>
                          <div className="text-xs font-bold text-[#171A2B]">
                            {isMember ? (
                              evt.member_price_paise === 0 ? (
                                <span className="text-[#16856B] font-bold">Free (Member Privilege)</span>
                              ) : (
                                <span>{formatINR(evt.member_price_paise)}</span>
                              )
                            ) : (
                              <span>{formatINR(evt.non_member_price_paise)}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#687086]">
                            {isMember ? (
                              <span>Non-Member: {formatINR(evt.non_member_price_paise)}</span>
                            ) : (
                              <span>Member: {evt.member_price_paise === 0 ? 'Free' : formatINR(evt.member_price_paise)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isEnrolled ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Enrolled
                              </span>
                              <button
                                type="button"
                                onClick={() => setActivePassTicket(userTicket)}
                                className="px-3 py-1.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="View your confirmed QR Pass with profile data"
                              >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>View Pass</span>
                              </button>
                            </div>
                          ) : isVolunteerApproved ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Volunteering (Pass Closed)
                              </span>
                              <Link
                                to="/expenses"
                                className="px-3 py-1.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1"
                                title="Submit event expenses for reimbursement"
                              >
                                <span>Reimbursements</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          ) : isVolunteerPending ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Volunteer Pending
                              </span>
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-[11px] font-semibold cursor-not-allowed"
                                title="Registration disabled while volunteer application is pending"
                              >
                                Register Pass
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOptToVolunteer(evt)}
                                disabled={volunteeringEventId === evt.id}
                                className="px-3 py-2 bg-[#EEEDFE] hover:bg-[#625BF6] text-[#625BF6] hover:text-white border border-[#D4D1FD] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Opt to volunteer for this event and submit to Admin for approval"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{volunteeringEventId === evt.id ? 'Sending...' : 'Opt to Volunteer'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedEvent(evt)}
                                disabled={isFull || evt.is_ended || evt.status === 'ended'}
                                className="px-3.5 py-2 bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                              >
                                {evt.is_ended || evt.status === 'ended' ? 'Concluded' : isFull ? 'Sold Out' : 'Register Pass'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal (with Razorpay checkout flow) */}
      {selectedEvent && (
        <EventBookingModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onBookSuccess={() => {
            fetchEvents();
            fetchMyTickets();
          }}
        />
      )}

      {/* QR Pass & Enrolled Profile Credentials Modal */}
      <PassQRModal
        ticket={activePassTicket}
        user={user}
        isOpen={Boolean(activePassTicket)}
        onClose={() => setActivePassTicket(null)}
      />
    </div>
  );

  if (user) {
    return (
      <DashboardLayout
        pageTitle="Events & Tickets"
        breadcrumbs={[{ label: 'Dashboard', link: '/dashboard' }, { label: 'Events & Tickets' }]}
      >
        {pageContent}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 flex-1">
        {pageContent}
      </main>
    </div>
  );
};

export default EventsPage;
