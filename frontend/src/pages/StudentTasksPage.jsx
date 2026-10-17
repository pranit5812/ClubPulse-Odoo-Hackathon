import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const StudentTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await api.get(`/api/tasks?assignee_id=${user?.id}`);
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to load student tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await api.patch(`/api/tasks/${task.id}`, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      alert(`Could not update task: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Volunteer Milestones</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
            My Assigned Volunteer Tasks
          </h1>
          <p className="text-xs text-[#687086] mt-1">
            Check off your operational duties for chapter hackathons, logistics setups, and lab equipment.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-24 animate-pulse border border-[#E7E9F1]"></div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-[#E7E9F1]">
            <EmptyState
              icon={CheckCircle2}
              title="All clear! No pending tasks"
              description="You currently have no volunteer responsibilities assigned."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isDone = task.status === 'done';
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-2xs flex items-center justify-between gap-4 ${
                    isDone ? 'border-[#16856B]/30 bg-[#16856B]/5' : 'border-[#E7E9F1] hover:border-[#625BF6]/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task)}
                      className={`w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                        isDone
                          ? 'bg-[#16856B] border-[#16856B] text-white'
                          : 'border-[#E7E9F1] hover:border-[#625BF6] bg-white'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm font-bold ${isDone ? 'line-through text-[#687086]' : 'text-[#171A2B]'}`}>
                          {task.title}
                        </h3>
                        {task.is_critical_path && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#D9485F]/10 text-[#D9485F] border border-[#D9485F]/20">
                            Critical Path
                          </span>
                        )}
                        <Badge variant={task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'warning' : 'neutral'}>
                          {task.priority}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#687086] max-w-xl">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-[#687086] pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#687086]" />
                          Due: {task.due_date}
                        </span>
                        {task.event_title && (
                          <span>Event: <strong className="text-[#171A2B]">{task.event_title}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge variant={isDone ? 'active' : 'neutral'}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
