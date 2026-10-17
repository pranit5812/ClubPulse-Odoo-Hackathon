import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  LayoutDashboard,
  Ticket,
  CreditCard,
  ShoppingBag,
  CheckSquare,
  Receipt,
  Users,
  Calendar,
  QrCode,
  Box,
  Kanban,
  ShieldAlert,
  SlidersHorizontal,
  FileSpreadsheet,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  UserCheck,
  Bell,
  Search,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Megaphone,
  Coins,
  ArrowLeft,
  Lock,
  Vote,
  Timer,
  Network
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { NotificationDropdown } from './NotificationDropdown';
import { MerchDrawer } from './MerchDrawer';
import { ProfileMenu } from './ProfileMenu';

export const AppShell = ({ children, pageTitle, breadcrumbs = [] }) => {
  const { user, role, logout, login, isMember, canVolunteer, isVolunteer, membershipRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [merchDrawerOpen, setMerchDrawerOpen] = useState(false);

  // 365-Day Annual Committee Election Countdown Timer
  const [electionTime, setElectionTime] = useState(() => {
    let target = localStorage.getItem('clubpulse_election_target');
    if (!target) {
      target = (Date.now() + 365 * 24 * 60 * 60 * 1000).toString();
      localStorage.setItem('clubpulse_election_target', target);
    }
    const diff = Math.max(0, parseInt(target, 10) - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
  });

  useEffect(() => {
    let target = localStorage.getItem('clubpulse_election_target');
    if (!target) {
      target = (Date.now() + 365 * 24 * 60 * 60 * 1000).toString();
      localStorage.setItem('clubpulse_election_target', target);
    }
    const targetTimestamp = parseInt(target, 10);

    const updateTimer = () => {
      const diff = Math.max(0, targetTimestamp - Date.now());
      setElectionTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = role === 'admin';
  const isOrganizer = ['organizer', 'admin'].includes(role);
  const isTreasurer = ['treasurer', 'admin'].includes(role);

  // Live count of pending volunteer applications for admin & organizer
  const [pendingVolunteerCount, setPendingVolunteerCount] = useState(0);

  useEffect(() => {
    if (isAdmin || isOrganizer) {
      api.get('/api/events/volunteer-applications')
        .then((apps) => {
          if (Array.isArray(apps)) {
            const pending = apps.filter((a) => a.status === 'pending').length;
            setPendingVolunteerCount(pending);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin, isOrganizer, location.pathname]);

  const memberNavItems = [
    ...(isOrganizer ? [{ to: '/organizer/overview', label: 'Command Hub', icon: LayoutDashboard }] : []),
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(!isOrganizer && !isTreasurer
      ? [
        { to: '/events', label: 'Explore Events', icon: Calendar },
        { to: '/my-tickets', label: 'My QR Passes', icon: Ticket },
        { to: '/membership', label: 'Membership Status', icon: CreditCard }
      ]
      : []),
    ...(!isTreasurer
      ? [
        {
          to: '/merch',
          label: 'Merch Catalog',
          icon: ShoppingBag
        }
      ]
      : []),
    ...((canVolunteer || isVolunteer) && !isOrganizer && !isTreasurer
      ? [
        { to: '/my-tasks', label: 'My Volunteer Tasks', icon: CheckSquare }
      ]
      : []),
    ...(!isOrganizer && !isTreasurer && isVolunteer
      ? [{ to: '/expenses', label: 'Reimbursements', icon: Receipt }]
      : [])
  ];

  const navItemClass = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${isActive
      ? 'bg-[#625BF6] text-white shadow-[0_2px_8px_rgba(98,91,246,0.3)]'
      : 'text-[#A6ACBE] hover:text-white hover:bg-[#23253E]'
    }`;

  const isItemActive = (to) => {
    if (!to) return false;
    if (to === '/organizer/events') {
      return location.pathname.startsWith('/organizer/events') && !location.pathname.startsWith('/organizer/events/new');
    }
    if (to === '/organizer/volunteers' || to === '/admin/volunteers') {
      return location.pathname === '/organizer/volunteers' || location.pathname === '/admin/volunteers';
    }
    if (to === '/organizer/tasks' || to === '/admin/tasks') {
      return location.pathname === '/organizer/tasks' || location.pathname === '/admin/tasks';
    }
    if (to === '/organizer/overview') {
      return location.pathname === '/organizer/overview';
    }
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'));
  };

  const renderNavSection = (title, items) => (
    <div className="space-y-1 mb-5">
      {!sidebarCollapsed && (
        <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#687086] mb-1.5">
          {title}
        </div>
      )}
      {items.map((item, idx) => {
        const Icon = item.icon;
        if (item.onClick) {
          return (
            <button
              key={item.label || idx}
              type="button"
              onClick={item.onClick}
              className={`w-full text-left ${navItemClass(false)} cursor-pointer`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {!sidebarCollapsed && item.badge && (
                <span className="ml-auto text-[10px] bg-[#625BF6]/20 text-[#D4D1FD] border border-[#625BF6]/40 px-1.5 py-0.2 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        }
        const active = isItemActive(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileDrawerOpen(false)}
            className={() => navItemClass(active)}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            {!sidebarCollapsed && item.badge && (
              <span className="ml-auto text-[10px] bg-[#D9485F] text-white px-1.5 py-0.2 rounded-full font-bold">
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex text-[#171A2B]">
      {/* ---------------------------------------------------- */}
      {/* Desktop Sidebar (Fixed Dark Navy #17182B)            */}
      {/* ---------------------------------------------------- */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-[#17182B] border-r border-[#24263F] z-30 transition-all duration-300 sticky top-0 h-screen ${sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
      >
        <div className="p-4 flex flex-col h-full overflow-hidden">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between pb-5 mb-4 border-b border-[#23253E]">
            <Link to={isOrganizer ? '/organizer/overview' : '/dashboard'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-bold shadow-md shadow-[#625BF6]/20 p-0.5 shrink-0 overflow-hidden">
                <img src="/logo.png" alt="Skyline" className="w-full h-full object-contain" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <div className="font-extrabold text-sm tracking-tight text-white leading-tight">
                    Skyline
                  </div>
                  <div className="text-[10px] font-semibold text-[#8B93A7] tracking-wider uppercase">
                    Operating System
                  </div>
                </div>
              )}
            </Link>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-[#687086] hover:text-white hover:bg-[#23253E] transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>


          {/* Navigation Items (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isAdmin ? (
              <>
                {renderNavSection('Administration', [
                  { to: '/organizer/overview', label: 'Command Hub', icon: LayoutDashboard },
                  { to: '/admin/users', label: 'User Governance', icon: Users }
                ])}

                {renderNavSection('Events & Volunteers', [
                  { to: '/organizer/events', label: 'Event Registrations', icon: Calendar },
                  { 
                    to: '/organizer/volunteers', 
                    label: 'Volunteer Registrations', 
                    icon: UserCheck,
                    badge: pendingVolunteerCount > 0 ? `${pendingVolunteerCount}` : undefined
                  },
                  { to: '/organizer/tasks', label: 'Volunteer Tasks & Creation', icon: Kanban }
                ])}

                {renderNavSection('Finance', [
                  { to: '/ledger', label: 'Treasury Ledger', icon: Receipt },
                  { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
                  { to: '/expenses', label: 'Volunteer Claims', icon: Receipt }
                ])}
              </>
            ) : (
              <>
                {/* Overview Domain */}
                {renderNavSection('Overview', memberNavItems)}

                {/* Organizer Workspaces */}
                {isOrganizer && (
                  <>
                    {renderNavSection('Manage', [
                      { to: '/organizer/events', label: 'Events & Tickets', icon: Calendar },
                      { 
                        to: '/organizer/volunteers', 
                        label: 'Volunteer Registrations', 
                        icon: UserCheck,
                        badge: pendingVolunteerCount > 0 ? `${pendingVolunteerCount}` : undefined
                      },
                      { to: '/organizer/tasks', label: 'Volunteer Tasks & Creation', icon: Kanban },
                      { to: '/organizer/budgets', label: 'Event Budgets', icon: Receipt },
                      { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
                      { to: '/organizer/merch', label: 'Merchandise', icon: Box },
                      { to: '/organizer/announcements', label: 'Announcements', icon: Megaphone }
                    ])}
                  </>
                )}

                {/* Executive & Treasury */}
                {isTreasurer &&
                  renderNavSection('Treasury & Intel', [
                    { to: '/ledger', label: 'Treasury Ledger', icon: Receipt },
                    { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
                    { to: '/event-analytics', label: 'Event Analytics', icon: BarChart3 }
                  ])}
              </>
            )}
          </div>

          {/* Annual Committee Election (Locked 365-Day Live Timer Section) */}
          <div className="pt-2 mb-2">
            {!sidebarCollapsed ? (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1D1F38] to-[#141527] border border-[#2B2E4E] shadow-sm select-none">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <span className="text-[11px] font-bold text-white tracking-tight truncate">
                      Annual Committee Election
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                    <Lock className="w-2 h-2" />
                    <span>Locked</span>
                  </span>
                </div>

                {/* Live Running Countdown Timer */}
                <div className="bg-[#0E0F1D] px-2 py-1.5 rounded-lg border border-[#252848] flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-white font-bold">{electionTime.days}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">d</span>
                    <span className="text-[#3E4268] font-sans">:</span>
                    <span className="text-amber-300 font-bold">{String(electionTime.hours).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">h</span>
                    <span className="text-[#3E4268] font-sans">:</span>
                    <span className="text-indigo-300 font-bold">{String(electionTime.minutes).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">m</span>
                    <span className="text-[#3E4268] font-sans">:</span>
                    <span className="text-[#847BFA] font-bold animate-pulse">{String(electionTime.seconds).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">s</span>
                  </div>
                  <span className="text-[9px] text-amber-400/90 font-sans font-semibold flex items-center gap-0.5">
                    <Timer className="w-2.5 h-2.5" />
                    <span>365d</span>
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="p-2 rounded-xl bg-[#1C1E36] border border-[#2B2E4E] flex flex-col items-center justify-center gap-1 cursor-default select-none"
                title={`Annual Committee Election: Locked (${electionTime.days}d ${electionTime.hours}h ${electionTime.minutes}m ${electionTime.seconds}s)`}
              >
                <div className="relative">
                  <Vote className="w-4 h-4 text-[#847BFA]" />
                  <Lock className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1" />
                </div>
                <span className="text-[9px] font-mono font-bold text-amber-300">
                  {electionTime.days}d
                </span>
              </div>
            )}
          </div>

          {/* Bottom Account Card */}
          <div className="pt-3 border-t border-[#23253E]">
            {!sidebarCollapsed ? (
              <div className="p-2.5 rounded-xl bg-[#1E2038] border border-[#2B2E4E] flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-lg bg-[#625BF6]/20 text-[#625BF6] border border-[#625BF6]/40 flex items-center justify-center font-bold text-xs shrink-0">
                    {user?.full_name?.[0] || 'U'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">
                      {user?.full_name || 'Member'}
                    </div>
                    <div className="text-[10px] text-[#8B93A7] capitalize flex items-center gap-1">
                      <span>{role}</span>
                      <span>•</span>
                      <span className={isOrganizer ? 'text-[#847BFA]' : isMember ? (isVolunteer ? 'text-[#847BFA]' : 'text-[#16856B]') : 'text-[#687086]'}>
                        {isOrganizer ? 'Staff Lead' : isMember ? (isVolunteer ? 'Volunteer Crew' : 'Participant') : 'Guest'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-1.5 text-[#8B93A7] hover:text-white rounded-lg hover:bg-[#2B2E4E] transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full py-2 flex justify-center text-[#8B93A7] hover:text-white hover:bg-[#23253E] rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* Mobile Drawer (Slide-out Overlay)                    */}
      {/* ---------------------------------------------------- */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#17182B]/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          ></div>
          <div className="relative w-72 max-w-[80vw] bg-[#17182B] h-full p-4 flex flex-col justify-between z-10 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#23253E]">
              <Link
                to={isOrganizer ? '/organizer/overview' : '/dashboard'}
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold p-0.5 overflow-hidden">
                  <img src="/logo.png" alt="Skyline" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-sm text-white">Skyline</span>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#8B93A7] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {isAdmin ? (
                <>
                  {renderNavSection('Administration', [
                    { to: '/organizer/overview', label: 'Command Hub', icon: LayoutDashboard },
                    { to: '/admin/users', label: 'User Governance', icon: Users }
                  ])}

                  {renderNavSection('Events & Volunteers', [
                    { to: '/organizer/events', label: 'Event Registrations', icon: Calendar },
                    { 
                      to: '/organizer/volunteers', 
                      label: 'Volunteer Registrations', 
                      icon: UserCheck,
                      badge: pendingVolunteerCount > 0 ? `${pendingVolunteerCount}` : undefined
                    },
                    { to: '/organizer/tasks', label: 'Volunteer Tasks & Creation', icon: Kanban }
                  ])}

                  {renderNavSection('Finance', [
                    { to: '/ledger', label: 'Treasury Ledger', icon: Receipt },
                    { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
                    { to: '/expenses', label: 'Volunteer Claims', icon: Receipt }
                  ])}
                </>
              ) : (
                <>
                  {/* Overview Domain */}
                  {renderNavSection('Overview', memberNavItems)}

                  {/* Organizer Workspaces */}
                  {isOrganizer && (
                    <>
                      {renderNavSection('Manage', [
                        { to: '/organizer/events', label: 'Events & Tickets', icon: Calendar },
                        { 
                          to: '/organizer/volunteers', 
                          label: 'Volunteer Registrations', 
                          icon: UserCheck,
                          badge: pendingVolunteerCount > 0 ? `${pendingVolunteerCount}` : undefined
                        },
                        { to: '/organizer/tasks', label: 'Volunteer Tasks & Creation', icon: Kanban },
                        { to: '/organizer/budgets', label: 'Event Budgets', icon: Receipt },
                        { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
                        { to: '/organizer/merch', label: 'Merchandise', icon: Box },
                        { to: '/organizer/announcements', label: 'Announcements', icon: Megaphone }
                      ])}
                    </>
                  )}

                  {/* Executive & Treasury */}
                  {isTreasurer &&
                    renderNavSection('Treasury & Intel', [
                      { to: '/ledger', label: 'Treasury Ledger', icon: Receipt },
                      { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
                      { to: '/event-analytics', label: 'Event Analytics', icon: BarChart3 }
                    ])}
                </>
              )}
            </div>

            {/* Annual Committee Election (Locked 365-Day Live Timer Section) */}
            <div className="pt-2 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1D1F38] to-[#141527] border border-[#2B2E4E] shadow-sm select-none">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <span className="text-[11px] font-bold text-white tracking-tight truncate">
                      Annual Committee Election
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                    <Lock className="w-2 h-2" />
                    <span>Locked</span>
                  </span>
                </div>

                {/* Live Running Countdown Timer */}
                <div className="bg-[#0E0F1D] px-2 py-1.5 rounded-lg border border-[#252848] flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-white font-bold">{electionTime.days}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">d</span>
                    <span className="text-[#3E4268] font-sans">:</span>
                    <span className="text-amber-300 font-bold">{String(electionTime.hours).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">h</span>
                    <span className="text-[#3E4268] font-sans">:</span>
                    <span className="text-indigo-300 font-bold">{String(electionTime.minutes).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">m</span>
                    <span className="text-[#3E4268] font-sans">:</span>
                    <span className="text-[#847BFA] font-bold animate-pulse">{String(electionTime.seconds).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#71788E] uppercase font-sans">s</span>
                  </div>
                  <span className="text-[9px] text-amber-400/90 font-sans font-semibold flex items-center gap-0.5">
                    <Timer className="w-2.5 h-2.5" />
                    <span>365d</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#23253E] flex items-center justify-between">
              <span className="text-xs text-[#8B93A7]">{user?.full_name}</span>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-xs text-[#D9485F] font-bold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Main Content Area                                    */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E7E9F1] h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 text-[#687086] hover:text-[#171A2B] rounded-lg hover:bg-[#F3F4F8]"
            >
              <Menu className="w-5 h-5" />
            </button>


            {/* Breadcrumb or Title */}
            <div>
              {breadcrumbs.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-[#687086]">
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#A6ACBE]" />}
                      {bc.link ? (
                        <Link to={bc.link} className="hover:text-[#625BF6] transition-colors">
                          {bc.label}
                        </Link>
                      ) : (
                        <span className="font-semibold text-[#171A2B]">{bc.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <h1 className="text-base sm:text-lg font-bold text-[#171A2B] tracking-tight">
                  {pageTitle || 'Dashboard'}
                </h1>
              )}
            </div>
          </div>

          {/* Right Header: Notifications, Demo Persona Switcher & Profile */}
          <div className="flex items-center gap-3">
            {/* Operational Notifications */}
            <NotificationDropdown />

            {/* Profile Dropdown Menu */}
            <div className="pl-1 border-l border-[#E7E9F1]">
              <ProfileMenu />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Right Side Slide-Over Merch Catalog Drawer */}
      <MerchDrawer
        isOpen={merchDrawerOpen}
        onClose={() => setMerchDrawerOpen(false)}
      />
    </div>
  );
};

export default AppShell;
