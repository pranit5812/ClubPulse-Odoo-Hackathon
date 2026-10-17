import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  AlertCircle,
  Clock,
  Filter,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Coins,
  Box,
  Kanban,
  User,
  MessageSquare,
  Users,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Badge } from '../components/Badge';

export const ActionCenterPage = () => {
  const { token, role } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [actionStatus, setActionStatus] = useState('resolved');
  const [updating, setUpdating] = useState(false);

  // Volunteer Applications state
  const [volunteerApps, setVolunteerApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appActionId, setAppActionId] = useState(null);
  const [appFeedbackMsg, setAppFeedbackMsg] = useState('');

  useEffect(() => {
    fetchActionItems();
    fetchVolunteerApps();
  }, [token]);

  const fetchVolunteerApps = async () => {
    if (!token) return;
    try {
      setLoadingApps(true);
      const res = await fetch('/api/events/volunteer-applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVolunteerApps(data || []);
      }
    } catch (err) {
      console.error('Failed to load volunteer applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleApproveVolunteer = async (appId) => {
    try {
      setAppActionId(appId);
      const res = await fetch(`/api/events/volunteer-applications/${appId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppFeedbackMsg(data.message || 'Volunteer approved successfully!');
        fetchVolunteerApps();
      }
    } catch (err) {
      console.error('Failed to approve volunteer:', err);
    } finally {
      setAppActionId(null);
    }
  };

  const handleRejectVolunteer = async (appId) => {
    try {
      setAppActionId(appId);
      const res = await fetch(`/api/events/volunteer-applications/${appId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAppFeedbackMsg('Volunteer application rejected.');
        fetchVolunteerApps();
      }
    } catch (err) {
      console.error('Failed to reject volunteer:', err);
    } finally {
      setAppActionId(null);
    }
  };

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/action-center/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load action center items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAction = async (itemId) => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/action-center/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: actionStatus,
          resolution_notes: resolutionNotes || undefined,
          assignee_name: assigneeName || undefined
        })
      });
      if (res.ok) {
        setActiveModalItem(null);
        setResolutionNotes('');
        setAssigneeName('');
        fetchActionItems();
      }
    } catch (err) {
      console.error('Failed to update action item:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="critical">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="accent">Medium</Badge>;
      default:
        return <Badge variant="neutral">Low</Badge>;
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'RISK':
        return <ShieldAlert className="w-4 h-4 text-[#D9485F]" />;
      case 'TASK':
        return <Kanban className="w-4 h-4 text-[#625BF6]" />;
      case 'FINANCIAL':
        return <Coins className="w-4 h-4 text-[#C97A16]" />;
      case 'INVENTORY':
        return <Box className="w-4 h-4 text-[#16856B]" />;
      default:
        return <AlertCircle className="w-4 h-4 text-[#687086]" />;
    }
  };

  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

  const filteredItems = (summary?.items || [])
    .filter((item) => {
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'resolved' && b.status !== 'resolved') return 1;
      if (a.status !== 'resolved' && b.status === 'resolved') return -1;
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    });

  return (
    <AppShell pageTitle="Centralized Action Center">
      <div className="space-y-6">
        {/* Header Summary & Stats */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F3F4F8]">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#625BF6]/10 text-[#625BF6]">
                  <CheckSquare className="w-5 h-5" />
                </span>
                <h1 className="text-xl font-extrabold text-[#171A2B] tracking-tight">
                  Executive Action Center
                </h1>
              </div>
              <p className="text-xs text-[#687086] mt-1 max-w-2xl leading-relaxed">
                Consolidated operational inbox aggregating cross-module risks, overdue tasks, pending reimbursement approvals, and low-inventory restock alerts into one prioritized execution dashboard.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchActionItems}
                className="px-3 py-1.5 rounded-xl border border-[#E7E9F1] text-xs font-semibold text-[#171A2B] hover:bg-[#F7F8FC] transition-colors"
              >
                Refresh Queue
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#687086]">
                Total Action Items
              </span>
              <div className="text-2xl font-black text-[#171A2B] mt-1">
                {summary?.total_actions || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#D9485F]/5 border border-[#D9485F]/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9485F]">
                Critical Priority
              </span>
              <div className="text-2xl font-black text-[#D9485F] mt-1">
                {summary?.critical_count || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#C97A16]/5 border border-[#C97A16]/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C97A16]">
                High Priority
              </span>
              <div className="text-2xl font-black text-[#C97A16] mt-1">
                {summary?.high_count || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#16856B]/5 border border-[#16856B]/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#16856B]">
                Resolved / Closed
              </span>
              <div className="text-2xl font-black text-[#16856B] mt-1">
                {summary?.resolved_count || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Volunteer Applications Approval Queue */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#171A2B]">
                    Volunteer Crew Applications
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EEEDFE] text-[#625BF6] border border-[#625BF6]/30">
                    {volunteerApps.filter((a) => a.status === 'pending').length} Pending
                  </span>
                </div>
                <p className="text-xs text-[#687086]">
                  Review students requesting to volunteer for upcoming events. Approving an applicant activates their volunteer privileges (such as Reimbursements) and stops attendee ticket registration for that event.
                </p>
              </div>
            </div>

            <button
              onClick={fetchVolunteerApps}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-[#E7E9F1] text-xs font-semibold text-[#171A2B] hover:bg-[#F7F8FC] transition-colors cursor-pointer"
            >
              Refresh Applications
            </button>
          </div>

          {appFeedbackMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{appFeedbackMsg}</span>
              </div>
              <button onClick={() => setAppFeedbackMsg('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loadingApps ? (
            <div className="py-6 text-center text-xs text-[#687086] animate-pulse">
              Loading volunteer applications...
            </div>
          ) : volunteerApps.length === 0 ? (
            <div className="py-6 text-center rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] text-xs text-[#687086]">
              No volunteer applications submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-[#E7E9F1] border border-[#E7E9F1] rounded-xl overflow-hidden">
              {volunteerApps.map((app) => (
                <div
                  key={app.id}
                  className="p-4 bg-white hover:bg-[#F7F8FC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#171A2B]">
                        {app.user_name}
                      </span>
                      <span className="text-xs text-[#687086]">
                        ({app.user_email})
                      </span>
                      {app.status === 'pending' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Approval
                        </span>
                      ) : app.status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved Volunteer
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          Rejected
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#687086] flex items-center gap-3">
                      <span>
                        Target Event: <strong className="text-[#171A2B]">{app.event_title}</strong>
                      </span>
                      {app.event_date && (
                        <span>• Date: {app.event_date}</span>
                      )}
                      {app.venue && (
                        <span>• Venue: {app.venue}</span>
                      )}
                    </div>

                    {app.reviewed_by && (
                      <div className="text-[11px] text-[#8B93A7]">
                        Reviewed by: {app.reviewed_by}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApproveVolunteer(app.id)}
                          disabled={appActionId === app.id}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{appActionId === app.id ? 'Approving...' : 'Approve Volunteer'}</span>
                        </button>
                        <button
                          onClick={() => handleRejectVolunteer(app.id)}
                          disabled={appActionId === app.id}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : app.status === 'approved' ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Official Crew Member
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">
                        Application Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-[#E7E9F1] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#687086] flex items-center gap-1 mr-2">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </span>
            {['ALL', 'RISK', 'TASK', 'FINANCIAL', 'INVENTORY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filterCategory === cat
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-[#F7F8FC] text-[#687086] hover:bg-[#EEEDFE] hover:text-[#625BF6]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#687086]">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filterSeverity === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-[#D9485F] text-white shadow-xs'
                      : sev === 'HIGH'
                      ? 'bg-[#C97A16] text-white shadow-xs'
                      : 'bg-[#171A2B] text-white'
                    : 'bg-[#F7F8FC] text-[#687086] hover:bg-[#E7E9F1]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#687086]">Status:</span>
            {['ALL', 'open', 'in_progress', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-[#171A2B] text-white'
                    : 'bg-[#F7F8FC] text-[#687086] hover:bg-[#E7E9F1]'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Action Items List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E7E9F1]">
            <div className="animate-spin w-8 h-8 border-3 border-[#625BF6] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs text-[#687086] mt-3">Loading prioritized action queue...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E7E9F1]">
            <CheckCircle2 className="w-10 h-10 text-[#16856B] mx-auto opacity-70" />
            <h3 className="font-bold text-sm text-[#171A2B] mt-2">Zero Outstanding Actions</h3>
            <p className="text-xs text-[#687086] mt-1">All operational items under current filter are mitigated.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isResolved = item.status === 'resolved';
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    isResolved
                      ? 'border-[#E7E9F1] opacity-70'
                      : item.severity === 'CRITICAL'
                      ? 'border-[#D9485F]/40 shadow-xs'
                      : 'border-[#E7E9F1] hover:border-[#625BF6]/40 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] shrink-0 mt-0.5">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-sm text-[#171A2B]">{item.title}</h3>
                          {getSeverityBadge(item.severity)}
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'resolved'
                                ? 'bg-[#16856B]/10 text-[#16856B]'
                                : item.status === 'in_progress'
                                ? 'bg-[#C97A16]/10 text-[#C97A16]'
                                : 'bg-[#625BF6]/10 text-[#625BF6]'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>

                        <p className="text-xs text-[#687086] mt-1.5 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Evidence & Details Pill */}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#687086]">
                          {item.due_date && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-[#C97A16]" />
                              <span>Due: {item.due_date.split('T')[0]}</span>
                            </span>
                          )}
                          {item.assignee_name && (
                            <span className="flex items-center gap-1 font-medium">
                              <User className="w-3 h-3 text-[#625BF6]" />
                              <span>Owner: {item.assignee_name}</span>
                            </span>
                          )}
                          {item.resolution_notes && (
                            <span className="flex items-center gap-1 text-[#16856B] font-medium">
                              <MessageSquare className="w-3 h-3" />
                              <span>Note: {item.resolution_notes}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Button Group */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                      <button
                        onClick={() => navigate(item.target_route)}
                        className="px-3 py-1.5 rounded-xl border border-[#E7E9F1] text-xs font-semibold text-[#171A2B] hover:bg-[#F7F8FC] flex items-center gap-1 transition-colors"
                        title="Open specific module workspace"
                      >
                        <span>Workspace</span>
                        <ExternalLink className="w-3 h-3 text-[#687086]" />
                      </button>

                      <button
                        onClick={() => {
                          setActiveModalItem(item);
                          setActionStatus(item.status === 'open' ? 'in_progress' : 'resolved');
                          setResolutionNotes(item.resolution_notes || '');
                          setAssigneeName(item.assignee_name || '');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#625BF6] text-white text-xs font-semibold hover:bg-[#5048E5] transition-colors shadow-xs"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Status Update / Resolution */}
        {activeModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E7E9F1] animate-in zoom-in-95 duration-100">
              <h3 className="font-extrabold text-base text-[#171A2B]">
                Update Action Item
              </h3>
              <p className="text-xs text-[#687086] mt-1">{activeModalItem.title}</p>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-[#171A2B] mb-1">
                    Set Status
                  </label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:outline-hidden focus:border-[#625BF6]"
                  >
                    <option value="open">Open (Unassigned)</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved / Mitigated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171A2B] mb-1">
                    Assignee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Rohan Deshmukh (Lead Organizer)"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:outline-hidden focus:border-[#625BF6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171A2B] mb-1">
                    Resolution Notes & Mitigation Audit
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain steps taken to mitigate this operational bottleneck..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:outline-hidden focus:border-[#625BF6]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#687086] hover:bg-[#F7F8FC]"
                >
                  Cancel
                </button>
                <button
                  disabled={updating}
                  onClick={() => handleUpdateAction(activeModalItem.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#625BF6] hover:bg-[#5048E5] transition-colors"
                >
                  {updating ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
