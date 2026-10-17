import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Calendar,
  Ticket,
  UserCheck,
  Network,
  Kanban,
  Sparkles,
  Camera,
  Megaphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  Plus,
  X,
  Palette,
  Truck,
  Utensils,
  Cpu,
  Sliders,
  Layers,
  Coffee,
  HeartHandshake
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { QRScannerModal } from '../components/QRScannerModal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { AnnouncementSlider } from '../components/AnnouncementSlider';

const DEPT_ICONS = {
  'Branding': Palette,
  'Logistics': Truck,
  'Food & Beverages': Utensils,
  'Technical': Cpu,
  'Public Relations': Megaphone,
  'Operations': Sliders,
  'Decorations & Stage': Sparkles,
  'Hospitality': Coffee
};

export const OrganizerOverview = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [deptData, setDeptData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [createTaskModal, setCreateTaskModal] = useState(false);
  const [createAnnouncementModal, setCreateAnnouncementModal] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const DEPARTMENTS = [
    'Branding',
    'Logistics',
    'Food & Beverages',
    'Technical',
    'Public Relations',
    'Operations',
    'Decorations & Stage',
    'Hospitality'
  ];

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    event_id: '',
    department: 'Branding',
    assignment_role: 'Volunteer',
    assignee_name: '',
    assignee_id: '',
    assignee_email: '',
    due_date: new Date().toISOString().slice(0, 10),
    priority: 'high',
    is_critical_path: true,
    description: ''
  });

  // Available volunteers state for Assign Task modal
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [customNameMode, setCustomNameMode] = useState(false);

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    priority: 'normal'
  });

  const fetchAvailableVolunteers = async (eventId, dept) => {
    try {
      setLoadingVolunteers(true);
      const res = await api.get('/api/events/available-volunteers', {
        params: {
          event_id: eventId || undefined,
          department: dept || undefined
        }
      });
      setAvailableVolunteers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load available volunteers:', err);
      setAvailableVolunteers([]);
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [evRes, volRes, deptRes, tskRes, memRes, annRes] = await Promise.all([
        api.get('/api/events').catch(() => []),
        api.get('/api/events/volunteer-applications').catch(() => []),
        api.get('/api/tasks/department-assignments').catch(() => null),
        api.get('/api/tasks').catch(() => []),
        api.get('/api/members').catch(() => []),
        api.get('/api/announcements').catch(() => [])
      ]);

      setEvents(evRes || []);
      setVolunteers(volRes || []);
      setDeptData(deptRes);
      setTasks(tskRes || []);
      setMembers(memRes || []);
      setAnnouncements(annRes || []);
    } catch (err) {
      console.error('Failed to load organizer flight control data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [token]);

  // Derived Key Metrics requested by user:
  // 1. Total registrations across all events
  const totalRegistrations = events.reduce((acc, e) => acc + (e.booked_count || 0), 0);
  const totalCheckedIn = events.reduce((acc, e) => acc + (e.checked_in_count || 0), 0);
  const checkInRate = totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0;

  // 2. Total upcoming events
  const upcomingEvents = events.filter((e) => e.is_published);
  const totalCapacity = events.reduce((acc, e) => acc + (e.capacity || 0), 0);

  // 3. No. of volunteers registered in all events
  const totalVolunteersRegistered = volunteers.length;
  const approvedVolunteersCount = volunteers.filter((v) => v.status === 'approved').length;
  const pendingVolunteersCount = volunteers.filter((v) => v.status === 'pending').length;

  // 4. Department Heads & Sub-heads metrics
  const totalHeadsAssigned = deptData?.departments?.reduce((acc, d) => acc + d.head_assigned, 0) || 0;
  const totalSubHeadsAssigned = deptData?.departments?.reduce((acc, d) => acc + d.sub_head_assigned, 0) || 0;

  // Dynamic quota calculations for Assign Task modal
  const currentDeptTasks = tasks.filter(
    (t) => (!taskForm.event_id || t.event_id === taskForm.event_id) &&
           (t.department || 'Operations').toLowerCase() === (taskForm.department || 'Branding').toLowerCase()
  );
  const headAssignedCount = currentDeptTasks.filter((t) => t.assignment_role === 'Head').length;
  const subHeadAssignedCount = currentDeptTasks.filter((t) => t.assignment_role === 'Sub-head').length;
  const remainingHeads = Math.max(0, 1 - headAssignedCount);
  const remainingSubHeads = Math.max(0, 3 - subHeadAssignedCount);

  // Handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    try {
      await api.post('/api/tasks', {
        title: taskForm.title,
        event_id: taskForm.event_id || null,
        department: taskForm.department || 'Operations',
        assignment_role: taskForm.assignment_role || 'Volunteer',
        assignee_name: taskForm.assignee_name || null,
        assignee_id: taskForm.assignee_id || null,
        assignee_email: taskForm.assignee_email || null,
        due_date: taskForm.due_date,
        priority: taskForm.priority,
        is_critical_path: taskForm.is_critical_path,
        description: taskForm.description || '',
        status: 'todo'
      });
      setCreateTaskModal(false);
      fetchOverviewData();
    } catch (err) {
      alert(`Task assignment failed: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    try {
      await api.post('/api/announcements', {
        title: announcementForm.title,
        content: announcementForm.content,
        target_audience: 'all',
        priority: announcementForm.priority || 'normal',
        is_published: true
      });
      setCreateAnnouncementModal(false);
      setAnnouncementForm({
        title: '',
        content: '',
        target_audience: 'all',
        priority: 'normal'
      });
      fetchOverviewData();
    } catch (err) {
      alert(`Announcement failed: ${err.message}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Command Hub">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ================================================================= */}
        {/* 1. Header Command Hub Banner                                     */}
        {/* ================================================================= */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#17182B] text-white border border-[#2B2E4E] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
          <div className="space-y-1.5 max-w-2xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#625BF6]/20 text-[#A594FD] border border-[#625BF6]/40 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Operations Command Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Operational Telemetry & Roster Control
            </h1>
            <p className="text-xs sm:text-sm text-[#A6ACBE] leading-relaxed">
              Consolidated real-time operational telemetry across event registrations, volunteer deployments, and departmental readiness.
            </p>
          </div>

          {/* Quick Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <button
              onClick={() => setScannerOpen(true)}
              className="px-4 py-2.5 bg-[#23253E] hover:bg-[#2B2E4E] text-white border border-[#3E4267] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Camera className="w-4 h-4 text-[#A594FD]" />
              <span>Fast QR Scanner</span>
            </button>
            <button
              onClick={() => setCreateTaskModal(true)}
              className="px-4 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Kanban className="w-4 h-4 text-white" />
              <span>Assign Task</span>
            </button>
            <button
              onClick={() => setCreateAnnouncementModal(true)}
              className="px-3.5 py-2.5 bg-[#23253E] hover:bg-[#2B2E4E] text-white border border-[#3E4267] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Broadcast bulletin"
            >
              <Megaphone className="w-4 h-4 text-[#D9485F]" />
              <span>Publish Bulletin</span>
            </button>
          </div>
        </div>

        {/* Live Broadcast Bulletins on Organizer Side */}
        <AnnouncementSlider announcements={announcements} />

        {/* ================================================================= */}
        {/* 2. Key Highlighted KPI Stat Cards                                 */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Registrations */}
          <Link to="/organizer/events" className="group">
            <StatCard
              title="Total Event Registrations"
              value={totalRegistrations}
              subtitle={`${totalCheckedIn} Gate check-ins (${checkInRate}% yield)`}
              icon={Ticket}
              color="indigo"
            />
          </Link>

          {/* KPI 2: Total Upcoming Events */}
          <Link to="/organizer/events" className="group">
            <StatCard
              title="Upcoming Events"
              value={upcomingEvents.length}
              subtitle={`${totalCapacity} Total capacity across venues`}
              icon={Calendar}
              color="amber"
            />
          </Link>

          {/* KPI 3: Volunteers Registered in All Events */}
          <div className="group">
            <StatCard
              title="Volunteers Registered"
              value={totalVolunteersRegistered}
              subtitle={`${approvedVolunteersCount} Approved • ${pendingVolunteersCount} Pending`}
              icon={UserCheck}
              color="teal"
            />
          </div>

          {/* KPI 4: Department Leadership Readiness */}
          <div className="group">
            <StatCard
              title="Department Leadership"
              value={`${totalHeadsAssigned} / 8 Heads`}
              subtitle={`${totalSubHeadsAssigned} / 24 Sub-heads assigned`}
              icon={Network}
              color="rose"
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Operational Visualizations Grid                                */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual 1: Event-Wise Registration vs Capacity Yield (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-[#E7E9F1] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center font-bold">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#171A2B]">
                      Event Registrations & Capacity Yield
                    </h2>
                    <p className="text-xs text-[#687086]">
                      Live attendee registration progress across all upcoming events.
                    </p>
                  </div>
                </div>

                <Link
                  to="/organizer/events"
                  className="text-xs font-semibold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-1 transition-colors"
                >
                  <span>All Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-5 space-y-5">
                {loading ? (
                  <LoadingSkeleton lines={4} />
                ) : upcomingEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#687086]">
                    No active events scheduled.
                  </div>
                ) : (
                  upcomingEvents.map((evt) => {
                    const booked = evt.booked_count || 0;
                    const cap = Math.max(1, evt.capacity || 100);
                    const pct = Math.min(100, Math.round((booked / cap) * 100));
                    const checkedIn = evt.checked_in_count || 0;

                    return (
                      <div
                        key={evt.id}
                        className="p-4 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC]/50 hover:bg-[#F7F8FC] hover:border-[#625BF6]/30 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-[#171A2B]">
                              {evt.title}
                            </div>
                            <div className="text-xs text-[#687086] flex items-center gap-2 mt-0.5">
                              <span>📅 {evt.event_date}</span>
                              <span>•</span>
                              <span>📍 {evt.venue}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                pct >= 90
                                  ? 'bg-[#D9485F]/10 text-[#D9485F] border-[#D9485F]/20'
                                  : pct >= 50
                                  ? 'bg-[#625BF6]/10 text-[#625BF6] border-[#625BF6]/20'
                                  : 'bg-[#16856B]/10 text-[#16856B] border-[#16856B]/20'
                              }`}
                            >
                              {pct}% Booked
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Visualization */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#687086]">
                            <span>
                              Registered: <strong className="text-[#171A2B]">{booked}</strong> / {cap} seats
                            </span>
                            <span className="text-[#16856B] font-semibold">
                              ✓ {checkedIn} Checked-in at Gate
                            </span>
                          </div>
                          <div className="w-full bg-[#E7E9F1] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 90 ? 'bg-[#D9485F]' : pct >= 50 ? 'bg-[#625BF6]' : 'bg-[#16856B]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F7F8FC] border-t border-[#E7E9F1] flex items-center justify-between text-xs text-[#687086]">
              <span>Need attendee check-in management?</span>
              <button
                onClick={() => setScannerOpen(true)}
                className="font-semibold text-[#625BF6] hover:underline flex items-center gap-1"
              >
                <span>Launch Fast QR Gate Scanner →</span>
              </button>
            </div>
          </div>

          {/* Visual 2: Volunteer Deployment by Event (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-[#E7E9F1] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#16856B]/10 text-[#16856B] flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#171A2B]">
                      Volunteer Mobilization
                    </h2>
                    <p className="text-xs text-[#687086]">
                      Event-wise registered volunteers vs quota needed.
                    </p>
                  </div>
                </div>

                <Link
                  to="/organizer/volunteers"
                  className="text-xs font-semibold text-[#16856B] hover:underline flex items-center gap-1"
                >
                  <span>Roster</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-5 space-y-4">
                {loading ? (
                  <LoadingSkeleton lines={4} />
                ) : upcomingEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#687086]">
                    No event volunteer requirements active.
                  </div>
                ) : (
                  upcomingEvents.map((evt) => {
                    const eventVols = volunteers.filter((v) => v.event_id === evt.id);
                    const approvedVols = eventVols.filter((v) => v.status === 'approved').length;
                    const needed = Math.max(1, evt.required_volunteer_count || 5);
                    const fillPct = Math.min(100, Math.round((approvedVols / needed) * 100));

                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC]/50 hover:bg-[#F7F8FC] transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#171A2B] truncate">
                            {evt.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              approvedVols >= needed
                                ? 'bg-[#16856B]/15 text-[#16856B]'
                                : 'bg-[#C97A16]/15 text-[#C97A16]'
                            }`}
                          >
                            {approvedVols >= needed ? 'Staffed ✓' : 'Recruiting'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#687086]">
                            <span>
                              Registered: <strong className="text-[#171A2B]">{approvedVols}</strong> / {needed} volunteers
                            </span>
                            <span className="font-semibold text-[#16856B]">
                              {fillPct}%
                            </span>
                          </div>
                          <div className="w-full bg-[#E7E9F1] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#16856B] transition-all duration-500"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 bg-[#F7F8FC] border-t border-[#E7E9F1] flex items-center justify-between text-xs text-[#687086]">
              <span>Active volunteer registration intake</span>
              <span className="font-semibold text-[#16856B]">
                {totalVolunteersRegistered} Applied
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. Department Leadership Quick Telemetry                          */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center font-bold">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#171A2B]">
                  Department Team Allocations
                </h2>
                <p className="text-xs text-[#687086]">
                  Role quotas: 1 Head, up to 3 Sub-heads, and active volunteers per department.
                </p>
              </div>
            </div>

            <Link
              to="/organizer/department-assignments"
              className="text-xs font-semibold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View Full Department Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {DEPARTMENTS.map((deptName) => {
              const Icon = DEPT_ICONS[deptName] || Layers;
              const deptInfo = deptData?.departments?.find((d) => d.department === deptName);
              const headCount = deptInfo?.head_assigned || 0;
              const subCount = deptInfo?.sub_head_assigned || 0;

              return (
                <div
                  key={deptName}
                  className="p-3 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC]/50 transition-all text-center space-y-1.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-[11px] text-[#171A2B] truncate">
                    {deptName}
                  </div>
                  <div className="text-[10px] space-y-0.5">
                    <div className={headCount > 0 ? 'text-[#16856B] font-semibold' : 'text-[#8B93A7]'}>
                      Head: {headCount}/1
                    </div>
                    <div className="text-[#687086]">
                      Subs: {subCount}/3
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. Modals: Assign Task & Announcement                             */}
        {/* ================================================================= */}

        {/* Assign Task Modal */}
        {createTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#625BF6]" />
                  <span>Assign Volunteer Sprint Task</span>
                </h3>
                <button onClick={() => setCreateTaskModal(false)} className="text-[#687086] hover:text-[#171A2B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stage Sound & Mic Rigging"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Associated Event</label>
                  <select
                    value={taskForm.event_id}
                    onChange={(e) => {
                      const newEvent = e.target.value;
                      setTaskForm({ ...taskForm, event_id: newEvent, assignee_name: '' });
                      fetchAvailableVolunteers(newEvent, taskForm.department);
                    }}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  >
                    <option value="">General Club Operations</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Department *</label>
                    <select
                      value={taskForm.department}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        setTaskForm({ ...taskForm, department: newDept, assignee_name: '' });
                        fetchAvailableVolunteers(taskForm.event_id, newDept);
                      }}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Role (Quota Capped) *</label>
                    <select
                      value={taskForm.assignment_role}
                      onChange={(e) => setTaskForm({ ...taskForm, assignment_role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      <option value="Head" disabled={remainingHeads === 0 && taskForm.assignment_role !== 'Head'}>
                        Head ({remainingHeads} remaining / max 1) {remainingHeads === 0 ? '• Filled' : ''}
                      </option>
                      <option value="Sub-head" disabled={remainingSubHeads === 0 && taskForm.assignment_role !== 'Sub-head'}>
                        Sub-head ({remainingSubHeads} remaining / max 3) {remainingSubHeads === 0 ? '• Filled' : ''}
                      </option>
                      <option value="Volunteer">
                        Volunteer (Flexible / Open)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Live Quota Tracker */}
                <div className="p-2.5 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#171A2B]">{taskForm.department}:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${remainingHeads === 0 ? 'bg-[#D9485F]/15 text-[#D9485F]' : 'bg-[#16856B]/15 text-[#16856B]'}`}>
                      Head: {headAssignedCount}/1 {remainingHeads === 0 ? '(Filled)' : `(${remainingHeads} left)`}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${remainingSubHeads === 0 ? 'bg-[#D9485F]/15 text-[#D9485F]' : 'bg-[#625BF6]/15 text-[#625BF6]'}`}>
                      Sub-head: {subHeadAssignedCount}/3 {remainingSubHeads === 0 ? '(Filled)' : `(${remainingSubHeads} left)`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-[#171A2B]">Select Volunteer *</label>
                      <button
                        type="button"
                        onClick={() => setCustomNameMode(!customNameMode)}
                        className="text-[10px] text-[#625BF6] hover:underline font-semibold"
                      >
                        {customNameMode ? '← Pick Available' : '+ Custom Name'}
                      </button>
                    </div>

                    {customNameMode ? (
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ananya Roy"
                        value={taskForm.assignee_name}
                        onChange={(e) =>
                          setTaskForm({
                            ...taskForm,
                            assignee_name: e.target.value,
                            assignee_id: '',
                            assignee_email: ''
                          })
                        }
                        className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                      />
                    ) : (() => {
                      const safeVolunteers = Array.isArray(availableVolunteers) ? availableVolunteers.filter(Boolean) : [];
                      const displayVolunteers = safeVolunteers.filter((v) => v.available || v.name === taskForm.assignee_name);
                      const availableCount = displayVolunteers.filter((v) => v.available).length;

                      return (
                        <>
                          <select
                            required
                            value={taskForm.assignee_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matched = displayVolunteers.find((v) => v.name === val);
                              setTaskForm({
                                ...taskForm,
                                assignee_name: val,
                                assignee_id: matched ? matched.id : '',
                                assignee_email: matched ? matched.email : ''
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                          >
                            <option value="">
                              {loadingVolunteers
                                ? 'Loading available volunteers...'
                                : displayVolunteers.length === 0
                                ? '-- No available volunteers for this department --'
                                : `-- Choose Volunteer (${availableCount} available) --`}
                            </option>
                            {displayVolunteers.map((vol) => (
                              <option
                                key={vol.id || vol.name}
                                value={vol.name || ''}
                              >
                                {vol.name || 'Volunteer'} • Available ({vol.source || 'Active Pool'})
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-[#687086] mt-0.5 block">
                            {availableCount} available volunteers eligible for {taskForm.department}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E7E9F1] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateTaskModal(false)}
                    className="px-4 py-2 border rounded-xl text-[#687086] hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white font-semibold rounded-xl"
                  >
                    {actionSubmitting ? 'Saving...' : 'Add to Board'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Publish Announcement Modal */}
        {createAnnouncementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#D9485F]" />
                  <span>Publish Official Bulletin</span>
                </h3>
                <button onClick={() => setCreateAnnouncementModal(false)} className="text-[#687086] hover:text-[#171A2B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Bulletin Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Revision for Symposium"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Notice Content *</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Details of the announcement..."
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E7E9F1] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateAnnouncementModal(false)}
                    className="px-4 py-2 border rounded-xl text-[#687086] hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white font-semibold rounded-xl"
                  >
                    {actionSubmitting ? 'Broadcasting...' : 'Publish Bulletin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Optical QR Scanner Modal */}
        <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
      </div>
    </DashboardLayout>
  );
};
