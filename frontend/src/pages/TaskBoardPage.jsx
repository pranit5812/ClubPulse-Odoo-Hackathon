import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Kanban,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  User,
  X,
  Clock,
  ArrowRight,
  Edit2,
  Filter,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const TaskBoardPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

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

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Available Volunteers state
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [customNameMode, setCustomNameMode] = useState(false);

  // Form states
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    event_id: '',
    department: 'Branding',
    assignment_role: 'Volunteer',
    assignee_name: '',
    assignee_id: '',
    assignee_email: '',
    due_date: new Date().toISOString().slice(0, 10),
    priority: 'medium',
    is_critical_path: false,
    status: 'todo'
  });
  const [submitting, setSubmitting] = useState(false);

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

  const fetchTasksAndEvents = async () => {
    try {
      setLoading(true);
      const [tskRes, evRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/events')
      ]);
      setTasks(tskRes || []);
      setEvents(evRes || []);
    } catch (err) {
      console.error('Failed to load task board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndEvents();
  }, []);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
      fetchTasksAndEvents();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tasks', {
        title: formState.title,
        description: formState.description || '',
        event_id: formState.event_id || null,
        department: formState.department || 'Operations',
        assignment_role: formState.assignment_role || 'Volunteer',
        assignee_name: formState.assignee_name || null,
        assignee_id: formState.assignee_id || null,
        assignee_email: formState.assignee_email || null,
        due_date: formState.due_date,
        priority: formState.priority,
        is_critical_path: formState.is_critical_path,
        status: 'todo'
      });
      setCreateModalOpen(false);
      fetchTasksAndEvents();
    } catch (err) {
      alert(`Task creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setFormState({
      title: task.title || '',
      description: task.description || '',
      event_id: task.event_id || '',
      department: task.department || 'Operations',
      assignment_role: task.assignment_role || 'Volunteer',
      assignee_name: task.assignee_name || '',
      assignee_id: task.assignee_id || '',
      assignee_email: task.assignee_email || '',
      due_date: task.due_date || new Date().toISOString().slice(0, 10),
      priority: task.priority || 'medium',
      is_critical_path: task.is_critical_path || false,
      status: task.status || 'todo'
    });
    setEditModalOpen(true);
    fetchAvailableVolunteers(task.event_id, task.department);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/tasks/${editingTask.id}`, {
        title: formState.title,
        description: formState.description,
        event_id: formState.event_id || null,
        department: formState.department || 'Operations',
        assignment_role: formState.assignment_role || 'Volunteer',
        assignee_name: formState.assignee_name || null,
        assignee_id: formState.assignee_id || null,
        assignee_email: formState.assignee_email || null,
        due_date: formState.due_date,
        priority: formState.priority,
        is_critical_path: formState.is_critical_path,
        status: formState.status
      });
      setEditModalOpen(false);
      fetchTasksAndEvents();
    } catch (err) {
      alert(`Task update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Quota calculation for modal
  const currentModalDeptTasks = tasks.filter(
    (t) => (!formState.event_id || t.event_id === formState.event_id) &&
           (t.department || 'Operations').toLowerCase() === (formState.department || 'Branding').toLowerCase() &&
           (!editingTask || t.id !== editingTask.id)
  );
  const modalHeadsCount = currentModalDeptTasks.filter((t) => t.assignment_role === 'Head').length;
  const modalSubHeadsCount = currentModalDeptTasks.filter((t) => t.assignment_role === 'Sub-head').length;
  const modalRemainingHeads = Math.max(0, 1 - modalHeadsCount);
  const modalRemainingSubHeads = Math.max(0, 3 - modalSubHeadsCount);

  // Filter tasks by selected event
  const filteredTasks = tasks.filter((t) => {
    if (selectedEventFilter === 'ALL') return true;
    return t.event_id === selectedEventFilter;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done' || t.status === 'completed');

  return (
    <DashboardLayout pageTitle="Sprint & Volunteer Task Board">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Kanban className="w-3.5 h-3.5" />
              <span>Sprint Coordination Board</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Tasks & Volunteer Coordination
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Live status tracking with critical-path flags feeding the Operational Risk Engine and Event Readiness audits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const targetEvent = selectedEventFilter !== 'ALL' ? selectedEventFilter : (events[0]?.id || '');
                setFormState({
                  title: '',
                  description: '',
                  event_id: targetEvent,
                  department: 'Branding',
                  assignment_role: 'Volunteer',
                  assignee_name: '',
                  due_date: new Date().toISOString().slice(0, 10),
                  priority: 'medium',
                  is_critical_path: false,
                  status: 'todo'
                });
                setCreateModalOpen(true);
                fetchAvailableVolunteers(targetEvent, 'Branding');
              }}
              className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sprint Task</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E7E9F1] shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-4 h-4 text-[#687086]" />
            <span className="font-semibold text-[#171A2B]">Filter by Event:</span>
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="px-3 py-1.5 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-xs font-medium text-[#171A2B]"
            >
              <option value="ALL">All Events & General Operations</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-[#687086] flex items-center gap-3">
            <span>Total Tasks: <strong>{filteredTasks.length}</strong></span>
            <span>•</span>
            <span className="text-[#D9485F] font-semibold">
              {filteredTasks.filter((t) => t.is_overdue).length} Overdue
            </span>
            <span>•</span>
            <span className="text-[#625BF6] font-semibold">
              {filteredTasks.filter((t) => t.is_critical_path).length} Critical Path
            </span>
          </div>
        </div>

        {/* 3-Column Kanban Board */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-4 rounded-2xl border border-[#E7E9F1] space-y-3">
                <div className="h-5 bg-[#F7F8FC] rounded-lg animate-pulse" />
                <div className="h-28 bg-[#F7F8FC] rounded-xl animate-pulse" />
                <div className="h-28 bg-[#F7F8FC] rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Column 1: Backlog & Todo */}
            <div className="bg-[#F7F8FC] p-4 rounded-2xl border border-[#E7E9F1] flex flex-col space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between font-bold text-xs text-[#171A2B] uppercase tracking-wider px-1">
                <span>Backlog & To Do</span>
                <span className="bg-white px-2 py-0.5 rounded-full border border-[#E7E9F1] text-[#687086]">
                  {todoTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {todoTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#687086] border border-dashed border-[#E7E9F1] rounded-xl bg-white/50">
                    No tasks in backlog
                  </div>
                ) : (
                  todoTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl border border-[#E7E9F1] shadow-2xs space-y-2.5 hover:border-[#625BF6]/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-[#171A2B] leading-snug">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(task)}
                            className="p-1 text-[#687086] hover:text-[#171A2B] rounded"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <Badge variant={task.priority === 'critical' || task.priority === 'urgent' ? 'critical' : task.priority === 'high' ? 'warning' : 'neutral'}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.department && (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-[#F0F2F7] text-[#474D66] border border-[#E7E9F1]">
                            {task.department}
                          </span>
                        )}
                        {task.assignment_role && (
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            task.assignment_role === 'Head'
                              ? 'bg-[#625BF6]/15 text-[#625BF6] border border-[#625BF6]/30'
                              : task.assignment_role === 'Sub-head'
                              ? 'bg-[#16856B]/15 text-[#16856B] border border-[#16856B]/30'
                              : 'bg-[#C97A16]/15 text-[#C97A16] border border-[#C97A16]/30'
                          }`}>
                            {task.assignment_role}
                          </span>
                        )}
                        {task.is_critical_path && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#D9485F]/10 text-[#D9485F] border border-[#D9485F]/20">
                            Critical Path
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-[#687086] line-clamp-2">{task.description}</p>
                      )}

                      <div className="pt-2 border-t border-[#E7E9F1] flex items-center justify-between text-[10px] text-[#687086]">
                        <span>👤 {task.assignee_name || <em className="text-[#D9485F]">Unassigned</em>}</span>
                        <span className={task.is_overdue ? 'text-[#D9485F] font-bold flex items-center gap-1' : ''}>
                          {task.is_overdue && <AlertTriangle className="w-3 h-3 text-[#D9485F]" />}
                          📅 {task.due_date}
                        </span>
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                        className="w-full mt-1 py-1.5 bg-[#F7F8FC] hover:bg-[#625BF6]/10 hover:text-[#625BF6] text-[#687086] rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Start Working</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="bg-[#F7F8FC] p-4 rounded-2xl border border-[#E7E9F1] flex flex-col space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between font-bold text-xs text-[#171A2B] uppercase tracking-wider px-1">
                <span>In Progress</span>
                <span className="bg-white px-2 py-0.5 rounded-full border border-[#E7E9F1] text-[#687086]">
                  {inProgressTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {inProgressTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#687086] border border-dashed border-[#E7E9F1] rounded-xl bg-white/50">
                    No tasks currently active
                  </div>
                ) : (
                  inProgressTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl border border-[#625BF6]/40 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-[#171A2B] leading-snug">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(task)}
                            className="p-1 text-[#687086] hover:text-[#171A2B] rounded"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <Badge variant={task.priority === 'critical' || task.priority === 'urgent' ? 'critical' : 'warning'}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.department && (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-[#F0F2F7] text-[#474D66] border border-[#E7E9F1]">
                            {task.department}
                          </span>
                        )}
                        {task.assignment_role && (
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            task.assignment_role === 'Head'
                              ? 'bg-[#625BF6]/15 text-[#625BF6] border border-[#625BF6]/30'
                              : task.assignment_role === 'Sub-head'
                              ? 'bg-[#16856B]/15 text-[#16856B] border border-[#16856B]/30'
                              : 'bg-[#C97A16]/15 text-[#C97A16] border border-[#C97A16]/30'
                          }`}>
                            {task.assignment_role}
                          </span>
                        )}
                        {task.is_critical_path && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#D9485F]/10 text-[#D9485F] border border-[#D9485F]/20">
                            Critical Path
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-[#687086] line-clamp-2">{task.description}</p>
                      )}

                      <div className="pt-2 border-t border-[#E7E9F1] flex items-center justify-between text-[10px] text-[#687086]">
                        <span>👤 {task.assignee_name || 'Unassigned'}</span>
                        <span className={task.is_overdue ? 'text-[#D9485F] font-bold' : ''}>
                          📅 {task.due_date}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleUpdateStatus(task.id, 'todo')}
                          className="flex-1 py-1.5 bg-[#F7F8FC] hover:bg-[#E7E9F1] text-[#687086] rounded-lg text-[10px] font-semibold transition-colors"
                        >
                          ← Backlog
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(task.id, 'done')}
                          className="flex-1 py-1.5 bg-[#16856B]/10 hover:bg-[#16856B]/20 text-[#16856B] rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Mark Done ✓
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Done */}
            <div className="bg-[#F7F8FC] p-4 rounded-2xl border border-[#E7E9F1] flex flex-col space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between font-bold text-xs text-[#171A2B] uppercase tracking-wider px-1">
                <span>Completed / Done</span>
                <span className="bg-white px-2 py-0.5 rounded-full border border-[#E7E9F1] text-[#16856B]">
                  {doneTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {doneTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#687086] border border-dashed border-[#E7E9F1] rounded-xl bg-white/50">
                    No completed tasks yet
                  </div>
                ) : (
                  doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl border border-[#16856B]/30 shadow-2xs space-y-2 opacity-85"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-[#171A2B] line-through leading-snug">
                          {task.title}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                      </div>

                      <div className="pt-2 border-t border-[#E7E9F1] flex items-center justify-between text-[10px] text-[#687086]">
                        <span>👤 {task.assignee_name || 'Volunteer'}</span>
                        <button
                          onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                          className="text-[#625BF6] hover:underline font-semibold"
                        >
                          Reopen ↺
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Task Modal */}
        {(createModalOpen || editModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#625BF6]" />
                  <span>{createModalOpen ? 'Create Sprint Task' : 'Edit Sprint Task'}</span>
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

              <form onSubmit={createModalOpen ? handleCreateTask : handleUpdateTask} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Associated Event</label>
                  <select
                    value={formState.event_id}
                    onChange={(e) => {
                      const newEv = e.target.value;
                      setFormState({ ...formState, event_id: newEv, assignee_name: '' });
                      fetchAvailableVolunteers(newEv, formState.department);
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
                      value={formState.department}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        setFormState({ ...formState, department: newDept, assignee_name: '' });
                        fetchAvailableVolunteers(formState.event_id, newDept);
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
                      value={formState.assignment_role}
                      onChange={(e) => setFormState({ ...formState, assignment_role: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      <option
                        value="Head"
                        disabled={modalRemainingHeads === 0 && formState.assignment_role !== 'Head'}
                      >
                        Head ({modalRemainingHeads} remaining / max 1) {modalRemainingHeads === 0 ? '• Filled' : ''}
                      </option>
                      <option
                        value="Sub-head"
                        disabled={modalRemainingSubHeads === 0 && formState.assignment_role !== 'Sub-head'}
                      >
                        Sub-head ({modalRemainingSubHeads} remaining / max 3) {modalRemainingSubHeads === 0 ? '• Filled' : ''}
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
                    <span className="font-semibold text-[#171A2B]">{formState.department}:</span>
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
                        placeholder="e.g. Vikram Malhotra"
                        value={formState.assignee_name}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            assignee_name: e.target.value,
                            assignee_id: '',
                            assignee_email: ''
                          })
                        }
                        className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                      />
                    ) : (() => {
                      const safeVolunteers = Array.isArray(availableVolunteers) ? availableVolunteers.filter(Boolean) : [];
                      const displayVolunteers = safeVolunteers.filter((v) => v.available || v.name === formState.assignee_name);
                      const availableCount = displayVolunteers.filter((v) => v.available).length;

                      return (
                        <>
                          <select
                            value={formState.assignee_name}
                            onChange={(e) => {
                              const selectedVal = e.target.value;
                              const matchedVol = displayVolunteers.find((v) => v.name === selectedVal);
                              setFormState({
                                ...formState,
                                assignee_name: selectedVal,
                                assignee_id: matchedVol ? matchedVol.id : '',
                                assignee_email: matchedVol ? matchedVol.email : ''
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
                            {availableCount} available volunteers eligible for {formState.department}
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
                      value={formState.due_date}
                      onChange={(e) => setFormState({ ...formState, due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Priority</label>
                    <select
                      value={formState.priority}
                      onChange={(e) => setFormState({ ...formState, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  {editModalOpen && (
                    <div>
                      <label className="block font-semibold text-[#171A2B] mb-1">Status</label>
                      <select
                        value={formState.status}
                        onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="critical-path-cb"
                    checked={formState.is_critical_path}
                    onChange={(e) => setFormState({ ...formState, is_critical_path: e.target.checked })}
                    className="rounded text-[#625BF6]"
                  />
                  <label htmlFor="critical-path-cb" className="font-semibold text-[#171A2B] cursor-pointer">
                    Flag as Critical-Path dependency (feeds Operational Risk Engine)
                  </label>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setEditModalOpen(false);
                    }}
                    className="flex-1 py-2.5 border border-[#E7E9F1] text-[#687086] rounded-xl font-semibold hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#625BF6] text-white rounded-xl font-semibold hover:bg-[#5048E5] transition-colors"
                  >
                    {submitting ? 'Saving...' : createModalOpen ? 'Create Task' : 'Update Task'}
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
