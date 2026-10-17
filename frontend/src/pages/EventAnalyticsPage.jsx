import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  BarChart3,
  PieChart as PieIcon,
  Ticket,
  Users,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  TrendingUp,
  Coins,
  Shield,
  SlidersHorizontal,
  Receipt,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Clock,
  Layers,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  QrCode,
  UserCheck,
  Check,
  Search
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const EventAnalyticsPage = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allEventsSummary, setAllEventsSummary] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'occupancy' | 'volunteers' | 'roster'

  // Fetch all events on load
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const evList = await api.get('/api/events');
        setEvents(evList || []);
        if (evList && evList.length > 0) {
          setSelectedEventId(evList[0].id);
        }

        // Fetch comparative summaries
        try {
          const sumData = await api.get('/api/tickets/events-summary');
          setAllEventsSummary(sumData || []);
        } catch (e) {
          console.warn('Could not load events-summary:', e);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Fetch analytics for selected event
  const fetchEventAnalytics = async (eventId) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await api.get(`/api/events/${eventId}/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch event analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchEventAnalytics(selectedEventId);
    }
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Recharts Donut Data: Member vs Non-Member Tickets
  const ticketDonutData = useMemo(() => {
    if (!analytics || !analytics.ticket_sales) return [];
    const ts = analytics.ticket_sales;
    const mem = ts.member_tickets || 0;
    const non = ts.non_member_tickets || 0;
    if (mem === 0 && non === 0) {
      return [{ name: 'No Tickets Sold', value: 1, color: '#E2E8F0' }];
    }
    return [
      { name: 'Member Tickets', value: mem, color: '#625BF6', revenue: ts.member_revenue_paise / 100 },
      { name: 'Guest / Non-Member', value: non, color: '#A855F7', revenue: ts.non_member_revenue_paise / 100 }
    ];
  }, [analytics]);

  // Recharts Bar Data: Revenue Comparison
  const revenueBarData = useMemo(() => {
    if (!analytics || !analytics.ticket_sales) return [];
    const ts = analytics.ticket_sales;
    return [
      {
        category: 'Member Revenue',
        amount: Math.round(ts.member_revenue_paise / 100),
        color: '#625BF6'
      },
      {
        category: 'Guest Revenue',
        amount: Math.round(ts.non_member_revenue_paise / 100),
        color: '#A855F7'
      },
      {
        category: 'Total Revenue',
        amount: Math.round(ts.total_revenue_paise / 100),
        color: '#10B981'
      }
    ];
  }, [analytics]);

  // Department Distribution Data
  const departmentData = useMemo(() => {
    if (!analytics || !analytics.volunteers || !analytics.volunteers.department_breakdown) return [];
    return Object.entries(analytics.volunteers.department_breakdown).map(([dept, count]) => ({
      department: dept,
      count: count
    }));
  }, [analytics]);

  return (
    <DashboardLayout
      pageTitle="Event Intelligence & Analytics"
      breadcrumbs={[{ label: 'Treasury' }, { label: 'Event Analytics' }]}
    >
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        
        {/* ================================================================ */}
        {/* TOP HEADER & INTERLINKED ACTION SHORTCUTS                        */}
        {/* ================================================================ */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#625BF6]/10 text-[#625BF6] border border-[#625BF6]/20">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-[#171A2B] tracking-tight">
                  Event Intelligence & Real-Time Visualizer
                </h1>
                <p className="text-xs text-[#687086]">
                  Live attendance tracking, Member vs Guest ticket sales breakdown, and volunteer deployment
                </p>
              </div>
            </div>
          </div>

          {/* Smooth Interlink Buttons to other pages */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <Link
              to="/simulator"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#625BF6] bg-[#625BF6]/10 hover:bg-[#625BF6]/20 transition-all border border-[#625BF6]/20 shadow-2xs"
              title="Test turnout and category expenses in Live Simulator"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Live Simulator</span>
            </Link>

            <Link
              to="/ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#171A2B] bg-[#F7F8FC] hover:bg-[#E7E9F1] transition-all border border-[#E7E9F1] shadow-2xs"
              title="Inspect treasury ledger"
            >
              <Receipt className="w-3.5 h-3.5 text-[#625BF6]" />
              <span>Treasury Ledger</span>
            </Link>

            <button
              onClick={() => fetchEventAnalytics(selectedEventId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#687086] hover:text-[#171A2B] bg-[#F7F8FC] hover:bg-[#E7E9F1] transition-all border border-[#E7E9F1]"
              title="Refresh live metrics"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* EVENT SELECTOR & LIVE EVENT SNAPSHOT BAR                         */}
        {/* ================================================================ */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] p-4.5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#625BF6]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#171A2B]">
                Active Target Event:
              </label>
            </div>

            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:w-96 bg-[#F7F8FC] border border-[#E7E9F1] rounded-xl px-3.5 py-2 text-xs font-bold text-[#171A2B] focus:ring-2 focus:ring-[#625BF6]/30 focus:border-[#625BF6] transition-all"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} (Cap: {ev.capacity || 100} • ₹{((ev.member_price_paise || 0) / 100)} / ₹{((ev.non_member_price_paise || 0) / 100)})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && analytics && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#F3F4F8] text-xs">
              <span className="font-semibold text-[#171A2B] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#687086]" />
                {analytics.venue || 'Campus Main Hall'}
              </span>
              <span className="text-[#687086]">•</span>
              <span className="text-[#687086]">
                Date: <strong>{new Date(analytics.date || selectedEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              </span>
              <span className="text-[#687086]">•</span>
              <span className="text-[#687086]">
                Prices: Member <strong className="text-[#625BF6]">₹{(analytics.ticket_sales.member_price_paise / 100)}</strong> | Guest <strong className="text-purple-600">₹{(analytics.ticket_sales.non_member_price_paise / 100)}</strong>
              </span>
              <span className="text-[#687086]">•</span>
              <span className="text-[#687086]">
                Budget: <strong>₹{(analytics.budget_paise / 100).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* TOP 3 CORE KPI SUMMARY CARDS                                     */}
        {/* ================================================================ */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Ticket Sales & Revenue */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#687086]">
                <span className="uppercase tracking-wider">Ticket Sales</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-[#625BF6]">
                  <Ticket className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#171A2B] font-mono">
                  {analytics.ticket_sales.total_tickets}{' '}
                  <span className="text-xs font-bold text-[#687086] font-sans">
                    tickets sold
                  </span>
                </div>
                <div className="text-sm font-bold text-emerald-600 font-mono mt-1">
                  ₹{(analytics.ticket_sales.total_revenue_paise / 100).toLocaleString('en-IN')}{' '}
                  <span className="text-[10px] text-[#687086] font-normal font-sans">
                    gross revenue
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#F3F4F8] flex items-center justify-between text-xs">
                <span className="text-[#625BF6] font-bold">
                  {analytics.ticket_sales.member_tickets} Members
                </span>
                <span className="text-purple-600 font-bold">
                  {analytics.ticket_sales.non_member_tickets} Guests
                </span>
              </div>
            </div>

            {/* Card 2: Seats Occupied & Venue Capacity */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#687086]">
                <span className="uppercase tracking-wider">Seats Occupancy</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#171A2B] font-mono">
                  {analytics.booked_count}{' '}
                  <span className="text-xs font-normal text-[#687086] font-sans">
                    / {analytics.capacity} seats
                  </span>
                </div>
                <div className="text-sm font-bold text-[#625BF6] font-mono mt-1">
                  {analytics.occupancy_pct}%{' '}
                  <span className="text-[10px] text-[#687086] font-normal font-sans">
                    capacity booked ({analytics.remaining_seats} free)
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#E7E9F1] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#625BF6] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, analytics.occupancy_pct)}%` }}
                />
              </div>
            </div>

            {/* Card 3: Volunteers Assigned & Staffing Ratio */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#687086]">
                <span className="uppercase tracking-wider">Volunteer Staffing</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#171A2B] font-mono">
                  {analytics.volunteers.assigned_count}{' '}
                  <span className="text-xs font-normal text-[#687086] font-sans">
                    / {analytics.volunteers.required_count} assigned
                  </span>
                </div>
                <div className="text-sm font-bold text-emerald-600 font-mono mt-1">
                  {analytics.volunteers.coverage_pct}%{' '}
                  <span className="text-[10px] text-[#687086] font-normal font-sans">
                    staffing coverage
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#F3F4F8] flex items-center justify-between text-xs">
                <span className="text-[#687086]">
                  Ratio:{' '}
                  <strong className="text-[#171A2B]">
                    1 helper : {analytics.volunteers.ratio_attendees_per_volunteer} guests
                  </strong>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    analytics.volunteers.coverage_pct >= 100
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {analytics.volunteers.coverage_pct >= 100 ? 'Optimal' : 'Recruiting'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* ROW 2: TICKET SALES & REVENUE VISUALIZATIONS                     */}
        {/* ================================================================ */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Visualizer 1: Member vs Non-Member Ticket Distribution (Donut) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-[#625BF6]" />
                    Ticket Sales: Member vs Non-Member
                  </h3>
                  <p className="text-[11px] text-[#687086]">
                    Proportion of tickets purchased by club members vs guest students
                  </p>
                </div>
                <span className="text-xs font-bold text-[#625BF6] bg-[#625BF6]/10 px-2.5 py-1 rounded-lg">
                  {analytics.ticket_sales.total_tickets} Total
                </span>
              </div>

              {/* Recharts Pie Chart */}
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {ticketDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#17182B] text-white p-2.5 rounded-xl shadow-lg border border-[#2B2E4E] text-xs">
                              <div className="font-bold">{data.name}</div>
                              <div className="font-mono text-[#847BFA] text-sm font-extrabold mt-0.5">
                                {data.value} tickets
                              </div>
                              {data.revenue !== undefined && (
                                <div className="text-[10px] text-[#A6ACBE] mt-0.5">
                                  ₹{data.revenue.toLocaleString('en-IN')} revenue
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown Legend Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F3F4F8]">
                <div className="p-3 rounded-xl bg-[#625BF6]/5 border border-[#625BF6]/15 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#625BF6]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#625BF6]" />
                    <span>Member Tickets</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#171A2B] font-mono">
                    {analytics.ticket_sales.member_tickets}{' '}
                    <span className="text-xs font-normal text-[#687086]">
                      ({analytics.ticket_sales.member_share_pct}%)
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 font-mono block">
                    ₹{(analytics.ticket_sales.member_revenue_paise / 100).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span>Guest / Non-Member</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#171A2B] font-mono">
                    {analytics.ticket_sales.non_member_tickets}{' '}
                    <span className="text-xs font-normal text-[#687086]">
                      ({analytics.ticket_sales.non_member_share_pct}%)
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 font-mono block">
                    ₹{(analytics.ticket_sales.non_member_revenue_paise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Visualizer 2: Revenue Contribution Bar Chart */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    Ticket Revenue Streams (INR)
                  </h3>
                  <p className="text-[11px] text-[#687086]">
                    Financial breakdown generated from registered attendees
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  ₹{(analytics.ticket_sales.total_revenue_paise / 100).toLocaleString('en-IN')} Gross
                </span>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBarData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E9F1" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#687086' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#687086' }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#17182B] text-white p-2.5 rounded-xl shadow-lg border border-[#2B2E4E] text-xs">
                              <div className="font-bold">{data.category}</div>
                              <div className="font-mono text-emerald-400 text-sm font-extrabold mt-0.5">
                                ₹{data.amount.toLocaleString('en-IN')}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {revenueBarData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Metrics */}
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E7E9F1] flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[#687086] text-[10px] uppercase font-bold block">
                    Average Ticket Yield
                  </span>
                  <span className="font-extrabold text-[#171A2B] font-mono">
                    ₹{analytics.ticket_sales.total_tickets > 0 ? Math.round((analytics.ticket_sales.total_revenue_paise / 100) / analytics.ticket_sales.total_tickets) : 0} / attendee
                  </span>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[#687086] text-[10px] uppercase font-bold block">
                    Estimated Event Budget
                  </span>
                  <span className="font-extrabold text-amber-700 font-mono">
                    ₹{(analytics.budget_paise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* ROW 3: SEATS OCCUPIED & VOLUNTEERS DEPLOYED BREAKDOWN            */}
        {/* ================================================================ */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Seat Occupancy & Gate Check-in Status */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#625BF6]" />
                    Venue Seat Occupancy & Gate Check-Ins
                  </h3>
                  <p className="text-[11px] text-[#687086]">
                    Real-time check-in flow and seat allocation against {analytics.capacity} capacity
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  {analytics.remaining_seats} Free Seats
                </span>
              </div>

              {/* Stacked Capacity Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#171A2B]">
                  <span>Total Venue Capacity</span>
                  <span className="font-mono">{analytics.capacity} Seats</span>
                </div>

                <div className="w-full h-4 rounded-full bg-[#E7E9F1] overflow-hidden flex p-0.5">
                  <div
                    className="bg-[#625BF6] h-full rounded-l-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (analytics.ticket_sales.member_tickets / analytics.capacity) * 100)}%` }}
                    title={`Member Seats: ${analytics.ticket_sales.member_tickets}`}
                  />
                  <div
                    className="bg-purple-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (analytics.ticket_sales.non_member_tickets / analytics.capacity) * 100)}%` }}
                    title={`Guest Seats: ${analytics.ticket_sales.non_member_tickets}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#687086] pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#625BF6]" />
                    <span>Members ({analytics.ticket_sales.member_tickets})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Guests ({analytics.ticket_sales.non_member_tickets})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E7E9F1]" />
                    <span>Remaining ({analytics.remaining_seats})</span>
                  </span>
                </div>
              </div>

              {/* Gate Check-In Progress Box */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gate Check-In Verified</span>
                  </span>
                  <span className="font-mono text-emerald-800">
                    {analytics.checked_in_count} of {analytics.booked_count} ({analytics.check_in_rate_pct}%)
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, analytics.check_in_rate_pct)}%` }}
                  />
                </div>
                <p className="text-[10px] text-emerald-700">
                  {analytics.checked_in_count} attendees scanned through Fast Scanner QR gate lane.
                </p>
              </div>

            </div>

            {/* Right: Volunteer Staffing & Department Allocation */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Assigned Volunteers by Department
                  </h3>
                  <p className="text-[11px] text-[#687086]">
                    {analytics.volunteers.assigned_count} helpers deployed for operational coverage
                  </p>
                </div>
                <Link
                  to="/simulator"
                  className="text-xs font-bold text-[#625BF6] hover:underline flex items-center gap-1"
                >
                  <span>Request More</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Department Distribution Bars */}
              <div className="space-y-2.5">
                {departmentData.map((item) => {
                  const pct = analytics.volunteers.assigned_count > 0 ? Math.round((item.count / analytics.volunteers.assigned_count) * 100) : 0;
                  return (
                    <div key={item.department} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#171A2B]">{item.department}</span>
                        <span className="font-mono text-[#687086] text-[11px]">
                          {item.count} volunteers ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E7E9F1] rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Volunteer Roster Preview */}
              {analytics.volunteers.roster && analytics.volunteers.roster.length > 0 && (
                <div className="pt-2 border-t border-[#F3F4F8]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086] block mb-2">
                    Active Assigned Volunteer Roster
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analytics.volunteers.roster.slice(0, 6).map((vol) => (
                      <div
                        key={vol.id || vol.email}
                        className="p-2 rounded-xl border border-[#E7E9F1] bg-[#FAFAFC] flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="font-bold text-[#171A2B] truncate">{vol.name}</div>
                          <div className="text-[10px] text-[#687086] truncate">{vol.department}</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {vol.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* ROW 4: RECENT VERIFIED TICKET REGISTRATIONS LIST                 */}
        {/* ================================================================ */}
        {analytics && analytics.recent_registrations && analytics.recent_registrations.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-[#625BF6]" />
                  Recent Registered Attendees for {analytics.title}
                </h3>
                <p className="text-[11px] text-[#687086]">
                  Showing latest verified ticket transactions
                </p>
              </div>
              <span className="text-xs font-semibold text-[#687086]">
                {analytics.recent_registrations.length} recent records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E7E9F1] text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                    <th className="pb-2.5">Attendee</th>
                    <th className="pb-2.5">Membership</th>
                    <th className="pb-2.5">Seats</th>
                    <th className="pb-2.5">Amount Paid</th>
                    <th className="pb-2.5">Check-In</th>
                    <th className="pb-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F8]">
                  {analytics.recent_registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-[#F7F8FC] transition-colors">
                      <td className="py-2.5 font-bold text-[#171A2B]">
                        <div>{reg.user_name}</div>
                        <div className="text-[10px] text-[#687086] font-normal">{reg.user_email}</div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            reg.is_member
                              ? 'bg-indigo-50 text-[#625BF6] border border-indigo-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {reg.is_member ? 'Member' : 'Guest'}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold font-mono text-[#171A2B]">
                        {reg.quantity} seat{reg.quantity > 1 ? 's' : ''}
                      </td>
                      <td className="py-2.5 font-bold font-mono text-emerald-600">
                        ₹{(reg.amount_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            reg.checked_in
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-[#687086]'
                          }`}
                        >
                          {reg.checked_in ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Checked In</span>
                            </>
                          ) : (
                            <span>Registered</span>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#687086]">
                        {reg.created_at ? new Date(reg.created_at).toLocaleDateString('en-IN') : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default EventAnalyticsPage;
