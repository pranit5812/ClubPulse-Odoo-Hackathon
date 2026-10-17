import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Mail,
  ShieldCheck,
  AlertCircle,
  Users,
  RefreshCw,
  Check,
  X,
  Kanban,
  Plus,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const VolunteerRegistrationsPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [notice, setNotice] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const DEPARTMENTS = [
    'Operations',
    'Logistics',
    'Technical',
    'Branding',
    'Public Relations',
    'Food & Beverages',
    'Decorations & Stage',
    'Hospitality'
  ];

  // Task Creation Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    event_id: '',
    department: 'Operations',
    assignment_role: 'Volunteer',
    assignee_name: '',
    assignee_id: '',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    priority: 'medium',
    is_critical_path: false,
    status: 'todo'
  });

  const showToast = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appsData, eventsData] = await Promise.all([
        api.get('/api/events/volunteer-applications').catch(() => []),
        api.get('/api/events').catch(() => [])
      ]);
      setApplications(appsData || []);
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Failed to load volunteer applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id, studentName, eventTitle) => {
    setProcessingId(id);
    try {
      await api.post(`/api/events/volunteer-applications/${id}/approve`);
      showToast(`Approved ${studentName} as volunteer for "${eventTitle}".`, 'success');
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'approved', reviewed_by: user?.full_name || 'Admin' } : app))
      );
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, studentName) => {
    setProcessingId(id);
    try {
      await api.post(`/api/events/volunteer-applications/${id}/reject`);
      showToast(`Rejected volunteer application for ${studentName}.`, 'warning');
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'rejected', reviewed_by: user?.full_name || 'Admin' } : app))
      );
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenCreateTask = (presetVolunteer = null) => {
    setTaskForm({
      title: '',
      description: '',
      event_id: presetVolunteer?.event_id || (events[0]?.id || ''),
      department: 'Operations',
      assignment_role: 'Volunteer',
      assignee_name: presetVolunteer?.user_name || '',
      assignee_id: presetVolunteer?.user_id || '',
      assignee_email: presetVolunteer?.user_email || '',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      priority: 'medium',
      is_critical_path: false,
      status: 'todo'
    });
    setTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      showToast('Task title is required.', 'error');
      return;
    }
    setTaskSubmitting(true);
    try {
      await api.post('/api/tasks', {
        title: taskForm.title.trim(),
        description: taskForm.description || '',
        event_id: taskForm.event_id || null,
        department: taskForm.department || 'Operations',
        assignment_role: taskForm.assignment_role || 'Volunteer',
        assignee_name: taskForm.assignee_name || null,
        assignee_id: taskForm.assignee_id || null,
        assignee_email: taskForm.assignee_email || null,
        due_date: taskForm.due_date,
        priority: taskForm.priority,
        is_critical_path: taskForm.is_critical_path,
        status: 'todo'
      });
      showToast(`Task '${taskForm.title}' created & assigned successfully!`, 'success');
      setTaskModalOpen(false);
    } catch (err) {
      showToast(`Task creation failed: ${err.message}`, 'error');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      (app.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.user_roll || '').toLowerCase().includes(search.toLowerCase()) ||
      (app.event_title || '').toLowerCase().includes(search.toLowerCase());

    const matchesEvent = eventFilter === 'all' || app.event_id === eventFilter;
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesEvent && matchesStatus;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const approvedVolunteersList = applications.filter((a) => a.status === 'approved');

  return (
    <DashboardLayout pageTitle="Volunteer Registrations & Selection">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Toast Alert */}
        {notice && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : notice.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notice.msg}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Chapter Volunteer Management</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Volunteer Registrations
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Select and approve student volunteer applicants, then create and assign operational tasks.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Create Task Action Button */}
            <button
              onClick={() => handleOpenCreateTask(null)}
              className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold shadow-md shadow-[#625BF6]/25 flex items-center gap-1.5 transition-all transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Volunteer Task</span>
            </button>

            {/* Link to Kanban Task Board */}
            <Link
              to="/organizer/tasks"
              className="px-3.5 py-2 rounded-xl border border-[#E7E9F1] bg-white hover:bg-[#F7F8FC] text-xs font-semibold text-[#171A2B] flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Open full Sprint & Volunteer Task Board"
            >
              <Kanban className="w-3.5 h-3.5 text-[#625BF6]" />
              <span>Task Board</span>
            </Link>

            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-[#E7E9F1] bg-white hover:bg-[#F7F8FC] text-xs font-semibold text-[#171A2B] flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#E7E9F1] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#8B93A7] uppercase tracking-wider">
              Total Applicants
            </span>
            <div className="text-2xl font-black text-[#171A2B] mt-1">
              {applications.length}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Selection</span>
            </span>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {pendingCount}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved Volunteers</span>
            </span>
            <div className="text-2xl font-black text-emerald-900 mt-1">
              {approvedCount}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E7E9F1] shadow-2xs">
            <span className="text-[11px] font-semibold text-[#8B93A7] uppercase tracking-wider">
              Declined
            </span>
            <div className="text-2xl font-black text-[#687086] mt-1">
              {rejectedCount}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E9F1] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-[#8B93A7] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Event Filter */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] font-semibold focus:outline-none"
            >
              <option value="all">All Events ({events.length})</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-[#F7F8FC] p-1 rounded-xl border border-[#E7E9F1]">
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-[#171A2B] text-white shadow-2xs'
                      : 'text-[#687086] hover:text-[#171A2B]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Volunteer Registrations Table */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={6} />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={UserCheck}
                title="No volunteer applications found"
                description={
                  statusFilter === 'pending'
                    ? 'No pending applications awaiting review.'
                    : 'Try clearing your search or event filter criteria.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Student Details</th>
                    <th className="py-3.5 px-4">Event Applied For</th>
                    <th className="py-3.5 px-4">Applied Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Selection & Task Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#171A2B] flex items-center gap-2">
                          <span>{app.user_name}</span>
                          {app.user_roll && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#EEEDFE] text-[#625BF6]">
                              {app.user_roll}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#687086] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-[#8B93A7]" />
                          <span>{app.user_email}</span>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#171A2B]">
                          {app.event_title}
                        </div>
                        <div className="text-[11px] text-[#8B93A7] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{app.event_date ? app.event_date.slice(0, 10) : 'TBD'}</span>
                          {app.venue && (
                            <>
                              <span className="mx-1">•</span>
                              <MapPin className="w-3 h-3" />
                              <span>{app.venue}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 text-[#687086]">
                        {app.created_at ? app.created_at.slice(0, 10) : 'Recent'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            app.status === 'approved'
                              ? 'positive'
                              : app.status === 'rejected'
                              ? 'critical'
                              : 'warning'
                          }
                        >
                          {app.status === 'pending' ? 'Pending Review' : app.status}
                        </Badge>
                        {app.reviewed_by && (
                          <div className="text-[10px] text-[#8B93A7] mt-0.5">
                            By: {app.reviewed_by}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {app.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(app.id, app.user_name, app.event_title)}
                              disabled={processingId === app.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Approve as volunteer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Select / Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(app.id, app.user_name)}
                              disabled={processingId === app.id}
                              className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Decline application"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : app.status === 'approved' ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Confirmed</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenCreateTask(app)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#EEEDFE] hover:bg-[#625BF6] text-[#625BF6] hover:text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title={`Create and assign task to ${app.user_name}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Assign Task</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApprove(app.id, app.user_name, app.event_title)}
                            disabled={processingId === app.id}
                            className="px-2.5 py-1 rounded-lg border border-[#E7E9F1] hover:border-emerald-600 text-xs text-[#687086] hover:text-emerald-700 transition-colors"
                          >
                            Re-approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Create & Assign Volunteer Task */}
        {taskModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#17182B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E7E9F1] space-y-4 animate-in fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F1]">
                <div>
                  <h3 className="text-lg font-bold text-[#171A2B] flex items-center gap-2">
                    <Kanban className="w-5 h-5 text-[#625BF6]" />
                    <span>Create & Assign Volunteer Task</span>
                  </h3>
                  <p className="text-xs text-[#687086] mt-0.5">
                    Assign responsibilities to student volunteers for event execution.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#8B93A7] hover:text-[#171A2B] hover:bg-[#F0F2F7]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
                {/* Task Title */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stage Setup & Audio Check"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Description & Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide specific guidelines, location, or checkpoints..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                {/* Associated Event */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Associated Event
                  </label>
                  <select
                    value={taskForm.event_id}
                    onChange={(e) => setTaskForm({ ...taskForm, event_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  >
                    <option value="">General Club Operations</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.event_date ? ev.event_date.slice(0, 10) : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Department */}
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Department *
                    </label>
                    <select
                      value={taskForm.department}
                      onChange={(e) => setTaskForm({ ...taskForm, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignment Role */}
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Assignment Role
                    </label>
                    <select
                      value={taskForm.assignment_role}
                      onChange={(e) => setTaskForm({ ...taskForm, assignment_role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    >
                      <option value="Volunteer">Volunteer</option>
                      <option value="Sub-head">Sub-head</option>
                      <option value="Head">Department Head</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Assignee Volunteer */}
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Assignee Volunteer
                    </label>
                    {approvedVolunteersList.length > 0 ? (
                      <select
                        value={taskForm.assignee_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = approvedVolunteersList.find((v) => v.user_name === val);
                          setTaskForm({
                            ...taskForm,
                            assignee_name: val,
                            assignee_id: found ? found.user_id : '',
                            assignee_email: found ? found.user_email : ''
                          });
                        }}
                        className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                      >
                        <option value="">Unassigned / Open</option>
                        {approvedVolunteersList.map((vol) => (
                          <option key={vol.id} value={vol.user_name}>
                            {vol.user_name} ({vol.user_roll || vol.user_email})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Rohit Verma"
                        value={taskForm.assignee_name}
                        onChange={(e) =>
                          setTaskForm({
                            ...taskForm,
                            assignee_name: e.target.value,
                            assignee_id: '',
                            assignee_email: ''
                          })
                        }
                        className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                      />
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  {/* Priority */}
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">
                      Priority Level
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Critical Path Checkbox */}
                  <div className="pt-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={taskForm.is_critical_path}
                        onChange={(e) => setTaskForm({ ...taskForm, is_critical_path: e.target.checked })}
                        className="w-4 h-4 rounded text-[#625BF6] focus:ring-[#625BF6]"
                      />
                      <span className="font-semibold text-[#171A2B]">Critical Path Item</span>
                    </label>
                    <span className="text-[10px] text-[#8B93A7] block mt-0.5">
                      Monitored by Risk Engine
                    </span>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-3 border-t border-[#E7E9F1] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskModalOpen(false)}
                    className="px-4 py-2 border rounded-xl border-[#E7E9F1] text-[#687086] hover:text-[#171A2B] font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={taskSubmitting}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-[#625BF6]/25 transition-all cursor-pointer"
                  >
                    <span>{taskSubmitting ? 'Creating Task...' : 'Create & Assign Task'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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

export default VolunteerRegistrationsPage;
