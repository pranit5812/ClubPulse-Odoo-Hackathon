import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Users,
  Ticket,
  Kanban,
  Box,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Info
} from 'lucide-react';
import { Badge } from '../components/Badge';

export const EventReadinessPage = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [readinessDetail, setReadinessDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchEventsSummary();
  }, [token]);

  const fetchEventsSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/readiness/events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].event_id);
          fetchEventDetail(data[0].event_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events readiness:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetail = async (eventId) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/readiness/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReadinessDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch event readiness detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectEvent = (id) => {
    setSelectedEventId(id);
    fetchEventDetail(id);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[#16856B] bg-[#16856B]/10 border-[#16856B]/30';
    if (score >= 50) return 'text-[#C97A16] bg-[#C97A16]/10 border-[#C97A16]/30';
    return 'text-[#D9485F] bg-[#D9485F]/10 border-[#D9485F]/30';
  };

  const getStatusBadge = (status) => {
    if (status === 'ready' || status === 'optimal') {
      return <Badge variant="positive">Optimal / Ready</Badge>;
    }
    if (status === 'attention_required' || status === 'warning') {
      return <Badge variant="warning">Attention Needed</Badge>;
    }
    if (status === 'missing_data') {
      return <Badge variant="neutral">Data Incomplete</Badge>;
    }
    return <Badge variant="critical">At Risk</Badge>;
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'financial':
        return <Coins className="w-4 h-4 text-[#C97A16]" />;
      case 'volunteers':
        return <Users className="w-4 h-4 text-[#625BF6]" />;
      case 'capacity':
        return <Ticket className="w-4 h-4 text-[#16856B]" />;
      case 'tasks':
        return <Kanban className="w-4 h-4 text-[#3B82F6]" />;
      case 'resources':
        return <Box className="w-4 h-4 text-[#8B5CF6]" />;
      default:
        return <Activity className="w-4 h-4 text-[#687086]" />;
    }
  };

  return (
    <AppShell pageTitle="Event Operational Readiness Engine">
      <div className="space-y-6">
        {/* Header Overview Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#625BF6]/10 text-[#625BF6]">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-extrabold text-[#171A2B] tracking-tight">
                Deterministic Event Readiness Engine
              </h1>
            </div>
            <p className="text-xs text-[#687086] mt-1 max-w-2xl leading-relaxed">
              Evaluating multi-vector event preparedness across budget limits, volunteer coverage, ticket registration velocity, overdue critical milestones, and physical resources before gates open.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#687086]">Formula:</span>
            <div className="text-[11px] font-mono bg-[#F7F8FC] border border-[#E7E9F1] px-2.5 py-1.5 rounded-lg text-[#171A2B]">
              0.25*Fin + 0.25*Vol + 0.20*Cap + 0.20*Tasks + 0.10*Res
            </div>
          </div>
        </div>

        {/* Event Selectors Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {events.map((ev) => {
            const isSelected = ev.event_id === selectedEventId;
            return (
              <div
                key={ev.event_id}
                onClick={() => handleSelectEvent(ev.event_id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-[#625BF6] shadow-md ring-2 ring-[#625BF6]/10'
                    : 'bg-white/80 border-[#E7E9F1] hover:border-[#625BF6]/50 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-bold text-sm text-[#171A2B] truncate">{ev.event_title}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#687086] mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ev.days_remaining > 0 ? `In ${ev.days_remaining} days` : 'Today'}</span>
                      <span>•</span>
                      <span>{ev.event_date.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl text-sm font-extrabold border shrink-0 ${getScoreColor(ev.overall_readiness_score)}`}>
                    {ev.overall_readiness_score}/100
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#F3F4F8]">
                  {getStatusBadge(ev.overall_status)}
                  {ev.critical_blockers_count > 0 && (
                    <span className="text-[11px] font-bold text-[#D9485F] flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>{ev.critical_blockers_count} Blocker</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Event Detail View */}
        {detailLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E7E9F1]">
            <div className="animate-spin w-8 h-8 border-3 border-[#625BF6] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs text-[#687086] mt-3">Evaluating real-time operational records...</p>
          </div>
        ) : readinessDetail ? (
          <div className="space-y-6">
            {/* Critical Blockers Alert if any */}
            {readinessDetail.critical_blockers_count > 0 && (
              <div className="p-4 rounded-2xl bg-[#D9485F]/10 border border-[#D9485F]/30 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#D9485F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-extrabold text-[#D9485F]">
                    {readinessDetail.critical_blockers_count} Critical Blocker(s) Preventing Event Readiness
                  </h4>
                  <ul className="mt-1 list-disc list-inside text-xs text-[#171A2B] space-y-0.5">
                    {readinessDetail.category_scores
                      .flatMap((c) => c.blockers)
                      .map((b, idx) => (
                        <li key={idx} className="font-medium">
                          {b}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Score Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#F3F4F8]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#171A2B]">{readinessDetail.event_title}</h2>
                    {getStatusBadge(readinessDetail.overall_status)}
                  </div>
                  <p className="text-xs text-[#687086] mt-1">
                    Venue: {readinessDetail.venue} • Target Date: {readinessDetail.event_date} • Countdown: {readinessDetail.days_remaining} days
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-[#687086] font-semibold">Overall Readiness Score</div>
                    <div className="text-2xl font-black text-[#171A2B]">
                      {readinessDetail.overall_readiness_score}
                      <span className="text-xs font-normal text-[#8B93A7]">/100</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-[#F7F8FC] border border-[#E7E9F1] flex items-center justify-center">
                    <span className={`text-xl font-black ${getScoreColor(readinessDetail.overall_readiness_score).split(' ')[0]}`}>
                      {readinessDetail.overall_readiness_score}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Breakdown */}
              <div className="mt-5 space-y-2">
                <div className="h-3 w-full bg-[#F3F4F8] rounded-full overflow-hidden flex">
                  {readinessDetail.category_scores.map((cat) => (
                    <div
                      key={cat.category}
                      style={{ width: `${cat.score * cat.weight}%` }}
                      className={`h-full transition-all ${
                        cat.status === 'optimal'
                          ? 'bg-[#16856B]'
                          : cat.status === 'warning'
                          ? 'bg-[#C97A16]'
                          : cat.status === 'missing_data'
                          ? 'bg-[#8B93A7]'
                          : 'bg-[#D9485F]'
                      }`}
                      title={`${cat.title}: ${cat.score}/100`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#687086]">
                  <span>Weighted composition based on financial stability, staff coverage, and capacity metrics</span>
                  <span>Evaluated: {new Date(readinessDetail.evaluated_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readinessDetail.category_scores.map((cat) => (
                <div
                  key={cat.category}
                  className="bg-white rounded-2xl p-5 border border-[#E7E9F1] shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
                          {getCategoryIcon(cat.category)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#171A2B]">{cat.title}</h4>
                          <span className="text-[10px] text-[#687086] font-semibold">Weight: {cat.weight * 100}%</span>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${getScoreColor(cat.score)}`}>
                        {cat.score}
                      </div>
                    </div>

                    <div className="mb-3">{getStatusBadge(cat.status)}</div>

                    {/* Blockers */}
                    {cat.blockers.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-[#D9485F]/5 border border-[#D9485F]/20 mb-3 text-xs text-[#D9485F]">
                        <span className="font-bold">Blocker: </span>
                        {cat.blockers.join('; ')}
                      </div>
                    )}

                    {/* Evidence Data Pill List */}
                    <div className="space-y-1 mb-3 bg-[#F7F8FC] p-2.5 rounded-xl text-[11px]">
                      <div className="text-[10px] font-bold text-[#687086] uppercase tracking-wider mb-1">
                        Traceable Evidence
                      </div>
                      {Object.entries(cat.evidence).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[#171A2B]">
                          <span className="capitalize text-[#687086]">{k.replace(/_/g, ' ')}:</span>
                          <span className="font-mono font-semibold">
                            {typeof v === 'number' && k.includes('paise') ? `₹${(v / 100).toFixed(0)}` : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="pt-3 border-t border-[#F3F4F8] text-[11px] text-[#625BF6] font-semibold flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 shrink-0" />
                    <span>{cat.recommended_action}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Countdown Milestone Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#625BF6]" />
                  <h3 className="font-extrabold text-sm text-[#171A2B]">
                    Critical Path & Milestones Timeline
                  </h3>
                </div>
                <span className="text-xs text-[#687086]">
                  {readinessDetail.timeline.length} Total Deliverables
                </span>
              </div>

              <div className="divide-y divide-[#F3F4F8]">
                {readinessDetail.timeline.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.status === 'done'
                            ? 'bg-[#16856B]'
                            : item.status === 'overdue'
                            ? 'bg-[#D9485F]'
                            : 'bg-[#C97A16]'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#171A2B] truncate flex items-center gap-2">
                          <span>{item.title}</span>
                          {item.is_critical_path && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-md bg-[#D9485F]/10 text-[#D9485F]">
                              Critical Path
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#687086] mt-0.5">
                          Due: {item.due_date.split('T')[0]} • Assignee: {item.assignee_name || 'Unassigned'}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Badge
                        variant={
                          item.status === 'done'
                            ? 'positive'
                            : item.status === 'overdue'
                            ? 'critical'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
};
