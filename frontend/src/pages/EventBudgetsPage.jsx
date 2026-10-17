import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import {
  Receipt,
  Calendar,
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const EventBudgetsPage = () => {
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [evRes, txnRes] = await Promise.all([
          api.get('/api/events?published_only=true').catch(() => []),
          api.get('/api/transactions').catch(() => [])
        ]);
        // Treasurers and executives only see published events
        const publishedEvents = (evRes || []).filter((e) => e.is_published !== false);
        setEvents(publishedEvents);
        setTransactions(txnRes || []);
      } catch (err) {
        console.error('Failed to load event budgets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute event financial analytics
  const eventBudgetMetrics = events.map((evt) => {
    const eventTxns = transactions.filter((t) => t.event_id === evt.id);
    const actualExpensePaise = eventTxns
      .filter((t) => t.transaction_type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

    const actualIncomePaise = eventTxns
      .filter((t) => t.transaction_type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

    const estimatedBudgetPaise = evt.estimated_budget_paise || 2000000;
    // Projected ticket revenue yield based on booked count and member price
    const ticketYieldPaise = actualIncomePaise > 0
      ? actualIncomePaise
      : (evt.booked_count || 0) * (evt.member_price_paise || 10000);

    const netVariancePaise = ticketYieldPaise - actualExpensePaise;
    const budgetUtilizationPct = Math.min(200, Math.round((actualExpensePaise / Math.max(1, estimatedBudgetPaise)) * 100));

    // Break-even tickets calculation
    const avgTicketPricePaise = Math.round(((evt.member_price_paise || 10000) + (evt.non_member_price_paise || 20000)) / 2);
    const breakEvenTickets = Math.ceil(estimatedBudgetPaise / Math.max(1, avgTicketPricePaise));

    return {
      ...evt,
      estimatedBudgetPaise,
      actualExpensePaise,
      ticketYieldPaise,
      netVariancePaise,
      budgetUtilizationPct,
      breakEvenTickets,
      isSurplus: netVariancePaise >= 0
    };
  });

  const totalAllocatedBudget = eventBudgetMetrics.reduce((acc, e) => acc + e.estimatedBudgetPaise, 0);
  const totalActualRevenue = eventBudgetMetrics.reduce((acc, e) => acc + e.ticketYieldPaise, 0);
  const totalExpensesIncurred = eventBudgetMetrics.reduce((acc, e) => acc + e.actualExpensePaise, 0);
  const netOperationalBalance = totalActualRevenue - totalExpensesIncurred;

  return (
    <DashboardLayout pageTitle="Event Budgets & Financial Visibility">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Coins className="w-3.5 h-3.5" />
              <span>Operational Cost Centers</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Event Budgets & Fiscal Yield
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Event-specific allocation ceilings, ticket revenue yields, break-even targets, and expense variances in integer paise precision.
            </p>
          </div>

          <Link
            to="/simulator"
            className="px-4 py-2 bg-[#17182B] hover:bg-[#23253E] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#A594FD]" />
            <span>Stress Test in Simulator</span>
          </Link>
        </div>

        {/* Security Scope Notice */}
        <div className="p-4 rounded-2xl bg-[#625BF6]/5 border border-[#625BF6]/20 flex items-start gap-3 text-xs text-[#687086]">
          <Lock className="w-4 h-4 text-[#625BF6] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#171A2B]">Role-Based Financial Boundaries:</span> Organizers have read-and-budget visibility across allocated event cost centers and ticket revenue yields. Sensitive expense reimbursement payouts, bank mandate reconciliations, and general ledger postings remain strictly restricted to authorized Treasurers.
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Allocated Budgets"
            value={formatINR(totalAllocatedBudget)}
            subtitle="Across scheduled chapter events"
            icon={Receipt}
            color="indigo"
          />
          <StatCard
            title="Ticket Sales Revenue Yield"
            value={formatINR(totalActualRevenue)}
            subtitle="Generated from attendee bookings"
            icon={Coins}
            color="teal"
          />
          <StatCard
            title="Actual Event Costs Incurred"
            value={formatINR(totalExpensesIncurred)}
            subtitle="Executed venue, sound & catering costs"
            icon={Receipt}
            color={totalExpensesIncurred > totalAllocatedBudget ? 'rose' : 'amber'}
          />
          <StatCard
            title="Net Operational Balance"
            value={formatINR(netOperationalBalance)}
            subtitle={netOperationalBalance >= 0 ? 'Surplus generation' : 'Deficit burn'}
            icon={TrendingUp}
            color={netOperationalBalance >= 0 ? 'teal' : 'rose'}
          />
        </div>

        {/* Event Budgets Table */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-[#E7E9F1] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
              Event-by-Event Fiscal Performance
            </h2>
            <span className="text-xs text-[#687086]">Paise precision (₹ / 100)</span>
          </div>

          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={5} />
            </div>
          ) : eventBudgetMetrics.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#687086]">
              No events scheduled with budget allocations yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Event & Venue</th>
                    <th className="py-3.5 px-4">Allocated Budget</th>
                    <th className="py-3.5 px-4">Costs Incurred</th>
                    <th className="py-3.5 px-4">Ticket Revenue</th>
                    <th className="py-3.5 px-4">Break-Even Seats</th>
                    <th className="py-3.5 px-4">Net Variance</th>
                    <th className="py-3.5 px-4">Budget Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                  {eventBudgetMetrics.map((em) => (
                    <tr key={em.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#171A2B]">
                          <span>{em.title}</span>
                        </div>
                        <div className="text-[11px] text-[#687086]">{em.venue} • {em.event_date}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#171A2B]">
                        {formatINR(em.estimatedBudgetPaise)}
                      </td>

                      <td className="py-3.5 px-4 text-[#687086]">
                        {formatINR(em.actualExpensePaise)}
                        <span className="text-[10px] text-[#687086] block">
                          ({em.budgetUtilizationPct}% utilized)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#16856B]">
                        {formatINR(em.ticketYieldPaise)}
                        <span className="text-[10px] text-[#687086] block">
                          {em.booked_count} tickets issued
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#171A2B]">
                          {em.breakEvenTickets} seats
                        </span>
                        <span className="text-[10px] text-[#687086] block">
                          Cap: {em.capacity} seats
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <span className={em.isSurplus ? 'text-[#16856B]' : 'text-[#D9485F]'}>
                          {em.isSurplus ? '+' : ''}{formatINR(em.netVariancePaise)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={em.actualExpensePaise > em.estimatedBudgetPaise ? 'critical' : em.isSurplus ? 'positive' : 'warning'}>
                          {em.actualExpensePaise > em.estimatedBudgetPaise
                            ? 'Over Budget'
                            : em.isSurplus
                            ? 'Surplus Yield'
                            : 'Nominal'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
