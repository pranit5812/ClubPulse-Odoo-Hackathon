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
  Kanban,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Coins,
  ShieldAlert
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const OrganizerReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchHandoverReport = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/reports/handover');
      setReport(data);
    } catch (err) {
      console.error('Failed to load operational report:', err);
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
      a.download = `clubpulse_operations_report_${Date.now()}.csv`;
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
    <DashboardLayout pageTitle="Consolidated Operations & Handover Report">
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:p-0">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E7E9F1]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Certified Operations & Handover Audit</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Consolidated Operations Report
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Verifiable transition briefing covering event attendance, ticket sales, fiscal ledgers, unpaid claims, and volunteer velocity.
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
              className="px-4 py-2 bg-[#171A2B] hover:bg-[#23253E] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Audit Certification Strip */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E9F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#687086]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#16856B]" />
            <span>
              Certified Term: <strong className="text-[#171A2B]">{report?.academic_term || 'Spring 2026 Academic Term'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Precision: <strong>Integer Paise (Zero Rounding Float Drift)</strong></span>
            <span>•</span>
            <span>Generated: <strong>{report?.generated_at ? new Date(report.generated_at).toLocaleString() : 'Live'}</strong></span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 bg-white rounded-2xl border border-[#E7E9F1]">
            <LoadingSkeleton lines={6} />
          </div>
        ) : !report ? (
          <div className="p-12 text-center text-xs text-[#687086] bg-white rounded-2xl border border-[#E7E9F1]">
            Could not load report records. Check backend connection.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Financial & Treasury Continuity */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F1]">
                <h2 className="text-sm font-bold text-[#171A2B] flex items-center gap-2 uppercase tracking-wider">
                  <Receipt className="w-4 h-4 text-[#625BF6]" />
                  <span>1. Financial & Treasury Balances (Actual vs Estimates)</span>
                </h2>
                <Badge variant={report.closing_liquid_cash_paise >= 0 ? 'positive' : 'critical'}>
                  {report.closing_liquid_cash_paise >= 0 ? 'Solvent' : 'Deficit'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                    Opening Liquid Cash (Actual)
                  </span>
                  <div className="text-lg font-extrabold text-[#171A2B] mt-1">
                    {formatINR(report.opening_liquid_cash_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#16856B]/10 border border-[#16856B]/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#16856B]">
                    Total Realized Revenue (Actual)
                  </span>
                  <div className="text-lg font-extrabold text-[#16856B] mt-1">
                    {formatINR(report.total_income_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F8FC] border border-[#E7E9F1]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                    Total Executed Expenses (Actual)
                  </span>
                  <div className="text-lg font-extrabold text-[#171A2B] mt-1">
                    {formatINR(report.total_expenses_paise)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#625BF6]/10 border border-[#625BF6]/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#625BF6]">
                    Closing Cash Balance (Actual)
                  </span>
                  <div className="text-lg font-extrabold text-[#625BF6] mt-1">
                    {formatINR(report.closing_liquid_cash_paise)}
                  </div>
                </div>
              </div>

              {/* Outstanding Reimbursements */}
              <div className="p-4 rounded-xl bg-[#C97A16]/10 border border-[#C97A16]/20 flex items-center justify-between text-xs text-[#C97A16]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Unpaid Reimbursements Liability:</strong> Claims currently awaiting committee disbursement.
                  </span>
                </div>
                <strong className="text-sm font-extrabold">
                  {formatINR(report.outstanding_reimbursements_paise)}
                </strong>
              </div>
            </div>

            {/* Section 2: Event Attendance, Ticket Sales & Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Attendance & Tickets */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F1]">
                  <h2 className="text-sm font-bold text-[#171A2B] flex items-center gap-2 uppercase tracking-wider">
                    <Ticket className="w-4 h-4 text-[#16856B]" />
                    <span>2. Events & Attendance Verification</span>
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-2.5 bg-[#F7F8FC] rounded-xl">
                    <span className="text-[#687086]">Official Events Conducted:</span>
                    <strong className="text-[#171A2B]">{report.total_events_conducted} events</strong>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#F7F8FC] rounded-xl">
                    <span className="text-[#687086]">Total Tickets Issued:</span>
                    <strong className="text-[#171A2B]">{report.total_tickets_issued} passes</strong>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#16856B]/10 rounded-xl">
                    <span className="text-[#16856B] font-semibold">Attendance Verified at Gates:</span>
                    <strong className="text-[#16856B]">{report.total_attendance_verified} attendees</strong>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#F7F8FC] rounded-xl">
                    <span className="text-[#687086]">Gate Verification Yield:</span>
                    <strong className="text-[#171A2B]">
                      {Math.round(((report.total_attendance_verified || 0) / Math.max(1, report.total_tickets_issued || 1)) * 100)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Merchandise Inventory & Tasks */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F1]">
                  <h2 className="text-sm font-bold text-[#171A2B] flex items-center gap-2 uppercase tracking-wider">
                    <Box className="w-4 h-4 text-[#C97A16]" />
                    <span>3. Remaining Stock & Task Velocity</span>
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-2.5 bg-[#F7F8FC] rounded-xl">
                    <span className="text-[#687086]">Active Apparel Catalog SKUs:</span>
                    <strong className="text-[#171A2B]">{report.inventory_items_count} items</strong>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#F7F8FC] rounded-xl">
                    <span className="text-[#687086]">Inventory Asset Valuation:</span>
                    <strong className="text-[#171A2B]">{formatINR(report.inventory_valuation_paise)}</strong>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#F7F8FC] rounded-xl">
                    <span className="text-[#687086]">Pending Volunteer Sprint Tasks:</span>
                    <strong className="text-[#171A2B]">{report.pending_tasks_count} tasks</strong>
                  </div>
                  <div className="flex justify-between p-2.5 bg-[#D9485F]/10 rounded-xl">
                    <span className="text-[#D9485F] font-semibold">Critical Overdue Blockers:</span>
                    <strong className="text-[#D9485F]">{report.critical_overdue_tasks_count} items</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Recommendations & Audit Notes */}
            <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                Certified Continuity Recommendations
              </h2>
              <ul className="space-y-2 text-xs text-[#687086]">
                {report.recommendations?.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 p-2.5 bg-[#F7F8FC] rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-[#625BF6] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
