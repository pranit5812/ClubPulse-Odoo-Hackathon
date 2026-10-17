import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../api/client';
import {
  Calendar,
  Ticket,
  Receipt,
  Users,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  QrCode,
  Bell,
  Box,
  AlertTriangle,
  CreditCard,
  CheckSquare,
  GraduationCap,
  Tag,
  ExternalLink,
  ChevronRight,
  X,
  SlidersHorizontal,
  Flame,
  Award,
  LayoutDashboard
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { RiskAlert } from '../components/RiskAlert';
import { AnnouncementSlider } from '../components/AnnouncementSlider';
import { EventBookingModal } from '../components/EventBookingModal';
import { PassQRModal } from '../components/PassQRModal';
import { buildTicketQRData } from '../utils/ticketQR';

export const StudentDashboard = () => {
  const { user, role, isMember, canVolunteer, isVolunteer, membershipRole } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [activeModalTicket, setActiveModalTicket] = useState(null);
  const [selectedBookingEvent, setSelectedBookingEvent] = useState(null);
  const [taskUpdatingId, setTaskUpdatingId] = useState(null);

  const isOrganizer = ['organizer', 'admin'].includes(role);
  const isTreasurer = ['treasurer', 'admin'].includes(role);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const promises = [
        api.get('/api/events').catch(() => []),
        api.get('/api/tickets/my-tickets').catch(() => []),
        api.get(`/api/tasks?assignee_id=${user?.id}`).catch(() => []),
        api.get('/api/announcements').catch(() => [])
      ];

      if (isOrganizer || isTreasurer) {
        promises.push(api.get('/api/risk/evaluate').catch(() => null));
        promises.push(api.get('/api/transactions/summary').catch(() => null));
        promises.push(api.get('/api/members').catch(() => []));
      }

      const results = await Promise.all(promises);
      setEvents(results[0] || []);
      setMyTickets(results[1] || []);
      setMyTasks(results[2] || []);
      setAnnouncements(results[3] || []);

      if (isOrganizer || isTreasurer) {
        setRiskData(results[4]);
        setFinancialSummary(results[5]);
        setAllMembers(results[6] || []);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboard();
  }, [user, role]);

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    setTaskUpdatingId(task.id);
    try {
      await api.patch(`/api/tasks/${task.id}`, { status: nextStatus });
      setMyTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (err) {
      console.error('Task update failed:', err);
    } finally {
      setTaskUpdatingId(null);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const upcomingEvents = events;
  const activeMembersCount = allMembers.filter((m) => m.status === 'active').length;
  const criticalRisks = riskData?.risk_items?.filter((r) => r.severity === 'CRITICAL') || [];
  const warningRisks = riskData?.risk_items?.filter((r) => r.severity === 'WARNING') || [];

  // Active (non-checked in) ticket for quick gate scan
  const activeTicket = myTickets.find((t) => !t.checked_in) || myTickets[0];

  return (
    <DashboardLayout
      pageTitle="Student Dashboard"
      breadcrumbs={[{ label: 'Student Dashboard' }]}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ---------------------------------------------------- */}
        {/* 0. Top Navigation Status                             */}
        {/* ---------------------------------------------------- */}
        <div className="flex items-center justify-end">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#687086]">
            <span>Skyline Campus Platform</span>
            <span>•</span>
            <span className="font-semibold text-[#171A2B]">Student Space</span>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 1. Student Identity & Welcome Header                */}
        {/* ---------------------------------------------------- */}
        <div className="relative rounded-2xl bg-gradient-to-r from-white via-white to-[#EEEDFE]/40 p-6 border border-[#E7E9F1] shadow-[0_1px_4px_rgba(23,26,43,0.04)] overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#625BF6] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#625BF6]/25 shrink-0">
                {user?.full_name?.[0] || 'S'}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#171A2B] tracking-tight">
                    {user?.full_name || 'Student Member'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#625BF6]/10 text-[#625BF6] border border-[#625BF6]/20">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>ID: {user?.roll_number || 'STU-001'}</span>
                  </span>
                  <StatusBadge variant={isOrganizer ? 'active' : isMember ? (isVolunteer ? 'accent' : 'active') : 'warning'}>
                    {isOrganizer
                      ? 'Event Organizer'
                      : isMember
                        ? isVolunteer
                          ? 'Active Volunteer Crew'
                          : 'Active Member • Participant'
                        : 'Standard Student (Non-Member)'}
                  </StatusBadge>
                </div>
                <p className="text-xs sm:text-sm text-[#687086]">
                  {isOrganizer
                    ? 'Oversee event execution, attendee capacity, team operations, and live gate scanning.'
                    : isMember
                      ? isVolunteer
                        ? 'Volunteer operational tasks assigned & Gate QR Scanner access enabled.'
                        : 'All exclusive chapter privileges, 50% hackathon discount codes, and passes active.'
                      : 'You can freely participate in campus events. Activate chapter membership to unlock 50% discounts.'}
                </p>
              </div>
            </div>

            {/* Quick Contextual Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isOrganizer ? (
                <Link
                  to="/organizer/overview"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-xs font-bold shadow-xs transition-all hover:shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Organizer Command Center</span>
                </Link>
              ) : isMember ? (
                <Link
                  to="/my-tickets"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-xs font-bold shadow-xs transition-all hover:shadow-md"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Show My QR Passes</span>
                </Link>
              ) : (
                <Link
                  to="/membership"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-xs font-bold shadow-xs transition-all hover:shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Unlock Member Perks</span>
                </Link>
              )}
              {(isVolunteer || isOrganizer || isTreasurer) && (
                <Link
                  to="/expenses"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F7F8FC] text-[#171A2B] text-xs font-semibold border border-[#E7E9F1] transition-colors"
                  title="Submit or track reimbursement claims"
                >
                  <Receipt className="w-4 h-4 text-[#687086]" />
                  <span className="hidden sm:inline">Claim Expense</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. Top Leadership Announcements Slider (React Slider) */}
        {/* ---------------------------------------------------- */}
        <AnnouncementSlider announcements={announcements} />

        {/* ---------------------------------------------------- */}
        {/* 3. Student Member Privileges Ribbon                  */}
        {/* ---------------------------------------------------- */}
        {!isOrganizer && (
          <div className="rounded-xl p-4 bg-[#F7F8FD] border border-[#E1E4F5] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center font-bold shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-[#171A2B]">Student Organization Benefits: </span>
                <span className="text-[#687086]">
                  {isMember
                    ? '50% Flat Off Passes • Early Merch Drop • Priority Workshop RSVPs • AGM Voting Right'
                    : 'Upgrade to verified membership to enjoy 50% ticket waivers and exclusive club kits.'}
                </span>
              </div>
            </div>
            <Link
              to="/membership"
              className="inline-flex items-center gap-1.5 font-bold text-[#625BF6] hover:text-[#5048E5] shrink-0"
            >
              <span>{isMember ? 'Manage Membership' : 'Join for ₹500/yr'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 4. KPI Metrics Row                                   */}
        {/* ---------------------------------------------------- */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border border-[#E7E9F1] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isOrganizer ? (
              <>
                <StatCard
                  title="Events Managed"
                  value={`${events.length} Events`}
                  subtitle="Publishing & capacity control"
                  icon={Calendar}
                  color="indigo"
                  badge={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#625BF6]/10 text-[#625BF6]">
                      Flight Control
                    </span>
                  }
                  onClick={() => navigate('/organizer/events')}
                />

                <StatCard
                  title="Member Directory"
                  value={`${allMembers.length} Members`}
                  subtitle="Verified student memberships"
                  icon={Users}
                  color="teal"
                  badge={
                    <StatusBadge variant="active">Active Roster</StatusBadge>
                  }
                  onClick={() => navigate('/organizer/members')}
                />
              </>
            ) : (
              <>
                <StatCard
                  title="Membership Tier"
                  value={isMember ? 'Active Member' : 'Standard Student'}
                  subtitle={isMember ? '50% ticket discounts unlocked' : 'Renew dues to access perks'}
                  icon={CreditCard}
                  color={isMember ? 'teal' : 'amber'}
                  badge={
                    <StatusBadge variant={isMember ? 'active' : 'warning'}>
                      {isMember ? 'Verified' : 'Pending'}
                    </StatusBadge>
                  }
                  onClick={() => navigate('/membership')}
                />

                <StatCard
                  title="My QR Passes"
                  value={`${myTickets.length} Passes`}
                  subtitle={
                    myTickets.filter((t) => !t.checked_in).length > 0
                      ? `${myTickets.filter((t) => !t.checked_in).length} ready for check-in`
                      : 'No active event passes'
                  }
                  icon={Ticket}
                  color="indigo"
                  badge={
                    myTickets.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#625BF6]/10 text-[#625BF6]">
                        Digital QR
                      </span>
                    )
                  }
                  onClick={() => navigate('/my-tickets')}
                />
              </>
            )}

            {(isVolunteer || isOrganizer || isTreasurer || myTasks.length > 0) && (
              <>
                <StatCard
                  title="Volunteer Tasks"
                  value={`${myTasks.filter((t) => t.status !== 'done').length} Pending`}
                  subtitle={`${myTasks.filter((t) => t.status === 'done').length} completed milestones`}
                  icon={CheckSquare}
                  color="teal"
                  badge={
                    myTasks.some((t) => t.priority === 'urgent' && t.status !== 'done') ? (
                      <StatusBadge variant="critical">Urgent Task</StatusBadge>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Crew Active
                      </span>
                    )
                  }
                  onClick={() => navigate('/my-tasks')}
                />

                <StatCard
                  title="Reimbursements"
                  value="Expense Claims"
                  subtitle="Submit and track receipts"
                  icon={Receipt}
                  color="indigo"
                  badge={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Volunteer Hub
                    </span>
                  }
                  onClick={() => navigate('/expenses')}
                />
              </>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 5. Executive Intel (Visible to Organizer / Treasurer) */}
        {/* ---------------------------------------------------- */}
        {(isOrganizer || isTreasurer) && riskData && (criticalRisks.length > 0 || warningRisks.length > 0) && (
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D98A18]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#171A2B]">
                  Leadership Operational Attention ({role.toUpperCase()})
                </h2>
              </div>
              <Link
                to="/risk"
                className="text-xs font-bold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-1"
              >
                <span>Inspect in Risk Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...criticalRisks, ...warningRisks].slice(0, 2).map((risk) => (
                <RiskAlert
                  key={risk.id}
                  severity={risk.severity}
                  category={risk.category}
                  title={risk.title}
                  explanation={risk.explanation}
                  sourceRecord={risk.source_record}
                  actionText="Inspect & Remediate"
                  actionLink="/risk"
                />
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 6. Main Student Two-Column Experience                */}
        {/* ---------------------------------------------------- */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Left Column (7 cols): Active QR Pass & Upcoming Events */}
          <div className="lg:col-span-7 space-y-7">
            {/* A. Active Operations / QR Gate Credential */}
            {isOrganizer ? (
              <div className="bg-gradient-to-br from-[#17182B] to-[#23253E] text-white rounded-2xl p-6 border border-[#2B2E4E] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#2B2E4E] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#625BF6]/20 text-[#847BFA] border border-[#625BF6]/40 flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-white">
                        Organizer Operations Quick Launch
                      </h2>
                      <p className="text-[11px] text-[#8B93A7]">
                        Monitor event live capacity, volunteer teams, and gate operations
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/organizer/overview"
                    className="text-xs font-bold text-[#847BFA] hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>Command Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <Link
                    to="/organizer/events"
                    className="p-3.5 rounded-xl bg-[#1E2038] hover:bg-[#2B2E4E] border border-[#2B2E4E] transition-all flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#625BF6]/20 text-[#847BFA] flex items-center justify-center mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Events Hub</div>
                      <div className="text-[10px] text-[#8B93A7]">{events.length} Live & Draft Events</div>
                    </div>
                  </Link>
                  <Link
                    to="/organizer/scanner"
                    className="p-3.5 rounded-xl bg-[#1E2038] hover:bg-[#2B2E4E] border border-[#2B2E4E] transition-all flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#16856B]/20 text-[#2AD1A3] flex items-center justify-center mb-2">
                      <QrCode className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Fast QR Scanner</div>
                      <div className="text-[10px] text-[#8B93A7]">Live Attendee Check-In</div>
                    </div>
                  </Link>
                  <Link
                    to="/organizer/members"
                    className="p-3.5 rounded-xl bg-[#1E2038] hover:bg-[#2B2E4E] border border-[#2B2E4E] transition-all flex flex-col justify-between"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#D98A18]/20 text-[#FDBA74] flex items-center justify-center mb-2">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Member Roster</div>
                      <div className="text-[10px] text-[#8B93A7]">{allMembers.length} Chapter Members</div>
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-[0_1px_3px_rgba(23,26,43,0.03)] space-y-5">
                <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-[#171A2B]">
                        Gate Pass & Digital QR Credential
                      </h2>
                      <p className="text-[11px] text-[#687086]">
                        Fast-track check-in code for upcoming chapter gatherings
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/my-tickets"
                    className="text-xs font-bold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-1"
                  >
                    <span>All Passes ({myTickets.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {activeTicket ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#F7F8FC] to-[#EEEDFE]/30 border border-[#E0E3F5] flex flex-col sm:flex-row items-center gap-5">
                    <div className="bg-white p-3 rounded-xl border border-[#D4D1FD] shadow-xs shrink-0 flex flex-col items-center">
                      <QRCodeSVG
                        value={buildTicketQRData(activeTicket, user)}
                        size={110}
                        level="M"
                        includeMargin={false}
                      />
                      <span className="text-[9px] font-mono font-bold text-[#687086] mt-1.5 uppercase truncate max-w-[110px]">
                        {activeTicket.user_roll_number || user?.roll_number || activeTicket.qr_token?.slice(0, 10) || 'PASS'}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 w-full text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <StatusBadge variant={activeTicket.checked_in ? 'active' : 'accent'}>
                          {activeTicket.checked_in ? 'Checked In' : 'Active Pass'}
                        </StatusBadge>
                        {activeTicket.is_member_discount_applied && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16856B] bg-[#E7F5F0] px-2 py-0.5 rounded-full">
                            <Tag className="w-3 h-3" />
                            <span>Member 50% Applied</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-[#171A2B]">
                          {activeTicket.event_title}
                        </h3>
                        <div className="space-y-1 text-xs text-[#687086] mt-1">
                          <div className="text-[11px] font-semibold text-[#171A2B]">
                            Attendee: {activeTicket.user_name || user?.full_name} ({activeTicket.user_roll_number || user?.roll_number || 'Verified'})
                          </div>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#625BF6]" />
                            <span>{activeTicket.event_date}</span>
                          </div>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#687086]" />
                            <span className="truncate">{activeTicket.venue}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                        <button
                          onClick={() => setActiveModalTicket(activeTicket)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#625BF6] text-white text-xs font-bold hover:bg-[#5048E5] transition-colors cursor-pointer"
                        >
                          View QR & Profile
                        </button>
                        <Link
                          to="/my-tickets"
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E7E9F1] text-xs font-semibold text-[#171A2B] hover:bg-[#F3F4F8] transition-colors"
                        >
                          All Passes
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-[#F7F8FC] border border-dashed border-[#D3D7E8] space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#EEEDFE] text-[#625BF6] flex items-center justify-center mx-auto">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#171A2B]">No active event passes</h4>
                      <p className="text-xs text-[#687086] mt-0.5 max-w-sm mx-auto">
                        Reserve tickets for upcoming tech hackathons, workshops, and student networking galas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('upcoming-events-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#625BF6] text-white rounded-xl text-xs font-bold hover:bg-[#5048E5] transition-colors shadow-xs cursor-pointer"
                    >
                      <span>Browse Campus Events</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* B. Upcoming Chapter Events */}
            <div id="upcoming-events-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#171A2B] tracking-tight">
                    Upcoming Campus Highlights
                  </h2>
                  <p className="text-xs text-[#687086]">
                    Save up to 50% with verified club member pricing
                  </p>
                </div>
                <Link
                  to="/events"
                  className="text-xs font-bold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-1 group"
                >
                  <span>Explore All ({events.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {events.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E7E9F1] p-8 text-center space-y-3 sm:col-span-2 shadow-[0_1px_3px_rgba(23,26,43,0.03)]">
                    <div className="w-12 h-12 rounded-xl bg-[#EEEDFE] text-[#625BF6] mx-auto flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#171A2B]">No Events Scheduled Yet</div>
                    <p className="text-xs text-[#687086] max-w-sm mx-auto">
                      Organizers will post new campus gatherings, workshops, and competitions here. Check back soon!
                    </p>
                  </div>
                ) : (
                  events.map((evt) => {
                    const capacity = evt.capacity || 100;
                    const booked = evt.booked_count || 0;
                    const isConcluded = evt.is_ended || evt.status === 'ended';
                    const isFull = booked >= capacity;
                    const userTicket = myTickets.find((t) => t.event_id === evt.id && t.status !== 'cancelled');
                    const isEnrolled = !!userTicket;

                    return (
                      <div
                        key={evt.id}
                        className="bg-white rounded-2xl border border-[#E7E9F1] overflow-hidden shadow-[0_1px_3px_rgba(23,26,43,0.03)] hover:border-[#D3D7E8] hover:shadow-[0_4px_12px_rgba(23,26,43,0.05)] transition-all flex flex-col justify-between"
                      >
                        <div className="h-32 bg-[#F3F4F8] relative overflow-hidden">
                          <img
                            src={
                              evt.banner_url ||
                              'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80'
                            }
                            alt={evt.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2.5 right-2.5">
                            {isEnrolled ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#16856B] text-white shadow-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Enrolled
                              </span>
                            ) : (
                              <StatusBadge
                                variant={
                                  isConcluded
                                    ? 'neutral'
                                    : isFull
                                    ? 'critical'
                                    : !evt.is_published
                                    ? 'warning'
                                    : 'active'
                                }
                              >
                                {isConcluded
                                  ? 'Concluded'
                                  : isFull
                                  ? 'Sold Out'
                                  : !evt.is_published
                                  ? 'Coming Soon'
                                  : `${capacity - booked} Seats Left`}
                              </StatusBadge>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#625BF6]">
                                {evt.tags?.[0] || 'Campus Event'}
                              </span>
                              {!evt.is_published && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                  Preview
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-extrabold text-[#171A2B] line-clamp-1">
                              {evt.title}
                            </h3>
                            <div className="space-y-1 text-xs text-[#687086] pt-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#625BF6]" />
                                <span>{evt.event_date}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-[#A6ACBE]" />
                                <span className="truncate">{evt.venue}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#E7E9F1] space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                {isMember ? (
                                  <>
                                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                      <span>Member Price</span>
                                      <span className="text-[9px] bg-emerald-50 px-1 rounded border border-emerald-200">Active</span>
                                    </div>
                                    <div className="font-extrabold text-[#171A2B]">
                                      {evt.member_price_paise === 0 ? (
                                        <span className="text-[#16856B]">Free (Member Pass)</span>
                                      ) : (
                                        <span>{formatINR(evt.member_price_paise)}</span>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-[#687086]">
                                      Standard: {formatINR(evt.non_member_price_paise)}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-[10px] text-[#687086] font-medium">Ticket Price (Non-Member)</div>
                                    <div className="font-extrabold text-[#171A2B]">
                                      <span>{formatINR(evt.non_member_price_paise)}</span>
                                    </div>
                                    <div className="text-[9px] text-[#625BF6]">
                                      Member: {evt.member_price_paise === 0 ? 'Free' : formatINR(evt.member_price_paise)}
                                    </div>
                                  </>
                                )}
                              </div>
                              {isEnrolled ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveModalTicket(userTicket)}
                                  className="px-3 py-1.5 bg-[#E7F5F0] hover:bg-[#D1EFE6] text-[#16856B] border border-[#BDE5D8] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title="You are already enrolled in this event. Click to view your pass."
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Enrolled • View Pass</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBookingEvent(evt)}
                                  disabled={isConcluded || isFull}
                                  className="px-3 py-1.5 bg-[#EEEDFE] hover:bg-[#D4D1FD] disabled:opacity-40 text-[#625BF6] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {isConcluded ? 'Concluded' : isFull ? 'Sold Out' : 'Reserve Pass'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Volunteer Checklist OR Participant Hub */}
          <div className="lg:col-span-5 space-y-7">
            {canVolunteer || isVolunteer || myTasks.length > 0 ? (
              /* A. My Volunteer Checklist (VOLUNTEER ONLY) */
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-[0_1px_3px_rgba(23,26,43,0.03)] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E7F5F0] text-[#16856B] flex items-center justify-center font-bold">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#171A2B]">
                        My Volunteer Checklist
                      </h3>
                      <p className="text-[11px] text-[#687086]">
                        Chapter operational milestones assigned to you
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/organizer/scanner"
                      className="text-xs font-bold text-[#16856B] hover:text-[#13715B] flex items-center gap-1"
                      title="Open Gate QR Scanner"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Gate Scanner</span>
                    </Link>
                    <Link
                      to="/my-tasks"
                      className="text-xs font-bold text-[#625BF6] hover:text-[#5048E5]"
                    >
                      Tasks Board →
                    </Link>
                  </div>
                </div>

                {myTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#687086] bg-[#F7F8FC] rounded-xl border border-dashed border-[#E7E9F1]">
                    <CheckCircle2 className="w-7 h-7 text-[#16856B] mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-[#171A2B]">No pending volunteer tasks</p>
                    <p className="text-[11px] mt-0.5">
                      You're all caught up on event and chapter volunteer duties.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myTasks.slice(0, 4).map((task) => {
                      const isDone = task.status === 'done';
                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded-xl border transition-all flex items-start gap-3 text-xs ${
                            isDone
                              ? 'bg-[#F7F8FC] border-[#E7E9F1] opacity-70'
                              : 'bg-white border-[#E7E9F1] hover:border-[#D3D7E8]'
                          }`}
                        >
                          <button
                            onClick={() => toggleTaskStatus(task)}
                            disabled={taskUpdatingId === task.id}
                            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isDone
                                ? 'bg-[#16856B] border-[#16856B] text-white'
                                : 'border-[#A6ACBE] hover:border-[#625BF6]'
                            }`}
                            title={isDone ? 'Mark as todo' : 'Mark as completed'}
                          >
                            {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-bold text-[#171A2B] truncate ${
                                isDone ? 'line-through text-[#8B93A7]' : ''
                              }`}
                            >
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-[#687086] mt-0.5">
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.due_date}</span>
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                  task.priority === 'urgent'
                                    ? 'bg-[#FDF2F4] text-[#D9485F]'
                                    : 'bg-[#F3F4F8] text-[#687086]'
                                }`}
                              >
                                {task.priority || 'Normal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Gate Scanner Card for Volunteers */}
                <Link
                  to="/organizer/scanner"
                  className="p-3 rounded-xl bg-gradient-to-r from-[#17182B] to-[#252849] text-white flex items-center justify-between hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Launch Gate QR Scanner</span>
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-mono">LIVE</span>
                      </div>
                      <div className="text-[10px] text-white/60">Manage check-in lane and scan attendee ticket passes</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all" />
                </Link>
              </div>
            ) : (
              /* A. Participant Hub & Volunteer Invitation (NON-VOLUNTEERS) */
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-[0_1px_3px_rgba(23,26,43,0.03)] space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center font-bold">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#171A2B]">
                          Participant Privileges
                        </h3>
                        <p className="text-[11px] text-[#687086]">
                          {isMember ? 'Active member discounts & credentials' : 'Campus competitor access'}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/events"
                      className="text-xs font-bold text-[#625BF6] hover:text-[#5048E5]"
                    >
                      Browse Events →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086] block">
                        Hackathon Discount
                      </span>
                      <span className="text-lg font-black text-[#16856B]">
                        {isMember ? '50% OFF' : 'Standard'}
                      </span>
                      <span className="text-[10px] text-[#687086] block mt-0.5">Applied at checkout</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086] block">
                        Active Passes
                      </span>
                      <span className="text-lg font-black text-[#171A2B]">
                        {myTickets.length}
                      </span>
                      <span className="text-[10px] text-[#687086] block mt-0.5">Registered tickets</span>
                    </div>
                  </div>

                  {/* Want to Volunteer? Banner */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#625BF6]/5 to-[#EEEDFE]/40 border border-[#625BF6]/20 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#171A2B] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#625BF6]" />
                        <span>Want to Help Organize Events?</span>
                      </h4>
                      <p className="text-[11px] text-[#687086] mt-0.5">
                        Join the Volunteer Crew in Membership to unlock event tasks and gate QR scanning access.
                      </p>
                    </div>
                    <Link
                      to="/membership"
                      className="px-3 py-1.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                    >
                      Join Track
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* B. Quick Action Hub */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-[0_1px_3px_rgba(23,26,43,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-sm font-extrabold text-[#171A2B]">
                  {isOrganizer ? 'Organizer Quick Actions' : 'Student Fast Actions'}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                  Shortcuts
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isOrganizer ? (
                  <>
                    <Link
                      to="/organizer/events"
                      className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-2">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                          Manage Events
                        </h4>
                        <p className="text-[10px] text-[#687086]">Create & edit</p>
                      </div>
                    </Link>

                    <Link
                      to="/organizer/scanner"
                      className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#16856B]/10 text-[#16856B] flex items-center justify-center mb-2">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                          Fast Scanner
                        </h4>
                        <p className="text-[10px] text-[#687086]">Gate QR check-in</p>
                      </div>
                    </Link>

                    <Link
                      to="/organizer/members"
                      className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-2">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                          Member Roster
                        </h4>
                        <p className="text-[10px] text-[#687086]">Student directory</p>
                      </div>
                    </Link>

                    <Link
                      to="/organizer/tasks"
                      className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-2">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                          Task Board
                        </h4>
                        <p className="text-[10px] text-[#687086]">Team assignments</p>
                      </div>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/my-tickets"
                      className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-2">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                          QR Passes
                        </h4>
                        <p className="text-[10px] text-[#687086]">Event entry codes</p>
                      </div>
                    </Link>

                    <Link
                      to="/membership"
                      className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#16856B]/10 text-[#16856B] flex items-center justify-center mb-2">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                          Membership
                        </h4>
                        <p className="text-[10px] text-[#687086]">Perks & renewal</p>
                      </div>
                    </Link>

                    {canVolunteer ? (
                      <>
                        <Link
                          to="/organizer/scanner"
                          className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#16856B]/10 text-[#16856B] flex items-center justify-center mb-2">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                              Gate Scanner
                            </h4>
                            <p className="text-[10px] text-[#687086]">Verify QR tickets</p>
                          </div>
                        </Link>

                        <Link
                          to="/my-tasks"
                          className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-2">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                              My Tasks
                            </h4>
                            <p className="text-[10px] text-[#687086]">Volunteer duties</p>
                          </div>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/events"
                          className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-2">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                              All Events
                            </h4>
                            <p className="text-[10px] text-[#687086]">Hackathons & labs</p>
                          </div>
                        </Link>

                        <Link
                          to="/expenses"
                          className="p-3.5 rounded-xl bg-[#F7F8FC] hover:bg-[#EEEDFE] border border-[#E7E9F1] hover:border-[#D4D1FD] transition-all group flex flex-col justify-between"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#D98A18]/10 text-[#D98A18] flex items-center justify-center mb-2">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#171A2B] group-hover:text-[#625BF6]">
                              Reimburse
                            </h4>
                            <p className="text-[10px] text-[#687086]">File claim receipts</p>
                          </div>
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 7. Modal for Full QR Pass Inspection with Profile    */}
      {/* ---------------------------------------------------- */}
      <PassQRModal
        ticket={activeModalTicket}
        user={user}
        isOpen={Boolean(activeModalTicket)}
        onClose={() => setActiveModalTicket(null)}
      />

      {/* Event Booking Modal directly on the same page */}
      <EventBookingModal
        isOpen={Boolean(selectedBookingEvent)}
        event={selectedBookingEvent}
        onClose={() => setSelectedBookingEvent(null)}
        onBookSuccess={() => {
          fetchDashboard();
        }}
      />
    </DashboardLayout>
  );
};

export default StudentDashboard;

