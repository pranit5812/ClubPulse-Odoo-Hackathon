import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Network,
  Users,
  UserCheck,
  Calendar,
  Plus,
  Crown,
  Shield,
  HeartHandshake,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Search,
  Filter,
  Sparkles,
  Palette,
  Truck,
  Utensils,
  Cpu,
  Megaphone,
  Sliders,
  Layers,
  Coffee
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

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

const DEPT_COLORS = {
  'Branding': { bg: 'bg-[#625BF6]/10', border: 'border-[#625BF6]/30', text: 'text-[#625BF6]', accent: '#625BF6' },
  'Logistics': { bg: 'bg-[#C97A16]/10', border: 'border-[#C97A16]/30', text: 'text-[#C97A16]', accent: '#C97A16' },
  'Food & Beverages': { bg: 'bg-[#16856B]/10', border: 'border-[#16856B]/30', text: 'text-[#16856B]', accent: '#16856B' },
  'Technical': { bg: 'bg-[#2563EB]/10', border: 'border-[#2563EB]/30', text: 'text-[#2563EB]', accent: '#2563EB' },
  'Public Relations': { bg: 'bg-[#D9485F]/10', border: 'border-[#D9485F]/30', text: 'text-[#D9485F]', accent: '#D9485F' },
  'Operations': { bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]/30', text: 'text-[#8B5CF6]', accent: '#8B5CF6' },
  'Decorations & Stage': { bg: 'bg-[#EC4899]/10', border: 'border-[#EC4899]/30', text: 'text-[#EC4899]', accent: '#EC4899' },
  'Hospitality': { bg: 'bg-[#0D9488]/10', border: 'border-[#0D9488]/30', text: 'text-[#0D9488]', accent: '#0D9488' }
};

export const DepartmentAssignmentsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    title: '',
    event_id: '',
    department: 'Branding',
    assignment_role: 'Volunteer',
    assignee_name: '',
    due_date: new Date().toISOString().slice(0, 10),
    priority: 'medium',
    is_critical_path: false
  });
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [customNameMode, setCustomNameMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async (eventId = selectedEventId) => {
    try {
      setLoading(true);
      const [eventsRes, tasksRes] = await Promise.all([
        api.get('/api/events'),
        api.get('/api/tasks')
      ]);

      const allEvents = eventsRes || [];
      setEvents(allEvents);
      setTasks(tasksRes || []);

      const targetEventId = eventId || (allEvents.length > 0 ? allEvents[0].id : '');
      if (!selectedEventId && targetEventId) {
        setSelectedEventId(targetEventId);
      }

      const assignRes = await api.get(
        targetEventId ? `/api/tasks/department-assignments?event_id=${targetEventId}` : '/api/tasks/department-assignments'
      );
      setData(assignRes);
    } catch (err) {
      console.error('Failed to load department assignments:', err);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchAssignments(selectedEventId);
  }, [selectedEventId]);

  const handleOpenAssignModal = (dept = 'Branding', role = 'Volunteer') => {
    const targetEvent = selectedEventId || (events && events.length > 0 ? events[0].id : '');
    setModalForm({
      title: '',
      event_id: targetEvent,
      department: dept || 'Branding',
      assignment_role: role || 'Volunteer',
      assignee_name: '',
      assignee_id: '',
      assignee_email: '',
      due_date: new Date().toISOString().slice(0, 10),
      priority: 'medium',
      is_critical_path: false
    });
    setCustomNameMode(false);
    fetchAvailableVolunteers(targetEvent, dept);
    setAssignModalOpen(true);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tasks', {
        title: modalForm.title || `${modalForm.department} ${modalForm.assignment_role} Sprint`,
        description: `Designated as ${modalForm.assignment_role} for ${modalForm.department}`,
        event_id: modalForm.event_id || null,
        department: modalForm.department,
        assignment_role: modalForm.assignment_role,
        assignee_name: modalForm.assignee_name || null,
        assignee_id: modalForm.assignee_id || null,
        assignee_email: modalForm.assignee_email || null,
        due_date: modalForm.due_date,
        priority: modalForm.priority,
        is_critical_path: modalForm.is_critical_path,
        status: 'todo'
      });
      setAssignModalOpen(false);
      fetchAssignments(selectedEventId);
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Safe Quotas calculation in modal
  const safeTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const modalDeptTasks = safeTasks.filter(
    (t) => (!modalForm.event_id || t.event_id === modalForm.event_id) &&
           ((t.department || 'Operations').toLowerCase() === (modalForm.department || 'Branding').toLowerCase())
  );
  const modalHeadsCount = modalDeptTasks.filter((t) => t.assignment_role === 'Head').length;
  const modalSubHeadsCount = modalDeptTasks.filter((t) => t.assignment_role === 'Sub-head').length;
  const modalRemainingHeads = Math.max(0, 1 - modalHeadsCount);
  const modalRemainingSubHeads = Math.max(0, 3 - modalSubHeadsCount);

  // Safe overall totals
  const deptsList = Array.isArray(data?.departments) ? data.departments.filter(Boolean) : [];
  const totalDepts = deptsList.length;
  const totalHeadsAssigned = deptsList.reduce((acc, d) => acc + (Number(d.head_assigned) || 0), 0);
  const totalSubHeadsAssigned = deptsList.reduce((acc, d) => acc + (Number(d.sub_head_assigned) || 0), 0);
  const totalVolunteersAssigned = deptsList.reduce((acc, d) => acc + (Number(d.volunteer_assigned) || 0), 0);

  const safeEvents = Array.isArray(events) ? events : [];
  const currentEvent = safeEvents.find((e) => e && e.id === selectedEventId) || data?.event;

  // Safe filter departments by search
  const filteredDepartments = deptsList.filter((dept) => {
    if (!dept) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if ((dept.department || '').toLowerCase().includes(q)) return true;
    const people = [
      ...(Array.isArray(dept.heads) ? dept.heads : []),
      ...(Array.isArray(dept.sub_heads) ? dept.sub_heads : []),
      ...(Array.isArray(dept.volunteers) ? dept.volunteers : [])
    ];
    return people.some((p) => {
      if (!p) return false;
      const aName = (p.assignee_name || '').toLowerCase();
      const tTitle = (p.task_title || '').toLowerCase();
      return aName.includes(q) || tTitle.includes(q);
    });
  });

  return (
    <DashboardLayout pageTitle="Department Team Assignments">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Network className="w-3.5 h-3.5" />
              <span>Departmental Leadership & Squad Roster</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Event-Wise Department Assignments
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Hierarchical team allocation per department: Exactly 1 Head slot, up to 3 Sub-head slots, and scalable Volunteer deployment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Event Selector Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E7E9F1] shadow-2xs">
              <Calendar className="w-4 h-4 text-[#625BF6] shrink-0" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="text-xs font-bold text-[#171A2B] bg-transparent outline-none cursor-pointer pr-2"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.event_date})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenAssignModal('Branding', 'Head')}
              className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Role</span>
            </button>
          </div>
        </div>

        {/* Selected Event Details Banner */}
        {currentEvent && (
          <div className="bg-gradient-to-r from-[#17182B] to-[#252848] rounded-2xl p-5 text-white border border-[#2F3358] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#625BF6]/30 text-[#D4D1FD] border border-[#625BF6]/50">
                  Target Event
                </span>
                <span className="text-xs text-[#8B93A7]">•</span>
                <span className="text-xs font-semibold text-[#8B93A7]">
                  {currentEvent.event_date || 'Upcoming'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {currentEvent.title}
              </h2>
              <div className="text-xs text-[#A6ACBE] flex items-center gap-3 flex-wrap">
                <span>📍 {currentEvent.venue || 'Campus Auditorium'}</span>
                {currentEvent.capacity && <span>• 👥 Capacity: {currentEvent.capacity}</span>}
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#0E0F1D]/60 p-3 rounded-xl border border-[#2B2E4E]">
              <div className="text-center px-2">
                <div className="text-base font-extrabold text-[#625BF6]">{totalHeadsAssigned}/{totalDepts}</div>
                <div className="text-[10px] text-[#8B93A7] font-semibold uppercase">Heads (Max 1)</div>
              </div>
              <div className="w-px h-8 bg-[#2B2E4E]" />
              <div className="text-center px-2">
                <div className="text-base font-extrabold text-[#16856B]">{totalSubHeadsAssigned}/{totalDepts * 3}</div>
                <div className="text-[10px] text-[#8B93A7] font-semibold uppercase">Sub-Heads (Max 3)</div>
              </div>
              <div className="w-px h-8 bg-[#2B2E4E]" />
              <div className="text-center px-2">
                <div className="text-base font-extrabold text-[#C97A16]">{totalVolunteersAssigned}</div>
                <div className="text-[10px] text-[#8B93A7] font-semibold uppercase">Volunteers</div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E7E9F1] shadow-2xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8B93A7] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by department name, assignee, or sprint task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] focus:outline-none focus:border-[#625BF6]"
            />
          </div>

          <div className="text-xs text-[#687086] font-semibold hidden sm:block">
            Showing {filteredDepartments.length} Departments
          </div>
        </div>

        {/* Department Grid */}
        {loading ? (
          <div className="p-12">
            <LoadingSkeleton lines={6} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDepartments.map((dept) => {
              const Icon = DEPT_ICONS[dept.department] || Layers;
              const color = DEPT_COLORS[dept.department] || {
                bg: 'bg-[#625BF6]/10',
                border: 'border-[#625BF6]/30',
                text: 'text-[#625BF6]',
                accent: '#625BF6'
              };

              const deptHeads = Array.isArray(dept?.heads) ? dept.heads : [];
              const hasHead = deptHeads.length > 0;
              const head = deptHeads[0];
              const headName = head?.assignee_name || 'Unassigned';
              const headInit = headName.trim().charAt(0) || 'H';

              const deptSubHeads = Array.isArray(dept?.sub_heads) ? dept.sub_heads : [];
              const safeRemainingSubs = Math.max(0, Number(dept?.sub_head_remaining) || 0);

              return (
                <div
                  key={dept.department}
                  className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden flex flex-col hover:border-[#625BF6]/30 transition-all"
                >
                  {/* Department Card Header */}
                  <div className="p-4 sm:p-5 border-b border-[#E7E9F1] flex items-center justify-between bg-gradient-to-r from-[#F7F8FC] to-white">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${color.bg} ${color.border} border flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${color.text}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                          <span>{dept.department}</span>
                          <span className="text-[11px] font-normal text-[#8B93A7]">
                            ({dept.total_members || 0} assigned)
                          </span>
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            hasHead ? 'bg-[#625BF6]/10 text-[#625BF6]' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            Head: {dept.head_assigned || 0}/1 {(dept.head_remaining || 0) > 0 ? `(${dept.head_remaining} slot left)` : 'Filled'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (dept.sub_head_assigned || 0) > 0 ? 'bg-[#16856B]/10 text-[#16856B]' : 'bg-gray-100 text-[#687086]'
                          }`}>
                            Sub-heads: {dept.sub_head_assigned || 0}/3 ({safeRemainingSubs} left)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAssignModal(dept.department, (dept.head_remaining || 0) > 0 ? 'Head' : safeRemainingSubs > 0 ? 'Sub-head' : 'Volunteer')}
                      className="p-2 rounded-xl text-[#625BF6] hover:bg-[#625BF6]/10 transition-colors"
                      title={`Assign to ${dept.department}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body: Head, Sub-heads, Volunteers */}
                  <div className="p-4 sm:p-5 space-y-4 flex-1">
                    {/* 1. Department Head Slot (Max 1) */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#171A2B] mb-2">
                        <span className="flex items-center gap-1.5 text-[#625BF6]">
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>Department Head (Quota: 1)</span>
                        </span>
                        <span className="text-[10px] text-[#8B93A7] font-semibold">
                          {(dept.head_remaining || 0) === 0 ? 'Slot Filled' : '1 Slot Vacant'}
                        </span>
                      </div>

                      {hasHead ? (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-[#625BF6]/5 to-[#F7F8FC] border border-[#625BF6]/20 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#625BF6] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {headInit}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-[#171A2B] truncate">
                                {headName}
                              </div>
                              <div className="text-[11px] text-[#687086] truncate">
                                {head?.task_title || 'Department Head Sprint'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#625BF6]/15 text-[#625BF6]">
                              Head
                            </span>
                            <span className="text-[10px] text-[#8B93A7] font-mono">
                              📅 {head?.due_date || 'Ongoing'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenAssignModal(dept.department, 'Head')}
                          className="w-full p-3 rounded-xl border border-dashed border-[#E7E9F1] hover:border-[#625BF6] text-center text-xs font-semibold text-[#8B93A7] hover:text-[#625BF6] hover:bg-[#625BF6]/5 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign Department Head (1 Slot Available)</span>
                        </button>
                      )}
                    </div>

                    {/* 2. Department Sub-heads (Max 3) */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#171A2B] mb-2">
                        <span className="flex items-center gap-1.5 text-[#16856B]">
                          <Shield className="w-3.5 h-3.5 text-[#16856B]" />
                          <span>Sub-heads (Quota: 3)</span>
                        </span>
                        <span className="text-[10px] text-[#8B93A7] font-semibold">
                          {dept.sub_head_assigned || 0}/3 Assigned ({safeRemainingSubs} remaining)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {deptSubHeads.map((sub, idx) => {
                          const sName = sub?.assignee_name || 'Unassigned';
                          const sInit = sName.trim().charAt(0) || 'S';
                          return (
                            <div
                              key={sub.task_id || idx}
                              className="p-2.5 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[#16856B]/20 text-[#16856B] flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {sInit}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-[#171A2B] truncate">{sName}</div>
                                  <div className="text-[10.5px] text-[#687086] truncate">{sub?.task_title || 'Sub-head Sprint'}</div>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#16856B]/15 text-[#16856B] shrink-0">
                                Sub-head #{idx + 1}
                              </span>
                            </div>
                          );
                        })}

                        {/* Open sub-head slots indicator */}
                        {Array.from({ length: safeRemainingSubs }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOpenAssignModal(dept.department, 'Sub-head')}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-[#E7E9F1] hover:border-[#16856B] text-[11px] font-semibold text-[#8B93A7] hover:text-[#16856B] hover:bg-[#16856B]/5 transition-all flex items-center justify-between"
                          >
                            <span>+ Open Sub-head Slot #{(dept.sub_head_assigned || 0) + idx + 1}</span>
                            <span className="text-[10px] text-[#A6ACBE]">Quota: 3 max</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Volunteers Section */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#171A2B] mb-2">
                        <span className="flex items-center gap-1.5 text-[#C97A16]">
                          <HeartHandshake className="w-3.5 h-3.5 text-[#C97A16]" />
                          <span>Volunteers Team</span>
                        </span>
                        <span className="text-[10px] text-[#8B93A7] font-semibold">
                          {dept.volunteers.length} Active Volunteers
                        </span>
                      </div>

                      {dept.volunteers.length === 0 ? (
                        <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] text-center text-[11px] text-[#8B93A7]">
                          No general volunteers assigned to {dept.department} yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {dept.volunteers.map((vol, idx) => (
                            <div
                              key={vol.task_id || idx}
                              className="p-2 rounded-lg bg-white border border-[#E7E9F1] flex items-center justify-between text-[11px]"
                            >
                              <span className="font-semibold text-[#171A2B] truncate">{vol.assignee_name}</span>
                              <span className="text-[10px] text-[#687086] truncate max-w-[150px]">{vol.task_title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-3 bg-[#F7F8FC] border-t border-[#E7E9F1] flex items-center justify-between text-[11px]">
                    <span className="text-[#687086]">
                      Department Health: {hasHead && dept.sub_head_assigned >= 1 ? '🟢 Ready' : '🟡 Recruiting'}
                    </span>
                    <button
                      onClick={() => handleOpenAssignModal(dept.department, 'Volunteer')}
                      className="text-[#625BF6] hover:underline font-semibold"
                    >
                      + Add Member
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Assign Person to Department */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#625BF6]" />
                  <span>Assign Department Role</span>
                </h3>
                <button onClick={() => setAssignModalOpen(false)} className="text-[#687086] hover:text-[#171A2B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Target Event *</label>
                  <select
                    value={modalForm.event_id}
                    onChange={(e) => {
                      const newEvent = e.target.value;
                      setModalForm({ ...modalForm, event_id: newEvent, assignee_name: '' });
                      fetchAvailableVolunteers(newEvent, modalForm.department);
                    }}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  >
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
                      value={modalForm.department}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        setModalForm({ ...modalForm, department: newDept, assignee_name: '' });
                        fetchAvailableVolunteers(modalForm.event_id, newDept);
                      }}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      {Object.keys(DEPT_ICONS).map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Role (Quota Capped) *</label>
                    <select
                      value={modalForm.assignment_role}
                      onChange={(e) => setModalForm({ ...modalForm, assignment_role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      <option
                        value="Head"
                        disabled={modalRemainingHeads === 0 && modalForm.assignment_role !== 'Head'}
                      >
                        Head ({modalRemainingHeads} remaining / max 1) {modalRemainingHeads === 0 ? '• Filled' : ''}
                      </option>
                      <option
                        value="Sub-head"
                        disabled={modalRemainingSubHeads === 0 && modalForm.assignment_role !== 'Sub-head'}
                      >
                        Sub-head ({modalRemainingSubHeads} remaining / max 3) {modalRemainingSubHeads === 0 ? '• Filled' : ''}
                      </option>
                      <option value="Volunteer">
                        Volunteer (Flexible / Open)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Live Quota Status Banner in Modal */}
                <div className="p-2.5 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#171A2B]">{modalForm.department}:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${modalRemainingHeads === 0 ? 'bg-[#D9485F]/15 text-[#D9485F]' : 'bg-[#16856B]/15 text-[#16856B]'}`}>
                      Head: {modalHeadsCount}/1 {modalRemainingHeads === 0 ? '(Filled)' : `(${modalRemainingHeads} left)`}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${modalRemainingSubHeads === 0 ? 'bg-[#D9485F]/15 text-[#D9485F]' : 'bg-[#625BF6]/15 text-[#625BF6]'}`}>
                      Sub-head: {modalSubHeadsCount}/3 {modalRemainingSubHeads === 0 ? '(Filled)' : `(${modalRemainingSubHeads} left)`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-[#171A2B]">
                        Select Volunteer *
                      </label>
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
                        placeholder="e.g. Rahul Sharma"
                        value={modalForm.assignee_name}
                        onChange={(e) =>
                          setModalForm({
                            ...modalForm,
                            assignee_name: e.target.value,
                            assignee_id: '',
                            assignee_email: ''
                          })
                        }
                        className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                      />
                    ) : (() => {
                      const safeVolunteers = Array.isArray(availableVolunteers) ? availableVolunteers.filter(Boolean) : [];
                      const displayVolunteers = safeVolunteers.filter((v) => v.available || v.name === modalForm.assignee_name);
                      const availableCount = displayVolunteers.filter((v) => v.available).length;

                      return (
                        <>
                          <select
                            required
                            value={modalForm.assignee_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matched = displayVolunteers.find((v) => v.name === val);
                              setModalForm({
                                ...modalForm,
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
                            {availableCount} available volunteers eligible for {modalForm.department}
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
                      value={modalForm.due_date}
                      onChange={(e) => setModalForm({ ...modalForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Assigned Sprint Task / Responsibility</label>
                  <input
                    type="text"
                    placeholder="e.g. Brand Assets & Signage Design"
                    value={modalForm.title}
                    onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E7E9F1] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 border rounded-xl text-[#687086] hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white font-semibold rounded-xl"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Assignment'}
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
