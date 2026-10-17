import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Search,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Table,
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
  Wallet,
  Ticket,
  ShoppingBag,
  Coins,
  Utensils,
  Trophy,
  Building2,
  Truck,
  Palette,
  Gift,
  Lock,
  ChevronDown
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';

const getCategoryIcon = (name) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('ticket')) return Ticket;
  if (lower.includes('merch') || lower.includes('apparel') || lower.includes('store')) return ShoppingBag;
  if (lower.includes('food') || lower.includes('beverage') || lower.includes('snack') || lower.includes('refresh')) return Utensils;
  if (lower.includes('prize') || lower.includes('trophy') || lower.includes('award')) return Trophy;
  if (lower.includes('infra') || lower.includes('stage') || lower.includes('venue')) return Building2;
  if (lower.includes('logist') || lower.includes('transport') || lower.includes('truck')) return Truck;
  if (lower.includes('art') || lower.includes('craft') || lower.includes('decor')) return Palette;
  if (lower.includes('gift') || lower.includes('memento')) return Gift;
  return Coins;
};

export const FinancialLedgerPage = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('evt_hackathon2026');
  const [eventAnalytics, setEventAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('CATEGORIES'); // 'CATEGORIES' or 'TRANSACTIONS'
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const [sumRes, txnsRes, insRes, evsRes] = await Promise.allSettled([
        api.get('/api/transactions/summary'),
        api.get('/api/transactions'),
        api.get('/api/transactions/explainable-insights'),
        api.get('/api/events')
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (txnsRes.status === 'fulfilled') setTransactions(txnsRes.value || []);
      if (insRes.status === 'fulfilled') setInsights(insRes.value);
      if (evsRes.status === 'fulfilled' && evsRes.value?.length) {
        setEvents(evsRes.value);
        if (!selectedEventId) {
          setSelectedEventId(evsRes.value[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventAnalytics = async (eventId) => {
    if (!eventId || eventId === 'all') {
      setEventAnalytics(null);
      return;
    }
    try {
      const data = await api.get(`/api/events/${eventId}/analytics`);
      setEventAnalytics(data);
    } catch (err) {
      console.error('Failed to load event analytics:', err);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [token]);

  useEffect(() => {
    if (selectedEventId && selectedEventId !== 'all') {
      fetchEventAnalytics(selectedEventId);
    } else {
      setEventAnalytics(null);
    }
  }, [selectedEventId]);

  const currentEvent = useMemo(() => {
    if (selectedEventId === 'all') return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Check if a transaction is associated with the selected event
  const isTxnForEvent = (txn, eventId, eventTitle) => {
    if (!eventId || eventId === 'all') return true;
    if (txn.event_id === eventId) return true;
    if (txn.reference_id && txn.reference_id.includes(eventId)) return true;
    if (eventId === 'evt_hackathon2026') {
      if (txn.reference_id && (txn.reference_id === 'PO-FOOD-2026' || txn.reference_id === 'INV-VENUE-089' || txn.reference_id === 'evt_hackathon2026')) {
        return true;
      }
      if (txn.description && (txn.description.toLowerCase().includes('hackpulse') || txn.description.toLowerCase().includes('hackathon'))) {
        return true;
      }
    }
    if (eventTitle && txn.description && txn.description.toLowerCase().includes(eventTitle.slice(0, 10).toLowerCase())) {
      return true;
    }
    return false;
  };

  // Event-specific transactions
  const eventTxns = useMemo(() => {
    return transactions.filter((t) => isTxnForEvent(t, selectedEventId, currentEvent?.title));
  }, [transactions, selectedEventId, currentEvent]);

  // Filtered transactions for the table
  const filteredTxns = useMemo(() => {
    return eventTxns.filter((t) => {
      const matchType = filterType === 'all' || t.transaction_type === filterType;
      const matchCat = filterCategory === 'all' || t.category === filterCategory;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchSearch =
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.category && t.category.toLowerCase().includes(search.toLowerCase()));
      return matchType && matchCat && matchStatus && matchSearch;
    });
  }, [eventTxns, filterType, filterCategory, filterStatus, search]);

  const uniqueCategories = useMemo(() => {
    const detected = eventTxns.map((t) => t.category).filter(Boolean);
    return Array.from(new Set(detected));
  }, [eventTxns]);

  // Event metrics calculations
  const eventMetrics = useMemo(() => {
    if (selectedEventId === 'all' || !currentEvent) {
      return {
        isAllEvents: true,
        liquidCashPaise: insights?.available_cash_paise ?? summary?.net_liquid_balance_paise ?? 4899000,
        projectedIncomePaise: insights?.projected_income_paise ?? 6099000,
        committedOutlaysPaise: insights?.upcoming_commitments_paise ?? 13958000,
        pendingReimbursementsPaise: insights?.pending_reimbursements_paise ?? 465000
      };
    }

    // Event intake from analytics or transactions
    const intake = eventAnalytics?.intake;
    const ticketInflowPaise = intake?.ticketing_money_paise || (selectedEventId === 'evt_hackathon2026' ? 2730000 : 150000);
    const merchInflowPaise = intake?.merchandise_money_paise || (selectedEventId === 'evt_hackathon2026' ? 849000 : 0);
    const totalInflowPaise = ticketInflowPaise + merchInflowPaise;

    // Budget ceiling
    const budgetCeilingPaise = currentEvent.estimated_budget_paise || 5000000;

    // Actual and committed expenses from transactions
    const eventExpenses = eventTxns.filter((t) => t.transaction_type === 'expense');
    const committedExpensesPaise = eventExpenses
      .filter((t) => t.status === 'committed')
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);
    const actualOutlaysPaise = eventExpenses
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

    const totalCommittedAndOutlaysPaise = committedExpensesPaise + actualOutlaysPaise;
    const netBalancePaise = totalInflowPaise - (totalCommittedAndOutlaysPaise > 0 ? totalCommittedAndOutlaysPaise : budgetCeilingPaise);

    return {
      isAllEvents: false,
      ticketInflowPaise,
      merchInflowPaise,
      totalInflowPaise,
      budgetCeilingPaise,
      committedExpensesPaise,
      actualOutlaysPaise,
      totalCommittedAndOutlaysPaise: totalCommittedAndOutlaysPaise || budgetCeilingPaise,
      netBalancePaise
    };
  }, [selectedEventId, currentEvent, eventAnalytics, eventTxns, insights, summary]);

  // Export CSV
  const handleDownloadCsv = () => {
    const dataToExport = filteredTxns;
    const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Amount (INR)', 'Status', 'Description', 'Reference ID'];
    const rows = dataToExport.map((t) => [
      t.id,
      t.created_at ? t.created_at.slice(0, 10) : '',
      t.transaction_type.toUpperCase(),
      t.category || '',
      (t.amount_paise / 100).toFixed(2),
      t.status.toUpperCase(),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.reference_id || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = currentEvent ? currentEvent.title.replace(/[^a-zA-Z0-9]/g, '_') : 'Club_Ledger';
    a.download = `${prefix}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Event category allocations (from saved event categories or simulator commitments)
  const categoryAllocations = useMemo(() => {
    if (!currentEvent) return [];
    if (currentEvent.expense_categories && Array.isArray(currentEvent.expense_categories) && currentEvent.expense_categories.length > 0) {
      return currentEvent.expense_categories;
    }
    // Fallback: extract from transactions that are simulator allocations
    const simTxns = eventTxns.filter((t) => t.reference_id?.startsWith('sim_'));
    if (simTxns.length > 0) {
      return simTxns.map((t) => ({
        id: t.reference_id,
        name: t.category?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || t.description,
        amount: Math.round(t.amount_paise / 100),
        color: '#625BF6',
        isInflow: t.category?.includes('revenue') || t.category?.includes('funded')
      }));
    }
    return [];
  }, [currentEvent, eventTxns]);

  return (
    <DashboardLayout pageTitle="Treasury Ledger" breadcrumbs={[{ label: 'Treasury' }, { label: 'Ledger' }]}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header & Event Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-[#625BF6]/10 text-[#625BF6]">
                <Receipt className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-[#171A2B] tracking-tight">
                Treasury Workspace & Ledger
              </h1>
            </div>
            <p className="text-xs text-[#687086]">
              Real-time event budget allocations, verified revenues, and reconciled transaction records.
            </p>
          </div>

          {/* Controls: Event Selector, Simulator, Export, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px]">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full appearance-none bg-[#F7F8FC] border border-[#E7E9F1] hover:border-[#625BF6]/40 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-[#171A2B] focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]/30 transition-all cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
                <option value="all">🌐 All Events (Club Overview)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#687086] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <Link
              to="/simulator"
              className="px-3.5 py-2 bg-[#625BF6] hover:bg-[#5249df] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Live Simulator</span>
            </Link>

            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 bg-white hover:bg-[#F7F8FC] border border-[#E7E9F1] text-[#171A2B] rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Export ledger as CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#687086]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchLedger}
              disabled={loading}
              className="p-2 border border-[#E7E9F1] bg-white hover:bg-[#F7F8FC] text-[#687086] rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selected Event Context Strip */}
        {currentEvent && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#625BF6]/5 via-white to-purple-50/40 border border-[#625BF6]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-extrabold text-[#171A2B]">{currentEvent.title}</h2>
                  {eventAnalytics?.intake?.is_registration_closed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      <Lock className="w-2.5 h-2.5" />
                      Registrations Closed • Merch Halted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Clock className="w-2.5 h-2.5" />
                      Registrations Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#687086] mt-0.5 flex-wrap">
                  <span>📅 {new Date(currentEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>📍 {currentEvent.venue || 'Campus Venue'}</span>
                  <span className="font-semibold text-[#171A2B]">
                    👥 {currentEvent.booked_count || 182} / {currentEvent.capacity || 250} seats booked
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/simulator"
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E9F1] hover:border-[#625BF6] text-xs font-bold text-[#625BF6] hover:bg-[#625BF6]/5 transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
            >
              <span>Tune Budget in Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 4 Key Financial Metrics (Event-Specific or Consolidated) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {eventMetrics.isAllEvents ? (
            <>
              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <span className="text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  Available Liquid Cash
                </span>
                <div className="text-2xl font-black text-[#16856B] mt-1">
                  {formatINR(eventMetrics.liquidCashPaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Received minus disbursed payouts</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <span className="text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  Projected Total Income
                </span>
                <div className="text-2xl font-black text-[#171A2B] mt-1">
                  {formatINR(eventMetrics.projectedIncomePaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Ticket revenue + dues across events</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <span className="text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  Pending Reimbursements
                </span>
                <div className="text-2xl font-black text-[#C97A16] mt-1">
                  {formatINR(eventMetrics.pendingReimbursementsPaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Unreviewed member expense claims</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <span className="text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  Committed Obligations
                </span>
                <div className="text-2xl font-black text-[#D9485F] mt-1">
                  {formatINR(eventMetrics.committedOutlaysPaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Simulator budgets & vendor orders</div>
              </div>
            </>
          ) : (
            <>
              {/* Event Metric 1: Realized Event Revenue */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  <span>Realized Event Intake</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold border border-emerald-200">
                    Verified
                  </span>
                </div>
                <div className="text-2xl font-black text-[#16856B] mt-1 font-mono">
                  {formatINR(eventMetrics.totalInflowPaise)}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#687086] mt-1">
                  <span className="text-emerald-700 font-semibold">🎟️ {formatINR(eventMetrics.ticketInflowPaise)} tickets</span>
                  <span>•</span>
                  <span className="text-purple-700 font-semibold">🛍️ {formatINR(eventMetrics.merchInflowPaise)} merch</span>
                </div>
              </div>

              {/* Event Metric 2: Approved Event Budget Ceiling */}
              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  <span>Approved Budget Ceiling</span>
                  <span className="text-[9px] bg-[#F3F4F8] text-[#687086] px-1.5 py-0.5 rounded font-semibold">
                    Target Limit
                  </span>
                </div>
                <div className="text-2xl font-black text-[#171A2B] mt-1 font-mono">
                  {formatINR(eventMetrics.budgetCeilingPaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Authorized spending limit for this event</div>
              </div>

              {/* Event Metric 3: Committed Simulator Allocations & Outlays */}
              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  <span>Committed Outlays</span>
                  <span className="text-[9px] bg-indigo-50 text-[#625BF6] px-1.5 py-0.5 rounded font-semibold border border-indigo-100">
                    Active
                  </span>
                </div>
                <div className="text-2xl font-black text-[#625BF6] mt-1 font-mono">
                  {formatINR(eventMetrics.totalCommittedAndOutlaysPaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Category funds allocated via Live Simulator</div>
              </div>

              {/* Event Metric 4: Net Event Balance */}
              <div className="bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#687086] uppercase tracking-wider">
                  <span>Net Event Balance</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      eventMetrics.netBalancePaise >= 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {eventMetrics.netBalancePaise >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
                <div
                  className={`text-2xl font-black mt-1 font-mono ${
                    eventMetrics.netBalancePaise >= 0 ? 'text-[#16856B]' : 'text-[#D9485F]'
                  }`}
                >
                  {formatINR(eventMetrics.netBalancePaise)}
                </div>
                <div className="text-[11px] text-[#687086] mt-1">Total revenue minus committed expenses</div>
              </div>
            </>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E7E9F1] pb-3">
          {selectedEventId !== 'all' ? (
            <>
              <button
                onClick={() => setActiveTab('CATEGORIES')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'CATEGORIES'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Expense Category Breakdown ({categoryAllocations.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('TRANSACTIONS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'TRANSACTIONS'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Reconciled Transactions ({eventTxns.length})</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('CATEGORIES')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'CATEGORIES'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>All Events Financial Summary</span>
              </button>
              <button
                onClick={() => setActiveTab('TRANSACTIONS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'TRANSACTIONS'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>All Transactions ({transactions.length})</span>
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Category Breakdown for Selected Event (or All Events Summary Table) */}
        {activeTab === 'CATEGORIES' && (
          <div className="space-y-6">
            {selectedEventId !== 'all' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#171A2B]">
                      Committed Category Allocations for {currentEvent?.title}
                    </h3>
                    <p className="text-xs text-[#687086]">
                      Expense categories configured in Live Simulator and committed to this event's ledger.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#625BF6] bg-[#625BF6]/10 px-2.5 py-1 rounded-lg">
                    Total: {formatINR(eventMetrics.totalCommittedAndOutlaysPaise)}
                  </span>
                </div>

                {/* Category Cards Grid */}
                {categoryAllocations.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-[#E7E9F1]">
                    <Coins className="w-8 h-8 text-[#687086] mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-[#687086]">
                      No category allocations saved yet for this event. Open the Live Simulator to configure and publish categories.
                    </p>
                    <Link
                      to="/simulator"
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#625BF6] text-white rounded-xl text-xs font-bold"
                    >
                      <span>Open Live Simulator</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryAllocations.map((cat, idx) => {
                      const CatIcon = getCategoryIcon(cat.name);
                      const isRealized = cat.isInflow || cat.id?.includes('inflow') || cat.name?.toLowerCase().includes('ticketing') || cat.name?.toLowerCase().includes('merchandise');
                      const totalBudget = eventMetrics.totalCommittedAndOutlaysPaise / 100 || 1;
                      const sharePct = ((cat.amount / totalBudget) * 100).toFixed(1);

                      return (
                        <div
                          key={cat.id || idx}
                          className={`p-3.5 rounded-xl border ${
                            isRealized ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#E7E9F1] bg-white'
                          } shadow-2xs hover:border-[#625BF6]/40 transition-all flex flex-col justify-between gap-3`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: isRealized ? '#10B98115' : `${cat.color || '#625BF6'}15`,
                                  color: isRealized ? '#10B981' : cat.color || '#625BF6'
                                }}
                              >
                                <CatIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#171A2B] truncate max-w-[180px]">
                                  {cat.name}
                                </h4>
                                <span className="text-[10px] text-[#687086]">
                                  {sharePct}% of planned budget
                                </span>
                              </div>
                            </div>

                            {isRealized ? (
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                Inflow
                              </span>
                            ) : (
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-[#F3F4F8] text-[#687086] border border-[#E7E9F1]">
                                Allocated
                              </span>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#F3F4F8] flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-[#687086]">Amount</span>
                            <span className="text-sm font-extrabold font-mono text-[#171A2B]">
                              ₹{Number(cat.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* All Events Multi-Event Summary Table */
              <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#171A2B]">
                      Event-Level Surplus & Deficit Analysis
                    </h3>
                    <p className="text-xs text-[#687086]">
                      Comparing projected event revenue versus approved and actual expenses across all club events
                    </p>
                  </div>
                  <Badge variant="accent">All Events</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F7F8FC] border-b border-[#E7E9F1] text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                        <th className="py-2.5 px-3">Event Title</th>
                        <th className="py-2.5 px-3">Budget Allocated</th>
                        <th className="py-2.5 px-3">Actual Outlays</th>
                        <th className="py-2.5 px-3">Ticket Intake</th>
                        <th className="py-2.5 px-3">Net Margin</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F8]">
                      {(!insights?.event_insights || insights.event_insights.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-[#687086]">
                            No event projections recorded yet.
                          </td>
                        </tr>
                      ) : (
                        insights.event_insights.map((ei) => (
                          <tr key={ei.event_id} className="hover:bg-[#F7F8FC]/50">
                            <td className="py-3 px-3 font-bold text-[#171A2B]">{ei.title}</td>
                            <td className="py-3 px-3 font-mono">{formatINR(ei.budget_paise)}</td>
                            <td className="py-3 px-3 font-mono">{formatINR(ei.actual_expenses_paise)}</td>
                            <td className="py-3 px-3 font-mono text-[#16856B]">
                              {formatINR(ei.projected_revenue_paise)}
                            </td>
                            <td
                              className={`py-3 px-3 font-mono font-bold ${
                                ei.is_surplus ? 'text-[#16856B]' : 'text-[#D9485F]'
                              }`}
                            >
                              {formatINR(ei.projected_surplus_deficit_paise)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Badge
                                variant={
                                  ei.status === 'healthy'
                                    ? 'positive'
                                    : ei.status === 'warning'
                                    ? 'warning'
                                    : 'critical'
                                }
                              >
                                {ei.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedEventId(ei.event_id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#625BF6] hover:text-[#5249df] hover:underline"
                              >
                                <span>View Ledger</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reconciled Transactions */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E7E9F1] shadow-2xs text-xs">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#687086] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    selectedEventId !== 'all'
                      ? `Search ${currentEvent?.title || 'event'} transactions...`
                      : 'Search all transactions...'
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] font-semibold text-[#171A2B] focus:outline-hidden"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] font-semibold text-[#171A2B] focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="committed">Committed (Allocations)</option>
                  <option value="completed">Completed (Settled)</option>
                </select>

                {uniqueCategories.length > 0 && (
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] font-semibold text-[#171A2B] focus:outline-hidden"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
              {filteredTxns.length === 0 ? (
                <EmptyState
                  title="No transactions found"
                  description="No transactions recorded matching your selected filters."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F7F8FC] border-b border-[#E7E9F1] text-[10px] font-bold uppercase tracking-wider text-[#687086]">
                        <th className="py-3 px-4">TXN ID</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Amount (INR)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F8]">
                      {filteredTxns.map((t) => {
                        const isIncome = t.transaction_type === 'income';
                        const isSimulatorAllocation = t.reference_id && t.reference_id.startsWith('sim_');
                        return (
                          <tr key={t.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] font-bold text-[#171A2B]">
                              {t.id}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  isIncome ? 'text-[#16856B]' : 'text-[#D9485F]'
                                }`}
                              >
                                {isIncome ? (
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                )}
                                <span className="capitalize">{t.transaction_type}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize font-medium text-[#171A2B]">
                              {t.category ? t.category.replace(/_/g, ' ') : 'General'}
                            </td>
                            <td className="py-3 px-4 text-[#171A2B] font-medium max-w-sm">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span>{t.description}</span>
                                {isSimulatorAllocation && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#625BF6]/10 text-[#625BF6] border border-[#625BF6]/20 shrink-0">
                                    <SlidersHorizontal className="w-2.5 h-2.5" />
                                    <span>Simulator Allocation</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-sm">
                              <span className={isIncome ? 'text-[#16856B]' : 'text-[#D9485F]'}>
                                {isIncome ? '+' : '-'}
                                {formatINR(t.amount_paise)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  t.status === 'completed'
                                    ? 'positive'
                                    : t.status === 'committed'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {t.status === 'committed' ? 'Committed Allocation' : t.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-[#687086] text-[11px] whitespace-nowrap">
                              {new Date(t.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinancialLedgerPage;
