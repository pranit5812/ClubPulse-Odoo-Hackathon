import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import {
  User,
  Edit3,
  KeyRound,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Users,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export const ProfileMenu = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleNavigate = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isAdmin = role === 'admin';
  const roleName = (user.role || role || 'student').toUpperCase();

  const getRoleBadgeColor = (r) => {
    switch (r?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'organizer':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'treasurer':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button in Top Nav */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl border border-transparent hover:border-[#E7E9F1] hover:bg-[#F7F8FC] transition-all focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]/30 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User profile and account settings"
      >
        <UserAvatar user={user} size="sm" showRing={false} />
        <div className="hidden sm:flex flex-col text-left leading-tight">
          <span className="text-xs font-bold text-[#171A2B] truncate max-w-[120px]">
            {user.full_name || 'My Account'}
          </span>
          <span className="text-[10px] text-[#687086] capitalize">
            {user.role || 'Member'}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#687086] transition-transform duration-200 ${
            open ? 'rotate-180 text-[#625BF6]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white shadow-xl border border-[#E7E9F1] divide-y divide-[#F3F4F8] z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header Card */}
          <div className="p-4 bg-gradient-to-br from-[#F7F8FC] to-white">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="lg" showRing={true} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#171A2B] truncate">
                    {user.full_name}
                  </h3>
                </div>
                <p className="text-[11px] text-[#687086] truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider border ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {roleName}
                  </span>
                  {user.membership_status === 'active' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active Member
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#171A2B] hover:text-[#625BF6] hover:bg-[#F7F8FC] transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span>View Profile</span>
                <span className="block text-[10px] text-[#687086] font-normal">
                  Personal, role & membership overview
                </span>
              </div>
            </button>

            <button
              onClick={() => handleNavigate('/profile?tab=edit')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#171A2B] hover:text-[#625BF6] hover:bg-[#F7F8FC] transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span>Edit Profile</span>
                <span className="block text-[10px] text-[#687086] font-normal">
                  Update bio, phone, department & avatar
                </span>
              </div>
            </button>

            <button
              onClick={() => handleNavigate('/profile?tab=password')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#171A2B] hover:text-[#625BF6] hover:bg-[#F7F8FC] transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span>Change Password</span>
                <span className="block text-[10px] text-[#687086] font-normal">
                  Secure password update
                </span>
              </div>
            </button>

            <button
              onClick={() => handleNavigate('/profile?tab=settings')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#171A2B] hover:text-[#625BF6] hover:bg-[#F7F8FC] transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span>Account Settings</span>
                <span className="block text-[10px] text-[#687086] font-normal">
                  Notifications & privacy preferences
                </span>
              </div>
            </button>
          </div>

          {/* Admin Exclusive: User Management */}
          {isAdmin && (
            <div className="p-1.5 bg-purple-50/40">
              <button
                onClick={() => handleNavigate('/admin/users')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-purple-900 hover:bg-purple-100/60 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-200/80 text-purple-700 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span>User Management</span>
                    <span className="text-[9px] bg-purple-200 text-purple-800 px-1 rounded font-extrabold uppercase">
                      Admin
                    </span>
                  </div>
                  <span className="block text-[10px] text-purple-700 font-normal">
                    Manage roles, activation & records
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Sign Out Action */}
          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
