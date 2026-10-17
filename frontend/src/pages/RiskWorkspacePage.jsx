import React, { useState, useEffect } from 'react';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Database,
  ArrowRight,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertCircle,
  Network,
  Layers,
  Check,
  Eye,
  MessageSquare
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { RiskAlert } from '../components/RiskAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/Badge';

export const RiskWorkspacePage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('CORRELATED'); // 'CORRELATED' or 'COMPONENT'
  const [riskData, setRiskData] = useState(null);
  const [correlatedData, setCorrelatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [actioningRiskId, setActioningRiskId] = useState(null);

  const fetchAllRiskData = async () => {
    setLoading(true);
    try {
      const [legacyData, corrRes] = await Promise.all([
        api.get('/api/risk/evaluate').catch(() => null),
        fetch('/api/intelligence/risks', {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => (r.ok ? r.json() : null))
      ]);
      setRiskData(legacyData);
      setCorrelatedData(corrRes);
    } catch (err) {
      console.error('Risk data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRiskData();
  }, [token]);

  const handleTakeAction = async (riskId, actionType) => {
    try {
      setActioningRiskId(riskId);
      const res = await fetch(`/api/intelligence/risks/${riskId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionType,
          notes: `Mitigation initiated by officer via Risk Workspace`
        })
      });
      if (res.ok) {
        fetchAllRiskData();
      }
    } catch (err) {
      console.error('Failed to take risk action:', err);
    } finally {
      setActioningRiskId(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[#16856B] border-[#16856B] bg-[#E7F5F0]';
    if (score >= 60) return 'text-[#D98A18] border-[#D98A18] bg-[#FEF7ED]';
    return 'text-[#D9485F] border-[#D9485F] bg-[#FDF2F4]';
  };

  const correlatedRisks = correlatedData?.risks || [];
  const filteredCorrelated = correlatedRisks.filter((r) => {
    if (filterSeverity === 'ALL') return true;
    return r.severity === filterSeverity;
  });

  return (
    <DashboardLayout
      pageTitle="Operational Risk Engine"
      breadcrumbs={[{ label: 'Intelligence' }, { label: 'Risk Engine' }]}
    >
      <div className="space-y-6">
        {/* Command Center Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#17182B] text-white border border-[#23253E] shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9485F]/20 border border-[#D9485F]/40 text-xs font-semibold text-[#FACED5]">
                <Network className="w-3.5 h-3.5 text-[#D9485F] animate-pulse" />
                <span>Phase 4: Cross-Module Connected Intelligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Live Cross-Module Risk Correlation
              </h1>
              <p className="text-xs sm:text-sm text-[#A6ACBE] leading-relaxed">
                Evaluating emergent compound risks across the entire organization. Automatically detects when high ticket volume clashes with unstaffed volunteer rosters or when merch preorders exceed supplier stock.
              </p>
            </div>

            {/* Score Ring */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-[#23253E] border border-[#2D304E] shrink-0">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#A6ACBE] mb-1">
                  Readiness Index
                </div>
                <div
                  className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-extrabold ${getScoreColor(
                    correlatedData?.readiness_index || 85
                  )}`}
                >
                  <span className="text-2xl tracking-tight">
                    {correlatedData?.readiness_index ?? '--'}
                  </span>
                  <span className="text-[9px] font-medium opacity-80">/ 100</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#A6ACBE]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#FACED5] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9485F]"></span>
                    Critical:
                  </span>
                  <strong className="text-white">{correlatedData?.total_critical ?? 0}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#FCE3BF] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D98A18]"></span>
                    High:
                  </span>
                  <strong className="text-white">{correlatedData?.total_high ?? 0}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#BCE4D7] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16856B]"></span>
                    Medium:
                  </span>
                  <strong className="text-white">{correlatedData?.total_medium ?? 0}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Formula Transparency */}
          <div className="mt-5 pt-4 border-t border-[#24263F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#A6ACBE]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#625BF6]" />
              <span>
                <strong>Correlation Formula:</strong>{' '}
                {correlatedData?.formula_text ||
                  'Readiness = max(10, 100 - (Critical*25 + High*12 + Medium*5 + Low*2)). Traceable to live collections.'}
              </span>
            </div>

            <button
              onClick={fetchAllRiskData}
              disabled={loading}
              className="px-3 py-1.5 bg-[#23253E] hover:bg-[#2D304E] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-Evaluate Engine</span>
            </button>
          </div>
        </div>

        {/* Workspace Tab Switcher */}
        <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('CORRELATED')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CORRELATED'
                  ? 'bg-[#625BF6] text-white shadow-xs'
                  : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Cross-Module Correlations</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {correlatedRisks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COMPONENT')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'COMPONENT'
                  ? 'bg-[#625BF6] text-white shadow-xs'
                  : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Single-Module Rules</span>
            </button>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterSeverity === sev
                    ? 'bg-[#171A2B] text-white'
                    : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Correlated Cross-Module Risks */}
        {activeTab === 'CORRELATED' && (
          <div className="space-y-4">
            {loading ? (
              <LoadingSkeleton count={3} />
            ) : filteredCorrelated.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#E7E9F1]">
                <CheckCircle2 className="w-10 h-10 text-[#16856B] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#171A2B]">No Cross-Module Risks Detected</h3>
                <p className="text-xs text-[#687086] mt-1">
                  Tickets, tasks, merchandise, and budget allocations are well-aligned across boundaries.
                </p>
              </div>
            ) : (
              filteredCorrelated.map((risk) => {
                const isCrit = risk.severity === 'CRITICAL';
                const isResolved = risk.status === 'resolved';
                return (
                  <div
                    key={risk.id}
                    className={`bg-white rounded-2xl p-6 border transition-all ${
                      isResolved
                        ? 'border-[#E7E9F1] opacity-75'
                        : isCrit
                        ? 'border-[#D9485F]/40 shadow-xs'
                        : 'border-[#E7E9F1] shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-[#171A2B]">{risk.title}</h3>
                          <Badge variant={isCrit ? 'critical' : risk.severity === 'HIGH' ? 'warning' : 'accent'}>
                            {risk.severity}
                          </Badge>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isResolved
                                ? 'bg-[#16856B]/10 text-[#16856B]'
                                : risk.status === 'acknowledged'
                                ? 'bg-[#C97A16]/10 text-[#C97A16]'
                                : 'bg-[#625BF6]/10 text-[#625BF6]'
                            }`}
                          >
                            {risk.status}
                          </span>
                        </div>

                        {/* Relationship Explanation */}
                        <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1] text-xs text-[#171A2B] leading-relaxed">
                          <span className="font-bold text-[#625BF6]">Multi-Module Correlation: </span>
                          {risk.relationship_explanation}
                        </div>

                        {/* Affected Entities Strip */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-[#687086]">Interconnected Entities:</span>
                          {risk.affected_entities.map((ae, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EEEDFE] border border-[#D4D1FD] text-[11px] font-semibold text-[#625BF6]"
                            >
                              <span className="capitalize text-[#8B93A7]">{ae.entity_type}:</span>
                              <span>{ae.name}</span>
                            </span>
                          ))}
                        </div>

                        {/* Recommended Action */}
                        <div className="pt-2 flex items-start gap-1.5 text-xs text-[#16856B] font-semibold">
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Action: {risk.recommended_action}</span>
                        </div>
                      </div>

                      {/* Mitigation Actions */}
                      <div className="flex flex-row lg:flex-col items-end gap-2 shrink-0">
                        {risk.status === 'open' && (
                          <button
                            disabled={actioningRiskId === risk.id}
                            onClick={() => handleTakeAction(risk.id, 'acknowledge')}
                            className="px-3 py-1.5 rounded-xl border border-[#C97A16]/30 bg-[#C97A16]/10 hover:bg-[#C97A16]/20 text-[#C97A16] text-xs font-bold transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                        {risk.status !== 'resolved' ? (
                          <button
                            disabled={actioningRiskId === risk.id}
                            onClick={() => handleTakeAction(risk.id, 'resolve')}
                            className="px-3.5 py-1.5 rounded-xl bg-[#16856B] hover:bg-[#126b55] text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        ) : (
                          <div className="text-right text-[11px] text-[#16856B] font-semibold">
                            ✓ Resolved & Audited
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Legacy Single-Module Rules View */}
        {activeTab === 'COMPONENT' && (
          <div className="space-y-4">
            {/* Contributing Factor Gauges */}
            {riskData?.score_breakdown && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Financial Solvency (35%)"
                  value={`${riskData.score_breakdown.financial_solvency}/100`}
                  subtitle="Cash reserves vs obligations"
                  color={riskData.score_breakdown.financial_solvency >= 80 ? 'teal' : 'amber'}
                />
                <StatCard
                  title="Task Velocity (25%)"
                  value={`${riskData.score_breakdown.task_velocity}/100`}
                  subtitle="Critical path completions"
                  color={riskData.score_breakdown.task_velocity >= 80 ? 'teal' : 'amber'}
                />
                <StatCard
                  title="Event Logistics (25%)"
                  value={`${riskData.score_breakdown.event_logistics}/100`}
                  subtitle="Volunteer coverage ratio"
                  color={riskData.score_breakdown.event_logistics >= 80 ? 'teal' : 'amber'}
                />
                <StatCard
                  title="Inventory Health (15%)"
                  value={`${riskData.score_breakdown.inventory_health}/100`}
                  subtitle="Apparel stockout buffer"
                  color={riskData.score_breakdown.inventory_health >= 80 ? 'teal' : 'amber'}
                />
              </div>
            )}

            <div className="space-y-3">
              {(riskData?.risk_items || []).map((risk) => (
                <RiskAlert
                  key={risk.id}
                  severity={risk.severity}
                  category={risk.category}
                  title={risk.title}
                  explanation={risk.explanation}
                  sourceRecord={risk.source_record}
                  actionText={risk.recommended_action}
                  onAction={() => {
                    if (risk.category === 'FINANCIAL') window.location.href = '/ledger';
                    else if (risk.category === 'OPERATIONAL') window.location.href = '/organizer/tasks';
                    else if (risk.category === 'LOGISTICAL') window.location.href = '/organizer/events';
                    else window.location.href = '/organizer/merch';
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RiskWorkspacePage;
