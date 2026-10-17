import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  SlidersHorizontal,
  Wallet,
  Users,
  Coins,
  Utensils,
  Truck,
  Trophy,
  Building2,
  Palette,
  Gift,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Lock,
  RotateCcw,
  Save,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  TrendingUp,
  Percent,
  CheckCheck,
  Ticket,
  ShoppingBag,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { DashboardLayout } from '../components/DashboardLayout';

// Category color palettes and default icons
const CATEGORY_PALETTE = [
  { name: 'Food & Beverages', color: '#F59E0B', icon: Utensils, defaultRatio: 0.30 },
  { name: 'Event Prizepool', color: '#EC4899', icon: Trophy, defaultRatio: 0.25 },
  { name: 'Infrastructure', color: '#8B5CF6', icon: Building2, defaultRatio: 0.15 },
  { name: 'Logistics', color: '#3B82F6', icon: Truck, defaultRatio: 0.12 },
  { name: 'Art & Crafts', color: '#10B981', icon: Palette, defaultRatio: 0.07 },
  { name: 'Gifting', color: '#06B6D4', icon: Gift, defaultRatio: 0.06 },
  { name: 'Miscellaneous', color: '#64748B', icon: Coins, defaultRatio: 0.05 }
];

const EXTRA_COLORS = ['#EF4444', '#14B8A6', '#6366F1', '#F97316', '#84CC16', '#D946EF'];

const getCategoryIcon = (name) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('ticket')) return Ticket;
  if (lower.includes('merch') || lower.includes('apparel') || lower.includes('store')) return ShoppingBag;
  if (lower.includes('food') || lower.includes('beverage') || lower.includes('snack') || lower.includes('cater')) return Utensils;
  if (lower.includes('prize') || lower.includes('trophy') || lower.includes('award')) return Trophy;
  if (lower.includes('infra') || lower.includes('stage') || lower.includes('venue')) return Building2;
  if (lower.includes('logist') || lower.includes('transport') || lower.includes('truck')) return Truck;
  if (lower.includes('art') || lower.includes('craft') || lower.includes('decor')) return Palette;
  if (lower.includes('gift') || lower.includes('memento')) return Gift;
  if (lower.includes('misc') || lower.includes('buffer')) return Coins;
  return Coins;
};

export const SimulatorPage = () => {
  const { user, role } = useAuth();
  const isTreasurer = role === 'treasurer';
  const isOrganizer = ['organizer', 'admin'].includes(role);

  // Event list & selected event
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Ceiling budget from Organizer
  const [approvedBudget, setApprovedBudget] = useState(50000); // in INR

  // Expense categories
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

  // Attendance & member settings
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [targetCapacity, setTargetCapacity] = useState(250);
  const [memberPriceInr, setMemberPriceInr] = useState(150);
  const [nonMemberPriceInr, setNonMemberPriceInr] = useState(300);
  const [memberRatio, setMemberRatio] = useState(60);
  const [attendanceRate, setAttendanceRate] = useState(85);

  // Simulation engine results
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Requests state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('budget'); // 'budget' | 'volunteers' | 'other'
  const [budgetIncreasePct, setBudgetIncreasePct] = useState(15);
  const [customPct, setCustomPct] = useState('');
  const [volunteerIncreaseCount, setVolunteerIncreaseCount] = useState(4);
  const [operationalCategory, setOperationalCategory] = useState('Audio & Visual');
  const [requestNotes, setRequestNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccessBanner, setRequestSuccessBanner] = useState('');

  // Save / Reset state
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveNotification, setSaveNotification] = useState('');

  // Post-registration intake state (ticketing & merchandise)
  const [eventIntake, setEventIntake] = useState(null);
  const [loadingIntake, setLoadingIntake] = useState(false);
  const [togglingReg, setTogglingReg] = useState(false);
  const [intakeSuccessMsg, setIntakeSuccessMsg] = useState('');

  // 1. Fetch initial events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const data = await api.get('/api/events');
        setEvents(data || []);
        if (data && data.length > 0) {
          const firstEv = data[0];
          applyEventBaseline(firstEv);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  // Fetch pending requests for current event
  const fetchPendingRequests = async (eventId) => {
    if (!eventId) return;
    try {
      const reqs = await api.get(`/api/simulator/budget-requests?event_id=${eventId}&status=pending`);
      setPendingRequests(reqs || []);
    } catch (err) {
      console.error('Error fetching budget requests:', err);
    }
  };

  // Fetch realized intake (ticketing & merchandise money)
  const fetchEventIntake = async (eventId) => {
    if (!eventId) return;
    try {
      setLoadingIntake(true);
      const data = await api.get(`/api/events/${eventId}/analytics`);
      if (data && data.intake) {
        setEventIntake(data.intake);
      }
    } catch (err) {
      console.error('Error fetching event intake analytics:', err);
    } finally {
      setLoadingIntake(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchPendingRequests(selectedEventId);
      fetchEventIntake(selectedEventId);
    }
  }, [selectedEventId]);

  // Apply baseline data from chosen event
  const applyEventBaseline = (ev) => {
    if (!ev) return;
    setSelectedEventId(ev.id);
    const ceilingInr = Math.round((ev.estimated_budget_paise || 5000000) / 100);
    setApprovedBudget(ceilingInr);
    setTargetCapacity(ev.capacity || 200);
    setMemberPriceInr(Math.round((ev.member_price_paise || 15000) / 100));
    setNonMemberPriceInr(Math.round((ev.non_member_price_paise || 30000) / 100));
    setAttendanceRate(85);
    setMemberRatio(60);

    // If event has saved custom categories, use them; otherwise auto-split
    if (ev.expense_categories && Array.isArray(ev.expense_categories) && ev.expense_categories.length > 0) {
      setCategories(ev.expense_categories);
    } else {
      autoSplitCategories(ceilingInr);
    }
  };

  // Helper: Auto-split ceiling into categories
  const autoSplitCategories = (ceilingAmount) => {
    const budget = Number(ceilingAmount) || 0;
    const food = Math.round(budget * 0.30);
    const prize = Math.round(budget * 0.25);
    const infra = Math.round(budget * 0.15);
    const logistics = Math.round(budget * 0.12);
    const arts = Math.round(budget * 0.07);
    const gifting = Math.round(budget * 0.06);
    const misc = Math.max(0, budget - (food + prize + infra + logistics + arts + gifting));

    const generated = [
      { id: 'cat_food', name: 'Food & Beverages', amount: food, color: '#F59E0B' },
      { id: 'cat_prizepool', name: 'Event Prizepool', amount: prize, color: '#EC4899' },
      { id: 'cat_infra', name: 'Infrastructure', amount: infra, color: '#8B5CF6' },
      { id: 'cat_logistics', name: 'Logistics', amount: logistics, color: '#3B82F6' },
      { id: 'cat_arts', name: 'Art & Crafts', amount: arts, color: '#10B981' },
      { id: 'cat_gifting', name: 'Gifting', amount: gifting, color: '#06B6D4' },
      { id: 'cat_misc', name: 'Miscellaneous', amount: misc, color: '#64748B' }
    ];
    setCategories(generated);
  };

  const handleSelectEvent = (eventId) => {
    const ev = events.find((e) => e.id === eventId);
    if (ev) {
      applyEventBaseline(ev);
    }
  };

  // Planned expense calculations
  const totalPlannedExpenses = useMemo(() => {
    return categories.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [categories]);

  const utilizationPct = useMemo(() => {
    if (!approvedBudget || approvedBudget <= 0) return 0;
    return (totalPlannedExpenses / approvedBudget) * 100;
  }, [totalPlannedExpenses, approvedBudget]);

  const varianceInr = useMemo(() => {
    return approvedBudget - totalPlannedExpenses;
  }, [approvedBudget, totalPlannedExpenses]);

  // Synchronized member and guest ticket calculations
  const memberSeats = Math.round(targetCapacity * (memberRatio / 100));
  const guestSeats = targetCapacity - memberSeats;

  // Run simulation backend calculation
  const triggerSimulation = async () => {
    if (!selectedEventId) return;
    try {
      setSimLoading(true);
      const payload = {
        event_id: selectedEventId,
        target_capacity: Number(targetCapacity),
        member_price_paise: Number(memberPriceInr) * 100,
        non_member_price_paise: Number(nonMemberPriceInr) * 100,
        expected_attendance_rate: Number(attendanceRate) / 100,
        member_ratio: Number(memberRatio) / 100,
        estimated_expenses_paise: Number(totalPlannedExpenses) * 100,
        reserve_threshold_paise: 500000
      };
      const res = await api.post('/api/simulator/simulate', payload);
      setSimResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    triggerSimulation();
  }, [
    selectedEventId,
    totalPlannedExpenses,
    targetCapacity,
    memberPriceInr,
    nonMemberPriceInr,
    attendanceRate,
    memberRatio
  ]);

  // Category item handlers
  const handleUpdateCategoryAmount = (id, newAmount) => {
    const val = Math.max(0, parseInt(newAmount, 10) || 0);
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, amount: val } : c))
    );
  };

  const handleUpdateCategoryName = (id, newName) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const handleDeleteCategory = (id) => {
    if (categories.length <= 1) {
      alert('You must have at least one expense category.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const amountVal = Math.max(0, parseInt(newCatAmount, 10) || 0);
    const colorIndex = categories.length % EXTRA_COLORS.length;
    const newCat = {
      id: `cat_custom_${Date.now()}`,
      name: newCatName.trim(),
      amount: amountVal,
      color: EXTRA_COLORS[colorIndex]
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatName('');
    setNewCatAmount('');
    setShowAddCategoryForm(false);
  };

  // Toggle event registration status (and automatically halts/resumes merchandise sales)
  const handleToggleRegistration = async () => {
    if (!selectedEventId) return;
    try {
      setTogglingReg(true);
      const res = await api.post(`/api/events/${selectedEventId}/toggle-registration`);
      if (res && res.success) {
        await fetchEventIntake(selectedEventId);
        setIntakeSuccessMsg(res.message || 'Registration & merchandise state updated.');
        setTimeout(() => setIntakeSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error toggling registration:', err);
    } finally {
      setTogglingReg(false);
    }
  };

  // Add ticketing money & merchandise money into Expense Category Breakdown
  const handleAddIntakeToCategories = () => {
    if (!eventIntake) return;
    const ticketInr = Math.round((eventIntake.ticketing_money_paise || 0) / 100);
    const merchInr = Math.round((eventIntake.merchandise_money_paise || 0) / 100);

    setCategories((prev) => {
      let next = [...prev];

      const ticketIdx = next.findIndex(
        (c) => c.id === 'cat_ticket_inflow' || c.name.toLowerCase().includes('ticketing')
      );
      if (ticketIdx >= 0) {
        next[ticketIdx] = {
          ...next[ticketIdx],
          amount: ticketInr,
          name: 'Ticketing Revenue (Funded)',
          color: '#10B981',
          isInflow: true
        };
      } else {
        next.unshift({
          id: 'cat_ticket_inflow',
          name: 'Ticketing Revenue (Funded)',
          amount: ticketInr,
          color: '#10B981',
          isInflow: true
        });
      }

      const merchIdx = next.findIndex(
        (c) => c.id === 'cat_merch_inflow' || c.name.toLowerCase().includes('merchandise')
      );
      if (merchIdx >= 0) {
        next[merchIdx] = {
          ...next[merchIdx],
          amount: merchInr,
          name: 'Merchandise Revenue (Funded)',
          color: '#8B5CF6',
          isInflow: true
        };
      } else {
        next.unshift({
          id: 'cat_merch_inflow',
          name: 'Merchandise Revenue (Funded)',
          amount: merchInr,
          color: '#8B5CF6',
          isInflow: true
        });
      }

      return next;
    });

    setIntakeSuccessMsg(`Successfully added ₹${ticketInr.toLocaleString('en-IN')} Ticketing & ₹${merchInr.toLocaleString('en-IN')} Merchandise to Expense Breakdown!`);
    setTimeout(() => setIntakeSuccessMsg(''), 4500);
  };

  // Set event budget ceiling to total realized intake (ticketing + merch)
  const handleSetCeilingToIntake = () => {
    if (!eventIntake) return;
    const totalInflowInr = Math.round(
      ((eventIntake.ticketing_money_paise || 0) + (eventIntake.merchandise_money_paise || 0)) / 100
    );
    if (totalInflowInr > 0) {
      setApprovedBudget(totalInflowInr);
      setIntakeSuccessMsg(`Budget ceiling updated to realized total of ₹${totalInflowInr.toLocaleString('en-IN')}!`);
      setTimeout(() => setIntakeSuccessMsg(''), 4500);
    }
  };

  // Submit request to organizer
  const handleSendRequest = async () => {
    if (!selectedEventId) return;
    setSubmittingRequest(true);
    try {
      const pct = customPct ? parseFloat(customPct) : budgetIncreasePct;
      const requestedBudgetInr = Math.round(approvedBudget * (1 + pct / 100));

      let message = '';
      if (requestType === 'budget') {
        message = `Requested +${pct}% budget ceiling increase (₹${approvedBudget.toLocaleString()} ➔ ₹${requestedBudgetInr.toLocaleString()}). ${requestNotes}`.trim();
      } else if (requestType === 'volunteers') {
        message = `Requested +${volunteerIncreaseCount} extra volunteer helpers for crowd & ticketing management. ${requestNotes}`.trim();
      } else {
        message = `Requested support for '${operationalCategory}': ${requestNotes}`.trim();
      }

      const payload = {
        event_id: selectedEventId,
        request_type: requestType,
        current_budget_paise: approvedBudget * 100,
        requested_budget_paise: requestType === 'budget' ? requestedBudgetInr * 100 : null,
        requested_volunteers: requestType === 'volunteers' ? volunteerIncreaseCount : null,
        operational_category: requestType === 'other' ? operationalCategory : null,
        percentage_increase: requestType === 'budget' ? pct : null,
        message: message,
        notes: requestNotes
      };

      await api.post('/api/simulator/request-budget-increase', payload);
      setRequestSuccessBanner(`Your request was successfully submitted to the Organizer for review.`);
      setRequestModalOpen(false);
      setRequestNotes('');
      fetchPendingRequests(selectedEventId);
    } catch (err) {
      alert(`Could not submit request: ${err.message}`);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Organizer: Approve or Decline request
  const handleResolveRequest = async (reqId, decision) => {
    try {
      const res = await api.patch(`/api/simulator/budget-requests/${reqId}/status?status=${decision}`);
      if (decision === 'approved') {
        const approvedReq = pendingRequests.find((r) => r.id === reqId);
        if (approvedReq && approvedReq.requested_budget_paise) {
          setApprovedBudget(Math.round(approvedReq.requested_budget_paise / 100));
        }
      }
      fetchPendingRequests(selectedEventId);
      // Refresh event
      const updatedEvents = await api.get('/api/events');
      setEvents(updatedEvents || []);
    } catch (err) {
      alert(`Failed to ${decision} request: ${err.message}`);
    }
  };

  // Export Event Budget to Excel spreadsheet (.xlsx)
  const exportBudgetToExcel = (eventData, budgetCeiling, plannedExpenses, catList, simData, intakeData) => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Overview & Summary Data
      const overviewRows = [
        ['CLUBPULSE EVENT BUDGET & TREASURY REPORT'],
        ['Generated At', new Date().toLocaleString('en-IN')],
        [''],
        ['EVENT DETAILS'],
        ['Event Title', eventData?.title || 'Selected Event'],
        ['Event ID', eventData?.id || selectedEventId],
        ['Event Date', eventData?.date || eventData?.event_date || 'N/A'],
        ['Venue', eventData?.venue || 'N/A'],
        ['Target Attendee Capacity', targetCapacity],
        ['Member Ticket Price (₹)', memberPriceInr],
        ['Non-Member Ticket Price (₹)', nonMemberPriceInr],
        [''],
        ['FINANCIAL CEILING & EXPENSES'],
        ['Approved Budget Ceiling (₹)', budgetCeiling],
        ['Total Planned Expenses (₹)', plannedExpenses],
        ['Remaining Variance / Free Buffer (₹)', budgetCeiling - plannedExpenses],
        ['Budget Utilization', `${budgetCeiling > 0 ? ((plannedExpenses / budgetCeiling) * 100).toFixed(1) : 0}%`],
        [''],
        ['REALIZED INFLOW (POST-REGISTRATION)'],
        ['Ticketing Money (₹)', Math.round((intakeData?.ticketing_money_paise || 0) / 100)],
        ['Merchandise Money (₹)', Math.round((intakeData?.merchandise_money_paise || 0) / 100)],
        ['Total Realized Funds (₹)', Math.round(((intakeData?.ticketing_money_paise || 0) + (intakeData?.merchandise_money_paise || 0)) / 100)],
        ['Registration & Merch Status', intakeData?.is_registration_closed ? 'Registration Ended • Merchandise Sales Halted' : 'Registration Active • Merchandise Sales Active']
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
      wsOverview['!cols'] = [{ wch: 36 }, { wch: 45 }];
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Budget Summary');

      // 2. Category Expense Breakdown
      const categoryRows = [
        ['Category ID', 'Category Name', 'Allocated Amount (₹)', '% of Planned Budget', 'Category Type'],
        ...catList.map((c) => {
          const share = plannedExpenses > 0 ? ((c.amount / plannedExpenses) * 100).toFixed(1) : '0.0';
          const isRealized = c.isInflow || c.id?.includes('inflow') || c.name?.toLowerCase().includes('ticketing') || c.name?.toLowerCase().includes('merchandise');
          return [
            c.id,
            c.name,
            Number(c.amount) || 0,
            `${share}%`,
            isRealized ? 'Realized Inflow (Funded Revenue)' : 'Allocated Expense Category'
          ];
        }),
        [''],
        ['TOTAL', 'Total Planned Allocation', plannedExpenses, '100.0%', '']
      ];
      const wsCategories = XLSX.utils.aoa_to_sheet(categoryRows);
      wsCategories['!cols'] = [{ wch: 22 }, { wch: 34 }, { wch: 24 }, { wch: 22 }, { wch: 34 }];
      XLSX.utils.book_append_sheet(wb, wsCategories, 'Expense Breakdown');

      // 3. Simulation & Revenue Projections
      if (simData) {
        const simRows = [
          ['SIMULATION & FEASIBILITY ANALYSIS'],
          ['Projected Attendance Yield', `${((simData.attendance_projection?.expected_attendance_rate || 0.85) * 100).toFixed(0)}%`],
          ['Expected Turnout (Attendees)', simData.attendance_projection?.expected_attendees || Math.round(targetCapacity * 0.85)],
          ['Projected Revenue (₹)', Math.round((simData.revenue_projection?.total_revenue_paise || 0) / 100)],
          ['Member Ticket Revenue (₹)', Math.round((simData.revenue_projection?.member_revenue_paise || 0) / 100)],
          ['Non-Member Ticket Revenue (₹)', Math.round((simData.revenue_projection?.non_member_revenue_paise || 0) / 100)],
          ['Estimated Expenses (₹)', Math.round((simData.expense_projection?.total_expenses_paise || 0) / 100)],
          ['Net Treasury Balance (₹)', Math.round((simData.net_balance_paise || 0) / 100)],
          ['Feasibility Status', simData.feasibility?.status || 'Feasible'],
          ['Breakeven Attendance (Attendees)', simData.feasibility?.breakeven_attendees || 'N/A'],
          ['Breakeven Attendance Rate', `${((simData.feasibility?.breakeven_attendance_rate || 0) * 100).toFixed(1)}%`]
        ];
        const wsSim = XLSX.utils.aoa_to_sheet(simRows);
        wsSim['!cols'] = [{ wch: 36 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsSim, 'Turnout & Feasibility');
      }

      // Generate filename and trigger download
      const safeTitle = (eventData?.title || 'Event_Budget').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${safeTitle}_Budget_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (exportErr) {
      console.error('Failed to export budget excel sheet:', exportErr);
    }
  };

  // Save to live event and download confirmed budget spreadsheet
  const handleSaveToLive = async () => {
    if (!selectedEventId) return;
    setSaveLoading(true);
    try {
      const payload = {
        event_id: selectedEventId,
        capacity: Number(targetCapacity),
        member_price_paise: Number(memberPriceInr) * 100,
        non_member_price_paise: Number(nonMemberPriceInr) * 100,
        estimated_budget_paise: Number(totalPlannedExpenses) * 100,
        expense_categories: categories
      };
      const res = await api.post('/api/simulator/apply', payload);
      setSaveNotification(res.message ? `${res.message} Confirmed budget Excel report downloaded!` : 'Parameters updated successfully! Excel report downloaded.');
      setConfirmSaveOpen(false);

      // Automatically download Excel sheet for the confirmed budget
      exportBudgetToExcel(
        currentEvent,
        approvedBudget,
        totalPlannedExpenses,
        categories,
        simResult,
        eventIntake
      );

      const data = await api.get('/api/events');
      setEvents(data || []);
    } catch (err) {
      alert(`Could not apply scenario: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Reset to original event baseline
  const handleReset = () => {
    const ev = events.find((e) => e.id === selectedEventId);
    if (ev) {
      applyEventBaseline(ev);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return categories.map((cat) => ({
      name: cat.name,
      amount: Number(cat.amount) || 0,
      color: cat.color || '#625BF6',
      pctOfCeiling: approvedBudget > 0 ? (((Number(cat.amount) || 0) / approvedBudget) * 100).toFixed(1) : 0
    }));
  }, [categories, approvedBudget]);

  // Selected event title
  const currentEvent = events.find((e) => e.id === selectedEventId);

  return (
    <DashboardLayout pageTitle="Event Budget & Expense Manager" breadcrumbs={[{ label: 'Treasury' }, { label: 'Live Simulator' }]}>
      <div className="text-[#171A2B] pb-12">
      {/* ------------------------------------------------------------------ */}
      {/* 1. STICKY TOP CONTROL HEADER                                       */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E7E9F1] px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#625BF6]/10 text-[#625BF6] border border-[#625BF6]/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#171A2B] tracking-tight">
                  Event Budget & Expense Manager
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Non-Mutating Sandbox
                </span>
              </div>
              <p className="text-xs text-[#687086]">
                Simulate category-wise expenses against approved limits • Stress-test ticket yields in real time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={() => exportBudgetToExcel(currentEvent, approvedBudget, totalPlannedExpenses, categories, simResult, eventIntake)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
              title="Download Excel spreadsheet of event budget"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleReset}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#687086] hover:text-[#171A2B] bg-[#F3F4F8] hover:bg-[#E7E9F1] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Original</span>
            </button>

            <button
              onClick={() => setConfirmSaveOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-[#625BF6] hover:bg-[#5048E5] shadow-xs shadow-[#625BF6]/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to Live Event</span>
            </button>
          </div>
        </div>
      </header>

      {/* Save Success Alert Notification */}
      {saveNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{saveNotification}</span>
              <Link
                to="/ledger"
                className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors"
              >
                <span>View in Treasury Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <button onClick={() => setSaveNotification('')} className="text-emerald-700 hover:text-emerald-900 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Request Sent Success Notification */}
      {requestSuccessBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-[#625BF6]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#625BF6] shrink-0" />
              <span>{requestSuccessBanner}</span>
            </div>
            <button onClick={() => setRequestSuccessBanner('')} className="text-indigo-700 hover:text-indigo-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MAIN 2-COLUMN LAYOUT (lg:grid-cols-12 items-start)                 */}
      {/* ------------------------------------------------------------------ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ================================================================ */}
          {/* LEFT COLUMN (lg:col-span-6): Settings & Category Expenses        */}
          {/* ================================================================ */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* 1. Target Event Selector */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-4.5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#687086] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#625BF6]" />
                  Select Target Event
                </label>
                {currentEvent && (
                  <span className="text-[11px] font-semibold text-[#687086] bg-[#F3F4F8] px-2 py-0.5 rounded-md">
                    {currentEvent.booked_count || 0} registered seats
                  </span>
                )}
              </div>

              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="w-full bg-[#F7F8FC] border border-[#E7E9F1] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#171A2B] focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]/30 focus:border-[#625BF6] transition-all"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}) - Base Budget: ₹{(ev.estimated_budget_paise / 100).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Event Budget & Expense Management Box */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-5">
              
              {/* Approved Budget (Ceiling Limit) & Smart Request Button */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-[#625BF6]" />
                      Approved Budget Ceiling
                    </span>
                    {isTreasurer ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Lock className="w-2.5 h-2.5" />
                        Locked by Organizer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-[#625BF6] border border-indigo-200">
                        Editable (Organizer)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => autoSplitCategories(approvedBudget)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg text-[#625BF6] bg-[#625BF6]/10 hover:bg-[#625BF6]/20 transition-colors"
                      title="Proportionally splits: Food 30%, Prizepool 25%, Infra 15%, Logistics 12%, Arts 7%, Gifting 6%, Misc 5%"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Auto-Split Categories
                    </button>

                    {isTreasurer && (
                      <button
                        type="button"
                        onClick={() => setRequestModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-[#625BF6] to-[#9061F9] hover:from-[#5048E5] hover:to-[#7E3AF2] shadow-xs shadow-[#625BF6]/20 transition-all"
                      >
                        <Sparkles className="w-3 h-3" />
                        Request Organizer
                      </button>
                    )}
                  </div>
                </div>

                {/* Ceiling Input Box */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#687086]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={approvedBudget}
                    onChange={(e) => {
                      if (!isTreasurer) {
                        setApprovedBudget(Math.max(0, parseInt(e.target.value, 10) || 0));
                      }
                    }}
                    readOnly={isTreasurer}
                    className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-base font-bold transition-all ${
                      isTreasurer
                        ? 'bg-[#F3F4F8] text-[#171A2B] border border-[#E7E9F1] cursor-not-allowed'
                        : 'bg-[#F7F8FC] text-[#171A2B] border border-[#E7E9F1] focus:ring-2 focus:ring-[#625BF6]/30 focus:border-[#625BF6]'
                    }`}
                  />
                  {isTreasurer && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#687086] flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#687086]" />
                      <span>Read-only</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Request Banner for Treasurer */}
              {isTreasurer && pendingRequests.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>Pending Request Under Review with Organizer</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    {pendingRequests[0].message}
                  </p>
                </div>
              )}

              {/* Pending Requests Review Box for Organizer */}
              {isOrganizer && pendingRequests.length > 0 && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#625BF6] flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Pending Treasurer Requests ({pendingRequests.length})
                    </span>
                    <span className="text-[10px] font-bold bg-[#625BF6] text-white px-2 py-0.5 rounded-full">
                      Action Required
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#171A2B]">
                          <span className="capitalize">{req.request_type} Request</span>
                          <span className="text-[10px] text-[#687086] font-normal">
                            from {req.requested_by_email}
                          </span>
                        </div>
                        <p className="text-xs text-[#687086]">{req.message}</p>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F3F4F8]">
                          <button
                            type="button"
                            onClick={() => handleResolveRequest(req.id, 'declined')}
                            className="px-2.5 py-1 text-xs font-bold text-[#687086] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveRequest(req.id, 'approved')}
                            className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Approve & Update Budget
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category-Wise Breakdown Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#625BF6]" />
                    Expense Category Breakdown
                  </span>
                  <span className="text-[11px] font-semibold text-[#687086]">
                    {categories.length} active categories
                  </span>
                </div>

                {/* Post-Registration Realized Inflow Panel */}
                {eventIntake && (
                  <div className="p-3.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#171A2B] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            Post-Registration Realized Inflow
                          </span>
                          {eventIntake.is_registration_closed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Registrations Ended • Merch Halted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              Registrations Active • Merch Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#687086] leading-relaxed">
                          {eventIntake.is_registration_closed
                            ? 'Registrations have ended and merchandise sales are stopped for this event. You can now add realized ticketing and merchandise money directly into the expense allocation.'
                            : 'Registrations and merchandise sales are currently active. Once registration ends, merchandise stops and realized revenue finalizes.'}
                        </p>
                      </div>

                      {/* Toggle Registration & Merch Button */}
                      <button
                        type="button"
                        onClick={handleToggleRegistration}
                        disabled={togglingReg}
                        className="shrink-0 px-2 py-1 text-[10px] font-bold rounded-lg border border-[#E7E9F1] hover:border-indigo-300 bg-white hover:bg-indigo-50 text-[#687086] hover:text-indigo-600 transition-colors shadow-2xs flex items-center gap-1"
                        title="Toggle registration period and merchandise sales"
                      >
                        <RefreshCw className={`w-3 h-3 ${togglingReg ? 'animate-spin' : ''}`} />
                        {eventIntake.is_registration_closed ? 'Re-open Registration' : 'Close Registration'}
                      </button>
                    </div>

                    {/* Metric Cards: Ticketing, Merch, Total */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-100/90 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#687086]">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <Ticket className="w-3 h-3 text-emerald-600" />
                            Ticketing Money
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Realized</span>
                        </div>
                        <div className="text-sm font-extrabold text-[#171A2B] mt-1 font-mono">
                          ₹{Math.round((eventIntake.ticketing_money_paise || 0) / 100).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-purple-100/90 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#687086]">
                          <span className="flex items-center gap-1 text-purple-700">
                            <ShoppingBag className="w-3 h-3 text-purple-600" />
                            Merchandise Money
                          </span>
                          <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">Realized</span>
                        </div>
                        <div className="text-sm font-extrabold text-[#171A2B] mt-1 font-mono">
                          ₹{Math.round((eventIntake.merchandise_money_paise || 0) / 100).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700">
                          <span className="flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-indigo-600" />
                            Total Realized
                          </span>
                          <span className="text-[9px] text-indigo-700 font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200">Combined</span>
                        </div>
                        <div className="text-sm font-extrabold text-indigo-950 mt-1 font-mono">
                          ₹{Math.round(((eventIntake.ticketing_money_paise || 0) + (eventIntake.merchandise_money_paise || 0)) / 100).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Quick Insertion & Ceiling Sync Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAddIntakeToCategories}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Ticketing & Merch to Breakdown
                      </button>

                      <button
                        type="button"
                        onClick={handleSetCeilingToIntake}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50/80 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Set Budget Ceiling to Combined (₹{Math.round(((eventIntake.ticketing_money_paise || 0) + (eventIntake.merchandise_money_paise || 0)) / 100).toLocaleString('en-IN')})
                      </button>
                    </div>

                    {intakeSuccessMsg && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{intakeSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* List of Dynamic Category Cards */}
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const CatIcon = getCategoryIcon(cat.name);
                    const catShare = totalPlannedExpenses > 0 ? ((cat.amount / totalPlannedExpenses) * 100).toFixed(1) : 0;
                    const isRealizedInflow = cat.isInflow || cat.id?.includes('inflow') || cat.name?.toLowerCase().includes('ticketing') || cat.name?.toLowerCase().includes('merchandise');
                    return (
                      <div
                        key={cat.id}
                        className={`group flex items-center gap-3 p-2.5 rounded-xl border ${
                          isRealizedInflow ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#E7E9F1] bg-white'
                        } hover:border-[#625BF6]/40 transition-all shadow-2xs`}
                      >
                        {/* Dot indicator and Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                        >
                          <CatIcon className="w-4 h-4" />
                        </div>

                        {/* Inline Editable Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={cat.name}
                              onChange={(e) => handleUpdateCategoryName(cat.id, e.target.value)}
                              className="w-full text-xs font-bold text-[#171A2B] bg-transparent border-b border-transparent hover:border-[#E7E9F1] focus:border-[#625BF6] focus:outline-hidden py-0.5 truncate"
                            />
                            {isRealizedInflow && (
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                                Realized Inflow
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#687086] mt-0.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{catShare}% of planned costs</span>
                          </div>
                        </div>

                        {/* Amount Input with Rupee symbol */}
                        <div className="flex items-center gap-1.5 w-32 shrink-0">
                          <span className="text-xs font-bold text-[#687086]">₹</span>
                          <input
                            type="number"
                            value={cat.amount}
                            onChange={(e) => handleUpdateCategoryAmount(cat.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs font-bold text-[#171A2B] bg-[#F7F8FC] border border-[#E7E9F1] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#625BF6] text-right font-mono"
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 text-[#687086] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                          title="Remove category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add Category Form Toggle */}
                {showAddCategoryForm ? (
                  <form onSubmit={handleAddCategory} className="p-3 bg-[#F7F8FC] border border-[#E7E9F1] rounded-xl space-y-2.5 animate-in fade-in duration-150">
                    <span className="text-xs font-bold text-[#171A2B]">Add Custom Expense Category</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Guest Speaker Travel"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E7E9F1] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#625BF6]"
                        autoFocus
                      />
                      <input
                        type="number"
                        placeholder="Amount in ₹"
                        value={newCatAmount}
                        onChange={(e) => setNewCatAmount(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E7E9F1] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#625BF6]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCategoryForm(false)}
                        className="px-2.5 py-1 text-xs font-medium text-[#687086] hover:bg-[#E7E9F1] rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs font-bold text-white bg-[#625BF6] hover:bg-[#5048E5] rounded-lg"
                      >
                        Add Category
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryForm(true)}
                    className="w-full py-2 border-2 border-dashed border-[#E7E9F1] hover:border-[#625BF6]/40 text-[#687086] hover:text-[#625BF6] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Expense Category</span>
                  </button>
                )}

                {/* Total Planned Expenses Summary Banner */}
                <div className="pt-3 border-t border-[#E7E9F1] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#687086]">
                    Total Planned Expenses
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#171A2B] font-mono">
                      ₹{totalPlannedExpenses.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#687086] block">
                      ({utilizationPct.toFixed(1)}% of ceiling)
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. Organizer Attendance & Member Seats (Collapsible Accordion) */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsAttendanceOpen(!isAttendanceOpen)}
                className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[#F7F8FC] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#625BF6]/10 text-[#625BF6]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#171A2B] uppercase tracking-wider">
                      Organizer Attendance & Member Seats Quotas
                    </h3>
                    <p className="text-[11px] text-[#687086]">
                      {isAttendanceOpen ? 'Collapse attendance yield parameters' : `Capacity: ${targetCapacity} • Turnout: ${attendanceRate}% • Member Ratio: ${memberRatio}%`}
                    </p>
                  </div>
                </div>
                {isAttendanceOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#687086]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#687086]" />
                )}
              </button>

              {isAttendanceOpen && (
                <div className="p-5 border-t border-[#E7E9F1] space-y-4 bg-[#FAFAFC] animate-in fade-in duration-200">
                  {/* Capacity Slider & Input */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-[#171A2B] flex items-center gap-1.5">
                        <span>Event Capacity Quota</span>
                        {!isOrganizer && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                            Organizer Locked
                          </span>
                        )}
                      </span>
                      <span className={`font-mono font-bold ${!isOrganizer ? 'text-[#687086]' : 'text-[#625BF6]'}`}>
                        {targetCapacity} attendees
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="1000"
                      step="10"
                      value={targetCapacity}
                      disabled={!isOrganizer}
                      onChange={(e) => {
                        if (isOrganizer) setTargetCapacity(parseInt(e.target.value, 10));
                      }}
                      className={`w-full h-1.5 rounded-lg ${
                        !isOrganizer
                          ? 'accent-slate-400 bg-[#E7E9F1] cursor-not-allowed opacity-60'
                          : 'accent-[#625BF6] bg-[#E7E9F1] cursor-pointer'
                      }`}
                    />
                    {!isOrganizer && (
                      <span className="text-[10px] text-[#687086] mt-0.5 block">
                        Venue capacity quota is determined by the event organizer.
                      </span>
                    )}
                  </div>

                  {/* Member Turnout Ratio Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-[#171A2B] flex items-center gap-1.5">
                        <span>Member Participation Ratio</span>
                        {!isOrganizer && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                            Organizer Locked
                          </span>
                        )}
                      </span>
                      <span className={`font-mono font-bold ${!isOrganizer ? 'text-[#687086]' : 'text-[#625BF6]'}`}>
                        {memberRatio}% Members
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={memberRatio}
                      disabled={!isOrganizer}
                      onChange={(e) => {
                        if (isOrganizer) setMemberRatio(parseInt(e.target.value, 10));
                      }}
                      className={`w-full h-1.5 rounded-lg ${
                        !isOrganizer
                          ? 'accent-slate-400 bg-[#E7E9F1] cursor-not-allowed opacity-60'
                          : 'accent-[#625BF6] bg-[#E7E9F1] cursor-pointer'
                      }`}
                    />
                    <div className="flex justify-between text-[10px] text-[#687086] mt-1 font-semibold">
                      <span>{memberSeats} Member Seats</span>
                      <span>{guestSeats} Guest Seats</span>
                    </div>
                  </div>

                  {/* Ticket Pricing (Member vs Non-Member) */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#687086]">
                          Member Price (₹)
                        </label>
                        {!isOrganizer && (
                          <span className="text-[9.5px] font-bold text-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={memberPriceInr}
                        readOnly={!isOrganizer}
                        disabled={!isOrganizer}
                        onChange={(e) => {
                          if (isOrganizer) setMemberPriceInr(Math.max(0, parseInt(e.target.value, 10) || 0));
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold ${
                          !isOrganizer
                            ? 'bg-[#F3F4F8] text-[#687086] border-[#E7E9F1] cursor-not-allowed'
                            : 'bg-white text-[#171A2B] border-[#E7E9F1] focus:ring-1 focus:ring-[#625BF6]'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-[#687086]">
                          Guest / Non-Member Price (₹)
                        </label>
                        {!isOrganizer && (
                          <span className="text-[9.5px] font-bold text-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={nonMemberPriceInr}
                        readOnly={!isOrganizer}
                        disabled={!isOrganizer}
                        onChange={(e) => {
                          if (isOrganizer) setNonMemberPriceInr(Math.max(0, parseInt(e.target.value, 10) || 0));
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold ${
                          !isOrganizer
                            ? 'bg-[#F3F4F8] text-[#687086] border-[#E7E9F1] cursor-not-allowed'
                            : 'bg-white text-[#171A2B] border-[#E7E9F1] focus:ring-1 focus:ring-[#625BF6]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expected Attendance Yield Slider (40% - 100%) - INTERACTIVE FOR TREASURER & ORGANIZER */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-2 mt-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-emerald-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Expected Attendance Yield</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Active Sandbox
                        </span>
                      </span>
                      <span className="font-mono text-emerald-800 font-extrabold text-sm">{attendanceRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={attendanceRate}
                      onChange={(e) => setAttendanceRate(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 h-2 bg-emerald-200/70 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                      <span>Forecast: <strong>{Math.round(targetCapacity * (attendanceRate / 100))} expected attendees</strong></span>
                      <span className="text-[10px] text-emerald-600 font-normal">Adjust slider to simulate yield</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN (lg:col-span-6): Dedicated Visualizations & KPIs     */}
          {/* ================================================================ */}
          <div className="lg:col-span-6 space-y-5 lg:sticky lg:top-20">
            
            {/* 1. Top KPI Summary Triad Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Approved Ceiling Card */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E7E9F1] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[#687086]">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Ceiling Limit</span>
                  <Wallet className="w-3.5 h-3.5 text-[#625BF6]" />
                </div>
                <div className="text-base font-extrabold text-[#171A2B] font-mono">
                  ₹{approvedBudget.toLocaleString('en-IN')}
                </div>
                <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                  Organizer Approved
                </span>
              </div>

              {/* Total Allocated Card */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E7E9F1] shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[#687086]">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Allocated Costs</span>
                  <Coins className="w-3.5 h-3.5 text-[#625BF6]" />
                </div>
                <div className="text-base font-extrabold text-[#171A2B] font-mono">
                  ₹{totalPlannedExpenses.toLocaleString('en-IN')}
                </div>
                <span
                  className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    utilizationPct <= 100
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {utilizationPct.toFixed(1)}% of Budget
                </span>
              </div>

              {/* Variance / Buffer Card */}
              <div
                className={`p-3.5 rounded-2xl border shadow-xs space-y-1 ${
                  varianceInr >= 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {varianceInr >= 0 ? 'Safe Buffer' : 'Shortfall'}
                  </span>
                  {varianceInr >= 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <div className="text-base font-extrabold font-mono">
                  {varianceInr >= 0
                    ? `+₹${varianceInr.toLocaleString('en-IN')}`
                    : `-₹${Math.abs(varianceInr).toLocaleString('en-IN')}`}
                </div>
                <span className="text-[10px] font-semibold block">
                  {varianceInr >= 0 ? 'Headroom Available' : 'Limit Exceeded'}
                </span>
              </div>
            </div>

            {/* 2. Category-Wise Expense Breakdown Bar Chart (Recharts) */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B]">
                    Category Allocation Breakdown
                  </h3>
                  <p className="text-[11px] text-[#687086]">
                    Real-time visual distribution against ₹{approvedBudget.toLocaleString('en-IN')} ceiling
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#625BF6] bg-[#625BF6]/10 px-2 py-0.5 rounded-md">
                  Recharts Visualizer
                </span>
              </div>

              {/* Chart Component */}
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E9F1" />
                    <XAxis
                      dataKey="name"
                      angle={-15}
                      textAnchor="end"
                      tick={{ fontSize: 10, fill: '#687086' }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#687086' }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#17182B] text-white p-2.5 rounded-xl shadow-lg border border-[#2B2E4E] text-xs">
                              <div className="font-bold">{data.name}</div>
                              <div className="font-mono text-[#847BFA] text-sm font-extrabold mt-0.5">
                                ₹{data.amount.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-[#A6ACBE] mt-0.5">
                                {data.pctOfCeiling}% of approved ceiling
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Itemized Category Progress Bars List (2-column grid of mini cards) */}
            <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B]">
                  Itemized Cost Per Attendee
                </h3>
                <span className="text-[11px] text-[#687086]">
                  Yield: {Math.round(targetCapacity * (attendanceRate / 100))} guests
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((cat) => {
                  const CatIcon = getCategoryIcon(cat.name);
                  const attendees = Math.max(1, Math.round(targetCapacity * (attendanceRate / 100)));
                  const costPerPerson = Math.round(cat.amount / attendees);
                  const pctOfLimit = approvedBudget > 0 ? ((cat.amount / approvedBudget) * 100).toFixed(1) : 0;

                  return (
                    <div
                      key={cat.id}
                      className="p-2.5 rounded-xl border border-[#E7E9F1] bg-[#FAFAFC] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CatIcon className="w-3.5 h-3.5 shrink-0" style={{ color: cat.color }} />
                          <span className="font-bold text-[#171A2B] truncate">{cat.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[#171A2B] shrink-0">
                          ₹{cat.amount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full h-1.5 bg-[#E7E9F1] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, pctOfLimit)}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#687086]">
                        <span>₹{costPerPerson} / person</span>
                        <span className="font-semibold">{pctOfLimit}% of limit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


          </div>

        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* SMART REQUEST CENTER MODAL (Treasurer -> Organizer)               */}
      {/* ------------------------------------------------------------------ */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#E7E9F1] max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F1]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#625BF6] to-[#9061F9] text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171A2B]">Smart Request Center</h3>
                  <span className="text-[10px] font-semibold text-[#687086]">Direct Treasury Dispatch to Organizer</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="p-1.5 text-[#687086] hover:text-[#171A2B] rounded-lg hover:bg-[#F3F4F8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Request Type Navigation Tabs */}
            <div className="flex rounded-xl bg-[#F3F4F8] p-1 gap-1">
              {[
                { id: 'budget', label: 'Budget Increase', icon: Wallet },
                { id: 'volunteers', label: 'Extra Volunteers', icon: Users },
                { id: 'other', label: 'Operational Support', icon: Building2 }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const active = requestType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRequestType(tab.id)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      active
                        ? 'bg-white text-[#625BF6] shadow-xs'
                        : 'text-[#687086] hover:text-[#171A2B]'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Budget Increase Panel */}
            {requestType === 'budget' && (
              <div className="space-y-4">
                <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E7E9F1] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[#687086] text-[10px] block font-sans">Current Ceiling</span>
                    <span className="font-bold text-[#171A2B]">₹{approvedBudget.toLocaleString('en-IN')}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#687086]" />
                  <div>
                    <span className="text-[#687086] text-[10px] block font-sans">Projected Ceiling</span>
                    <span className="font-bold text-[#625BF6]">
                      ₹{Math.round(approvedBudget * (1 + (customPct ? parseFloat(customPct) : budgetIncreasePct) / 100)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div>
                  <label className="text-xs font-bold text-[#171A2B] block mb-2">
                    Quick Preset Percentage Chips
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setBudgetIncreasePct(pct);
                          setCustomPct('');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          budgetIncreasePct === pct && !customPct
                            ? 'bg-[#625BF6] text-white border-[#625BF6]'
                            : 'bg-white text-[#687086] border-[#E7E9F1] hover:border-[#625BF6]'
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom % input */}
                <div>
                  <label className="text-[11px] font-semibold text-[#687086] block mb-1">
                    Or Enter Custom Percentage Increase (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 18"
                    value={customPct}
                    onChange={(e) => setCustomPct(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E9F1] focus:ring-1 focus:ring-[#625BF6] focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Volunteers Panel */}
            {requestType === 'volunteers' && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-[#171A2B] block">
                  Select Required Helpers Needed
                </label>
                <div className="flex flex-wrap gap-2">
                  {[2, 4, 6, 8, 10].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setVolunteerIncreaseCount(count)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                        volunteerIncreaseCount === count
                          ? 'bg-[#625BF6] text-white border-[#625BF6]'
                          : 'bg-white text-[#687086] border-[#E7E9F1] hover:border-[#625BF6]'
                      }`}
                    >
                      +{count} Helpers
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#687086] block mb-1">
                    Exact Helper Count
                  </label>
                  <input
                    type="number"
                    value={volunteerIncreaseCount}
                    onChange={(e) => setVolunteerIncreaseCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E9F1] focus:ring-1 focus:ring-[#625BF6] focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Other Operational Needs Panel */}
            {requestType === 'other' && (
              <div className="space-y-4">
                <label className="text-xs font-bold text-[#171A2B] block">
                  Select Operational Focus
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Audio & Visual', 'Venue Extension', 'Vendor Approval', 'Security Clearance'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperationalCategory(op)}
                      className={`p-2.5 text-xs font-bold rounded-xl border text-left transition-all ${
                        operationalCategory === op
                          ? 'bg-[#625BF6]/10 text-[#625BF6] border-[#625BF6]'
                          : 'bg-white text-[#687086] border-[#E7E9F1] hover:border-[#625BF6]'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Clickable Prompt Chips & Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171A2B] block">
                Quick Prompt Drafts
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Expenses exceed ceiling limit',
                  'Need ticketing & crowd helpers',
                  'Setup & cleanup shortage',
                  'Higher attendance requires budget increase'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRequestNotes((prev) => (prev ? `${prev} - ${chip}` : chip))}
                    className="text-[10px] font-semibold px-2 py-1 bg-[#F3F4F8] hover:bg-[#E7E9F1] text-[#687086] rounded-md transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder="Type additional justification notes for the organizer..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#625BF6] resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E7E9F1]">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#687086] hover:bg-[#F3F4F8] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRequest}
                onClick={handleSendRequest}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#625BF6] to-[#9061F9] hover:from-[#5048E5] hover:to-[#7E3AF2] rounded-xl shadow-xs shadow-[#625BF6]/25 flex items-center gap-1.5 transition-all"
              >
                {submittingRequest ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Request to Organizer</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog for Apply to Live Event */}
      <ConfirmationDialog
        isOpen={confirmSaveOpen}
        title="Apply Changes to Live Event?"
        message={`This action will update the live MongoDB record for '${currentEvent?.title || 'event'}'. The estimated budget of ₹${totalPlannedExpenses.toLocaleString('en-IN')}, attendance capacity (${targetCapacity}), and categorized expense allocations will be published directly into the Treasury Ledger. An Excel spreadsheet (.xlsx) of this confirmed budget will be automatically downloaded.`}
        confirmText="Confirm & Save (Download Excel)"
        cancelText="Keep in Sandbox"
        loading={saveLoading}
        onConfirm={handleSaveToLive}
        onCancel={() => setConfirmSaveOpen(false)}
      />

      </div>
    </DashboardLayout>
  );
};

export default SimulatorPage;
