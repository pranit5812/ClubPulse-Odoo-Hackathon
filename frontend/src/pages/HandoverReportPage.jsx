import React, { useState, useEffect } from 'react';
import { api, formatINR } from '../api/client';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Users,
  Ticket,
  Box,
  CheckSquare,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const HandoverReportPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchHandoverReport = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/reports/handover');
      setReport(data);
    } catch (err) {
      console.error('Failed to load handover report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoverReport();
  }, []);

  const handleDownloadCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.get('/api/reports/handover/export/csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skyline_handover_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:p-0">
        {/* Header (Hidden in Print controls, title preserved) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E7E9F1]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Executive Continuity Protocol</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Semester Handover & Audit Report
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Verifiable transition briefing for incoming student committee presidents, treasurers, and advisors.
            </p>
          </div>

          <div className="flex items-center gap-2.5 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-[#F7F8FC] text-[#171A2B] border border-[#E7E9F1] rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Print certified document or Save as PDF"
            >
              <Printer className="w-4 h-4 text-[#687086]" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={exporting}
              className="px-4 py-2 bg-[#171A2B] hover:bg-[#17182B] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : 'Download CSV Ledger'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <LoadingSkeleton lines={4} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-[#E7E9F1] animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Term & Certification Meta Card */}
            <div className="p-5 bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[#687086] block text-[10px] uppercase font-bold tracking-wider">Academic Session</span>
                <span className="font-bold text-[#171A2B] text-sm">{report?.academic_term}</span>
              </div>
              <div>
                <span className="text-[#687086] block text-[10px] uppercase font-bold tracking-wider">Generated At</span>
                <span className="font-mono text-[#171A2B]">{report?.generated_at?.slice(0, 19).replace('T', ' ')} UTC</span>
              </div>
              <div>
                <span className="text-[#687086] block text-[10px] uppercase font-bold tracking-wider">Audit Certification</span>
                <span className="text-[#16856B] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#16856B]" />
                  Reconciled & Certified
                </span>
              </div>
            </div>

            {/* Financial Ledger Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#625BF6]" />
                  <h2 className="text-base font-bold text-[#171A2B]">Financial Ledger Reconciliation</h2>
                </div>
                <span className="text-xs font-mono text-[#687086]">Values in INR (Integer Paise Precision)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
                  <span className="text-[10px] font-bold uppercase text-[#687086] tracking-wider">Opening Liquid Cash</span>
                  <div className="text-lg font-bold text-[#171A2B] mt-1">
                    {formatINR(report?.opening_liquid_cash_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#16856B]/5 border border-[#16856B]/20">
                  <span className="text-[10px] font-bold uppercase text-[#16856B] tracking-wider">Total Term Income</span>
                  <div className="text-lg font-bold text-[#16856B] mt-1">
                    +{formatINR(report?.total_income_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#D9485F]/5 border border-[#D9485F]/20">
                  <span className="text-[10px] font-bold uppercase text-[#D9485F] tracking-wider">Total Disbursements</span>
                  <div className="text-lg font-bold text-[#D9485F] mt-1">
                    -{formatINR(report?.total_expenses_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#625BF6]/10 border border-[#625BF6]/30">
                  <span className="text-[10px] font-bold uppercase text-[#625BF6] tracking-wider">Closing Liquid Balance</span>
                  <div className="text-lg font-extrabold text-[#625BF6] mt-1">
                    {formatINR(report?.closing_liquid_cash_paise)}
                  </div>
                </div>
              </div>

              {/* Obligations & Receivables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC]/50 text-xs space-y-1">
                  <span className="text-[#687086] font-medium">Pending Member Receivables:</span>
                  <div className="text-sm font-bold text-[#171A2B]">
                    {formatINR(report?.pending_receivables_paise)}
                  </div>
                  <p className="text-[11px] text-[#687086]">Unconfirmed dues or orders</p>
                </div>

                <div className="p-4 rounded-xl border border-[#D98A18]/30 bg-[#D98A18]/5 text-xs space-y-1">
                  <span className="text-[#D98A18] font-medium">Outstanding Reimbursements:</span>
                  <div className="text-sm font-bold text-[#D98A18]">
                    {formatINR(report?.outstanding_reimbursements_paise)}
                  </div>
                  <p className="text-[11px] text-[#687086]">Claims submitted awaiting review</p>
                </div>

                <div className="p-4 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC]/50 text-xs space-y-1">
                  <span className="text-[#687086] font-medium">Committed Future Obligations:</span>
                  <div className="text-sm font-bold text-[#171A2B]">
                    {formatINR(report?.active_commitments_paise)}
                  </div>
                  <p className="text-[11px] text-[#687086]">Approved vendor obligations</p>
                </div>
              </div>
            </div>

            {/* Operational & Assets Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Operations & Events */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#625BF6]" />
                  <h3 className="text-sm font-bold text-[#171A2B]">Event Attendance & Memberships</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Active Registered Members:</span>
                    <strong className="text-[#171A2B]">{report?.active_members_count} / {report?.total_registered_members}</strong>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Events Conducted in Term:</span>
                    <strong className="text-[#171A2B]">{report?.total_events_conducted}</strong>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Total Tickets Issued:</span>
                    <strong className="text-[#171A2B]">{report?.total_tickets_issued}</strong>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Verified QR Gate Attendances:</span>
                    <strong className="text-[#16856B]">{report?.total_attendance_verified}</strong>
                  </div>
                </div>
              </div>

              {/* Merchandise Inventory & Tasks */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-[#625BF6]" />
                  <h3 className="text-sm font-bold text-[#171A2B]">Physical Assets & Task Status</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Inventory Product Catalog Items:</span>
                    <strong className="text-[#171A2B]">{report?.inventory_items_count} SKUs</strong>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Remaining Merch Asset Valuation:</span>
                    <strong className="text-[#171A2B]">{formatINR(report?.total_inventory_valuation_paise)}</strong>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Pending Volunteer Tasks:</span>
                    <strong className="text-[#171A2B]">{report?.pending_tasks_count}</strong>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#F7F8FC]">
                    <span className="text-[#687086]">Critical Overdue Items:</span>
                    <strong className={report?.critical_overdue_tasks_count > 0 ? 'text-[#D9485F]' : 'text-[#16856B]'}>
                      {report?.critical_overdue_tasks_count}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Recommendations & Audit Notes */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[#171A2B] mb-2.5">Executive Transition Recommendations</h3>
                <div className="space-y-2">
                  {report?.executive_recommendations?.map((rec, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-[#625BF6]/5 border border-[#625BF6]/20 text-xs text-[#171A2B] flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#625BF6] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E7E9F1]">
                <h3 className="text-sm font-bold text-[#171A2B] mb-2.5">Audit Verification Notes</h3>
                <div className="space-y-2 text-xs text-[#687086]">
                  {report?.audit_notes?.map((note, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#625BF6] mt-1.5 shrink-0"></span>
                      <span className="leading-relaxed">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
