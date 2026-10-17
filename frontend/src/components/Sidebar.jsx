import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
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
  AlertOctagon,
  Megaphone
} from 'lucide-react';

export const Sidebar = () => {
  const { role, isMember, isVolunteer } = useAuth();
  const isOrganizer = ['organizer', 'admin'].includes(role);
  const isTreasurer = ['treasurer', 'admin'].includes(role);

  const studentLinks = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(!isOrganizer && !isTreasurer
      ? [
          { to: '/my-tickets', label: 'My Tickets & QR', icon: Ticket },
          { to: '/membership', label: 'Membership Status', icon: CreditCard },
          { to: '/merch', label: 'Merch Catalog', icon: ShoppingBag }
        ]
      : []),
    ...(!isTreasurer ? [{ to: '/my-tasks', label: 'Volunteer Tasks', icon: CheckSquare }] : []),
    ...(!isOrganizer && !isTreasurer && (isVolunteer)
      ? [{ to: '/expenses', label: 'Claim Reimbursement', icon: Receipt }]
      : [])
  ];

  const organizerLinks = [
    { to: '/organizer/overview', label: 'Command Hub', icon: LayoutDashboard },
    { to: '/organizer/events', label: 'Events & Capacity', icon: Calendar },
    { to: '/organizer/budgets', label: 'Event Budgets', icon: Receipt },
    { to: '/organizer/merch', label: 'Inventory & Sizes', icon: Box },
    { to: '/organizer/announcements', label: 'Bulletins', icon: Megaphone || CheckSquare }
  ];

  const executiveLinks = [
    { to: '/ledger', label: 'Treasury Ledger', icon: Receipt },
    { to: '/simulator', label: 'Live Simulator', icon: SlidersHorizontal },
    { to: '/event-analytics', label: 'Event Analytics', icon: BarChart3 }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Overview Section */}
        <div>
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Overview
          </div>
          <nav className="space-y-1">
            {studentLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Organizer Section */}
        {['organizer', 'admin'].includes(role) && (
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Organizer Operations
            </div>
            <nav className="space-y-1">
              {organizerLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? item.highlight === 'rose'
                            ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 font-semibold'
                          : item.highlight === 'rose'
                          ? 'text-rose-700 hover:bg-rose-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        {/* Treasurer / Executive Section */}
        {['treasurer', 'admin'].includes(role) && (
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Executive & Treasury
            </div>
            <nav className="space-y-1">
              {executiveLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? item.highlight === 'rose'
                            ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 font-semibold'
                          : item.highlight === 'rose'
                          ? 'text-rose-700 hover:bg-rose-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Status Card */}
      {!isOrganizer && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Membership Status</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isMember ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isMember ? 'Active' : 'Standard'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isMember
                ? 'Discounts unlocked on all events & merch.'
                : 'Join membership to unlock 50% discount perks.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
